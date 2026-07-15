#!/usr/bin/env node
/**
 * tools/build.mjs · static blog generator (zero dependencies)
 *
 * Reads content/blog/*.md and site.config.json, then:
 *   1. Writes a fully static, SEO-complete page per article -> blog/<slug>.html
 *   2. Injects the homepage preview cards into index.html (between markers)
 *   3. Injects featured + grid cards into blog/index.html (between markers)
 *   4. Regenerates sitemap.xml
 *
 * There is NO deploy build step: run this locally when content changes,
 * then commit the generated files. You (Claude) are the publisher.
 *
 *   node tools/build.mjs
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));
const BASE = (cfg.baseUrl || '').replace(/\/+$/, '');
const AUTHOR = cfg.author || 'Ahmed Alfateh';
const OG_IMAGE = BASE + '/assets/og.png';

// ----------------------------------------------------------------------------
// Frontmatter + Markdown (kept in lockstep with js/cms.js so the fallback
// renderer at blog/post.html produces identical output).
// ----------------------------------------------------------------------------
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, content: raw };
  const data = {};
  let key = null, inArray = false;
  m[1].split('\n').forEach((line) => {
    if (/^\s+-\s+/.test(line) && key && inArray) {
      (data[key] = data[key] || []).push(line.replace(/^\s+-\s+/, '').trim().replace(/^['"]|['"]$/g, ''));
      return;
    }
    const kv = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!kv) return;
    key = kv[1]; inArray = false;
    const v = (kv[2] || '').trim();
    if (!v) { data[key] = []; inArray = true; return; }
    if (v === 'true') data[key] = true;
    else if (v === 'false') data[key] = false;
    else if (/^\d+$/.test(v)) data[key] = Number(v);
    else data[key] = v.replace(/^['"]|['"]$/g, '');
  });
  return { data, content: m[2].trim() };
}

function escapeHTML(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return escapeHTML(s).replace(/"/g, '&quot;');
}

function markdownToHTML(md) {
  if (!md) return '';
  return md
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="language-${lang}">${escapeHTML(code.trim())}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^---$/gm, '<hr />')
    .replace(/\n{2,}/g, '\n\n')
    .split('\n\n')
    .map((block) => {
      const clean = block.trim();
      if (!clean) return '';
      if (/^<(h[1-6]|ul|ol|li|blockquote|pre|hr|img)/.test(clean)) {
        return clean.startsWith('<li>') ? `<ul>${clean}</ul>` : clean;
      }
      return `<p>${clean.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');
}

function fmtLong(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Cover artwork: real brand logo when the entry has one, emoji otherwise
function coverInner(p) {
  return p.logo
    ? `<img class="brand-logo" src="${escapeAttr(p.logo)}" alt="${escapeAttr(p.title)} logo" loading="lazy" width="112" height="112" />`
    : (p.emoji || '\u{1F680}');
}

// ----------------------------------------------------------------------------
// Load posts
// ----------------------------------------------------------------------------
const posts = readdirSync(join(ROOT, 'content', 'blog'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const { data, content } = parseFrontmatter(readFileSync(join(ROOT, 'content', 'blog', f), 'utf8'));
    return { ...data, content, slug: f.replace(/\.md$/, '') };
  })
  .filter((p) => !p.draft)
  .sort((a, b) => new Date(b.date) - new Date(a.date));

// ----------------------------------------------------------------------------
// Load projects
// ----------------------------------------------------------------------------
const projects = readdirSync(join(ROOT, 'content', 'projects'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const { data, content } = parseFrontmatter(readFileSync(join(ROOT, 'content', 'projects', f), 'utf8'));
    return { ...data, content, slug: f.replace(/\.md$/, '') };
  })
  .filter((p) => !p.draft)
  .sort((a, b) => (b.year || 0) - (a.year || 0));

// ----------------------------------------------------------------------------
// Load books
// ----------------------------------------------------------------------------
const books = existsSync(join(ROOT, 'content', 'books'))
  ? readdirSync(join(ROOT, 'content', 'books'))
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const { data, content } = parseFrontmatter(readFileSync(join(ROOT, 'content', 'books', f), 'utf8'));
        return { ...data, content, slug: f.replace(/\.md$/, '') };
      })
      .filter((b) => !b.draft)
      .sort((a, b) => (a.order || 99) - (b.order || 99))
  : [];

// ----------------------------------------------------------------------------
// Article page template
// ----------------------------------------------------------------------------
function articlePage(p) {
  const url = `${BASE}/blog/${p.slug}.html`;
  const title = `${p.title} · ${AUTHOR}`;
  const desc = p.excerpt || `Writing by ${AUTHOR}.`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    datePublished: p.date,
    dateModified: p.date,
    author: { '@type': 'Person', name: AUTHOR },
    description: p.excerpt || '',
    mainEntityOfPage: url,
    image: OG_IMAGE,
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeAttr(desc)}" />
  <meta name="theme-color" content="#fafafa" />
  <meta name="author" content="${escapeAttr(AUTHOR)}" />

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeAttr(title)}" />
  <meta property="og:description" content="${escapeAttr(desc)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta property="article:published_time" content="${escapeAttr(p.date)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(title)}" />
  <meta name="twitter:description" content="${escapeAttr(desc)}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />

  <link rel="canonical" href="${url}" />
  <title>${escapeHTML(title)}</title>

  <link rel="icon" href="/assets/icons/icon.svg" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/assets/icons/icon.svg" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/main.css" />
  <link rel="stylesheet" href="/css/theme.css" />

  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script src="/js/site.js" defer></script>
  <script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
<div class="reading-progress" id="readingProgress" role="progressbar" aria-label="Reading progress" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
<div class="offline-banner" id="offlineBanner" aria-live="polite" role="status"><span class="offline-banner__dot"></span>You're offline · browsing cached content</div>

<nav class="nav scrolled" id="nav" aria-label="Main navigation">
  <div class="container">
    <div class="nav__inner">
      <a href="/index.html" class="nav__logo">ahmed<span>.</span></a>
      <ul class="nav__links" role="list">
        <li><a href="/index.html#about" class="nav__link">About</a></li>
        <li><a href="/projects/index.html" class="nav__link">Projects</a></li>
        <li><a href="/blog/index.html" class="nav__link active">Writing</a></li>\n        <li><a href="/books/index.html" class="nav__link">Books</a></li>
        <li><a href="/index.html#contact" class="nav__link">Contact</a></li>
      </ul>
      <a href="/index.html#contact" class="nav__cta">Let's Talk</a>
      <button class="nav__hamburger" id="hamburger" aria-label="Toggle menu" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </div>
</nav>

<div class="nav__mobile" id="mobileMenu" role="dialog" aria-modal="true" aria-label="Navigation menu">
  <ul role="list">
    <li><a href="/index.html#about" class="nav__link" data-mobile-link>About</a></li>
    <li><a href="/projects/index.html" class="nav__link" data-mobile-link>Projects</a></li>
    <li><a href="/blog/index.html" class="nav__link" data-mobile-link>Writing</a></li>\n    <li><a href="/books/index.html" class="nav__link" data-mobile-link>Books</a></li>
    <li><a href="/index.html#contact" class="nav__link" data-mobile-link>Contact</a></li>
  </ul>
</div>

<main>
  <header class="post-header" aria-label="Post header">
    <a href="/blog/index.html" class="post-category">← Back to Writing</a>
    <h1 class="post-title reveal">${escapeHTML(p.title)}</h1>
    <div class="post-meta reveal reveal-delay-1">
      <div class="post-author-avatar" aria-hidden="true">🧑‍💻</div>
      <div>
        <div style="font-weight: 500; color: var(--clr-text); font-size: var(--text-sm);">${escapeHTML(AUTHOR)}</div>
        <div style="font-size: var(--text-xs); color: var(--clr-text-muted);">${escapeHTML(fmtLong(p.date))}</div>
      </div>
      <span class="post-divider" aria-hidden="true"></span>
      <span>${escapeHTML(String(p.readTime || ''))} min read</span>
      <span class="post-divider" aria-hidden="true"></span>
      <span>${escapeHTML(p.category || '')}</span>
    </div>
  </header>

  <div style="max-width: var(--container-md); margin-inline: auto; padding-inline: var(--space-6); margin-bottom: var(--space-12);" class="reveal">
    <div class="cms-post-cover" style="aspect-ratio:16/7;border-radius:var(--radius-xl);border:1px solid var(--clr-border);display:flex;align-items:center;justify-content:center;font-size:5rem;background:${escapeAttr(p.gradient || 'var(--clr-accent-soft)')};">${p.emoji || '✍️'}</div>
  </div>

  <div class="post-content container">
    <article class="cms-post-body">${markdownToHTML(p.content)}</article>${timelineBlock(p)}${chaptersBlock(p)}
    <div style="margin-top: var(--space-16); padding-top: var(--space-8); border-top: 1px solid var(--clr-border); display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-6);" class="reveal">
      <a href="/blog/index.html" class="btn btn--outline" style="font-size: var(--text-sm);">← More posts</a>
      <a href="/index.html#contact" class="btn btn--primary" style="font-size: var(--text-sm);">Work with me</a>
    </div>
  </div>
</main>

<footer class="footer" role="contentinfo">
  <div class="container"><div class="footer__inner"><p class="footer__copy">© 2026 ${escapeHTML(AUTHOR)}. Built with care.</p></div></div>
</footer>

<script src="/js/main.js" defer></script>
<script>
  document.addEventListener('scroll', () => {
    const article = document.querySelector('.cms-post-body');
    if (!article) return;
    const height = article.offsetHeight || 1;
    const top = article.offsetTop;
    const progress = Math.min(100, Math.max(0, ((window.scrollY - top + 200) / height) * 100));
    const bar = document.getElementById('readingProgress');
    if (bar) { bar.style.width = progress + '%'; bar.setAttribute('aria-valuenow', String(Math.round(progress))); }
  }, { passive: true });
</script>
</body>
</html>
`;
}

// ----------------------------------------------------------------------------
// Case series: timeline + chapter blocks (flagship multi-article cases)
// Frontmatter:
//   timeline:  list of "label | title | text" rows (hub page)
//   chapters:  list of "slug | title | one-liner" rows (hub page)
//   series / seriesTitle:  set on chapter pages to link back to the hub
// ----------------------------------------------------------------------------
function timelineBlock(p) {
  if (!Array.isArray(p.timeline) || !p.timeline.length) return '';
  const items = p.timeline.map((row) => {
    const [label, title, text, slug] = String(row).split('|').map((x) => x.trim());
    const heading = slug
      ? `<a href="/projects/${escapeAttr(slug)}.html" class="case-tl__link">${escapeHTML(title || '')} →</a>`
      : escapeHTML(title || '');
    return `      <div class="case-tl__item reveal"><div class="case-tl__label">${escapeHTML(label || '')}</div><div class="case-tl__title">${heading}</div><p class="case-tl__text">${escapeHTML(text || '')}</p></div>`;
  }).join('\n');
  return `
    <section class="case-tl" aria-label="Project timeline">
      <h2>The timeline</h2>
${items}
    </section>`;
}

function chaptersBlock(p) {
  if (!Array.isArray(p.chapters) || !p.chapters.length) return '';
  const cards = p.chapters.map((row, i) => {
    const [slug, title, desc] = String(row).split('|').map((x) => x.trim());
    return `      <a class="case-chapter reveal" href="/projects/${escapeAttr(slug)}.html"><span class="case-chapter__num">0${i + 1}</span><span class="case-chapter__body"><span class="case-chapter__title">${escapeHTML(title || '')}</span><span class="case-chapter__desc">${escapeHTML(desc || '')}</span></span><span class="case-chapter__arrow" aria-hidden="true">→</span></a>`;
  }).join('\n');
  return `
    <section class="case-chapters" aria-label="Deep-dive chapters">
      <h2>Deep dives</h2>
${cards}
    </section>`;
}

// ----------------------------------------------------------------------------
// Case-study page template (projects/<slug>.html)
// ----------------------------------------------------------------------------
function projectPage(p, next) {
  const url = `${BASE}/projects/${p.slug}.html`;
  const title = `${p.title} · ${AUTHOR}`;
  const desc = p.description || `Product case study by ${AUTHOR}.`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: p.title,
    author: { '@type': 'Person', name: AUTHOR },
    description: p.description || '',
    dateCreated: String(p.year || ''),
    genre: p.categoryLabel || p.category || '',
    mainEntityOfPage: url,
    image: OG_IMAGE,
  };
  const highlights = (p.highlights || [])
    .map((h) => `<li>${escapeHTML(h)}</li>`)
    .join('');
  const tags = (p.tags || []).map((t) => `<span class="tag">${escapeHTML(t)}</span>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeAttr(desc)}" />
  <meta name="theme-color" content="#fafafa" />
  <meta name="author" content="${escapeAttr(AUTHOR)}" />

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeAttr(title)}" />
  <meta property="og:description" content="${escapeAttr(desc)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(title)}" />
  <meta name="twitter:description" content="${escapeAttr(desc)}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />

  <link rel="canonical" href="${url}" />
  <title>${escapeHTML(title)}</title>

  <link rel="icon" href="/assets/icons/icon.svg" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/assets/icons/icon.svg" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/main.css" />
  <link rel="stylesheet" href="/css/theme.css" />

  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script src="/js/site.js" defer></script>
  <script defer src="/_vercel/insights/script.js"></script>

  <style>
    .case-meta { display: flex; flex-wrap: wrap; gap: var(--space-6); margin-top: var(--space-6); }
    .case-meta__item { min-width: 140px; }
    .case-meta__label { font-size: var(--text-xs); letter-spacing: 0.08em; text-transform: uppercase; color: var(--clr-text-faint); font-weight: 600; }
    .case-meta__value { font-size: var(--text-sm); color: var(--clr-text); margin-top: var(--space-1); font-weight: 500; }
    .case-highlights { list-style: none; padding: 0; margin: var(--space-8) 0 0; display: flex; flex-wrap: wrap; gap: var(--space-3); }
    .case-highlights li { background: var(--clr-surface); border: 1px solid var(--clr-border); border-radius: var(--radius-full); padding: var(--space-2) var(--space-4); font-size: var(--text-sm); font-weight: 500; }
  </style>
</head>
<body>
<div class="offline-banner" id="offlineBanner" aria-live="polite" role="status"><span class="offline-banner__dot"></span>You're offline · browsing cached content</div>

<nav class="nav scrolled" id="nav" aria-label="Main navigation">
  <div class="container">
    <div class="nav__inner">
      <a href="/index.html" class="nav__logo">ahmed<span>.</span></a>
      <ul class="nav__links" role="list">
        <li><a href="/index.html#about" class="nav__link">About</a></li>
        <li><a href="/projects/index.html" class="nav__link active">Projects</a></li>
        <li><a href="/blog/index.html" class="nav__link">Writing</a></li>\n        <li><a href="/books/index.html" class="nav__link">Books</a></li>
        <li><a href="/cv/index.html" class="nav__link">CV</a></li>
        <li><a href="/index.html#contact" class="nav__link">Contact</a></li>
      </ul>
      <a href="/index.html#contact" class="nav__cta">Let's Talk</a>
      <button class="nav__hamburger" id="hamburger" aria-label="Toggle menu" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </div>
</nav>

<div class="nav__mobile" id="mobileMenu" role="dialog" aria-modal="true" aria-label="Navigation menu">
  <ul role="list">
    <li><a href="/index.html#about" class="nav__link" data-mobile-link>About</a></li>
    <li><a href="/projects/index.html" class="nav__link" data-mobile-link>Projects</a></li>
    <li><a href="/blog/index.html" class="nav__link" data-mobile-link>Writing</a></li>\n    <li><a href="/books/index.html" class="nav__link" data-mobile-link>Books</a></li>
    <li><a href="/cv/index.html" class="nav__link" data-mobile-link>CV</a></li>
    <li><a href="/index.html#contact" class="nav__link" data-mobile-link>Contact</a></li>
  </ul>
</div>

<main>
  <header class="post-header" aria-label="Case study header">
    <a href="${p.series ? `/projects/${escapeAttr(p.series)}.html` : '/projects/index.html'}" class="post-category">← ${p.series ? escapeHTML(p.seriesTitle || 'Back to the case') : 'Back to Projects'}</a>
    <h1 class="post-title reveal">${escapeHTML(p.title)}</h1>
    <div class="case-meta reveal reveal-delay-1">
      <div class="case-meta__item"><div class="case-meta__label">Category</div><div class="case-meta__value">${escapeHTML(p.categoryLabel || p.category || '')}</div></div>
      <div class="case-meta__item"><div class="case-meta__label">Year</div><div class="case-meta__value">${escapeHTML(String(p.year || ''))}</div></div>
      <div class="case-meta__item"><div class="case-meta__label">My role</div><div class="case-meta__value">${escapeHTML(p.role || '')}</div></div>
      <div class="case-meta__item"><div class="case-meta__label">Team</div><div class="case-meta__value">${escapeHTML(p.teamSize || '')}</div></div>
    </div>
    ${highlights ? `<ul class="case-highlights reveal reveal-delay-2">${highlights}</ul>` : ''}
  </header>

  <div style="max-width: var(--container-md); margin-inline: auto; padding-inline: var(--space-6); margin-bottom: var(--space-12);" class="reveal">
    <div class="cms-post-cover" style="aspect-ratio:16/7;border-radius:var(--radius-xl);border:1px solid var(--clr-border);display:flex;align-items:center;justify-content:center;font-size:5rem;background:${escapeAttr(p.gradient || 'var(--clr-accent-soft)')};">${coverInner(p)}</div>
  </div>

  <div class="post-content container">
    <article class="cms-post-body">${markdownToHTML(p.content)}</article>${timelineBlock(p)}${chaptersBlock(p)}
    ${tags ? `<div class="skills-tags" style="margin-top: var(--space-12);">${tags}</div>` : ''}
    <div style="margin-top: var(--space-16); padding-top: var(--space-8); border-top: 1px solid var(--clr-border); display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-6);" class="reveal">
      <a href="/projects/index.html" class="btn btn--outline" style="font-size: var(--text-sm);">← All projects</a>
      ${next ? `<a href="/projects/${next.slug}.html" class="btn btn--ghost" style="font-size: var(--text-sm);">Next: ${escapeHTML(next.title)} →</a>` : ''}
      <a href="/index.html#contact" class="btn btn--primary" style="font-size: var(--text-sm);">Work with me</a>
    </div>
  </div>
</main>

<footer class="footer" role="contentinfo">
  <div class="container"><div class="footer__inner"><p class="footer__copy">© 2026 ${escapeHTML(AUTHOR)}. Built with care.</p></div></div>
</footer>

<script src="/js/main.js" defer></script>
</body>
</html>
`;
}

// Project card fragment for the static projects grid
function projectCard(p, i) {
  const delay = i % 3 ? ` reveal-delay-${Math.min(i % 3, 2)}` : '';
  return `      <a href="/projects/${p.slug}.html" class="project-card ${p.featured ? 'project-card--featured ' : ''}reveal${delay}" data-category="${escapeAttr(p.category || '')}" style="text-decoration:none;color:inherit;">
        <div class="project-card__image"><div class="project-card__image-inner cms-post-cover" style="background:${escapeAttr(p.gradient || 'var(--clr-accent-soft)')};font-size:3rem;display:flex;align-items:center;justify-content:center;">${coverInner(p)}</div></div>
        <div class="project-card__body">
          <div class="project-card__meta"><span class="project-card__category">${escapeHTML(p.categoryLabel || p.category || '')}</span><span class="project-card__year">${escapeHTML(String(p.year || ''))}</span></div>
          <h2 class="project-card__title">${escapeHTML(p.title)}</h2>
          <p class="project-card__desc">${escapeHTML(p.description || '')}</p>
          <p class="project-card__desc" style="font-size:var(--text-sm);color:var(--clr-text-muted);margin-top:var(--space-2);">Role: ${escapeHTML(p.role || '')} · Team: ${escapeHTML(p.teamSize || 'Cross-functional')}</p>
          <div class="project-card__footer">
            <div class="project-card__tags">${(p.tags || []).slice(0, 3).map((t) => `<span class="tag">${escapeHTML(t)}</span>`).join('')}</div>
            <span class="project-card__link" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8h12M9 3l5 5-5 5"/></svg></span>
          </div>
        </div>
      </a>`;
}

// ----------------------------------------------------------------------------
// Listing card fragments
// ----------------------------------------------------------------------------
// URL for a post's card / sitemap entry. Custom articles are hand-authored
// HTML pages that supply their own href and are not generated from a template.
const postUrl = (p) => p.href || `/blog/${p.slug}.html`;

function previewCard(p, i) {
  const delay = i > 0 ? ` reveal-delay-${Math.min(i, 3)}` : '';
  return `      <a href="${postUrl(p)}" class="blog-card reveal${delay}">
        <span class="blog-card__number">0${i + 1}</span><div class="blog-card__content"><h3 class="blog-card__title">${escapeHTML(p.title)}</h3><div class="blog-card__meta"><span>${escapeHTML(p.category || '')}</span><span class="blog-card__dot"></span><span>${escapeHTML(String(p.readTime || ''))} min read</span></div></div><span class="blog-card__arrow" aria-hidden="true">→</span>
      </a>`;
}

function featuredCard(p) {
  return `    <a href="${postUrl(p)}" style="display:block; text-decoration:none;">
      <article class="featured-post-card reveal"><div class="featured-post-card__media"><div class="cms-post-cover" style="background:${escapeAttr(p.gradient || 'var(--clr-accent-soft)')};display:flex;align-items:center;justify-content:center;font-size:4rem;">${p.emoji || '✍️'}</div></div><div class="featured-post-card__content"><span class="featured-pill" style="align-self:flex-start;">Featured</span><h2 class="blog-full-card__title">${escapeHTML(p.title)}</h2><p class="blog-full-card__excerpt">${escapeHTML(p.excerpt || '')}</p><div class="blog-full-card__footer"><span>${escapeHTML(fmtLong(p.date))}</span><span>${escapeHTML(String(p.readTime || ''))} min read</span></div></div></article>
    </a>`;
}

function gridCard(p) {
  return `      <a href="${postUrl(p)}" class="blog-full-card" data-category="${escapeAttr(p.categoryKey || 'product')}"><div class="blog-full-card__image"><div class="cms-post-cover" style="background:${escapeAttr(p.gradient || 'var(--clr-accent-soft)')};display:flex;align-items:center;justify-content:center;font-size:3rem;">${p.emoji || '✍️'}</div></div><div class="blog-full-card__body"><span class="blog-full-card__category">${escapeHTML(p.category || '')}</span><h3 class="blog-full-card__title">${escapeHTML(p.title)}</h3><p class="blog-full-card__excerpt">${escapeHTML(p.excerpt || '')}</p><div class="blog-full-card__footer"><span>${escapeHTML(fmtLong(p.date))}</span><span>${escapeHTML(String(p.readTime || ''))} min read</span></div></div></a>`;
}

// ----------------------------------------------------------------------------
// Books: shared shell, card, page, index
// ----------------------------------------------------------------------------
function bookHead(title, desc, path) {
  const url = `${BASE}${path}`;
  return `<meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeAttr(desc)}" />
  <meta name="theme-color" content="#fafafa" />
  <meta name="author" content="${escapeAttr(AUTHOR)}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeAttr(title)}" />
  <meta property="og:description" content="${escapeAttr(desc)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href="${url}" />
  <title>${escapeHTML(title)}</title>
  <link rel="icon" href="/assets/icons/icon.svg" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/assets/icons/icon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/main.css" />
  <link rel="stylesheet" href="/css/theme.css" />
  <script src="/js/site.js" defer></script>
  <script defer src="/_vercel/insights/script.js"></script>`;
}

function bookNav() {
  return `<nav class="nav scrolled" id="nav" aria-label="Main navigation">
  <div class="container">
    <div class="nav__inner">
      <a href="/index.html" class="nav__logo">ahmed<span>.</span></a>
      <ul class="nav__links" role="list">
        <li><a href="/index.html#about" class="nav__link">About</a></li>
        <li><a href="/projects/index.html" class="nav__link">Projects</a></li>
        <li><a href="/blog/index.html" class="nav__link">Writing</a></li>
        <li><a href="/books/index.html" class="nav__link active">Books</a></li>
        <li><a href="/cv/index.html" class="nav__link">CV</a></li>
        <li><a href="/index.html#contact" class="nav__link">Contact</a></li>
      </ul>
      <a href="/index.html#contact" class="nav__cta">Let's Talk</a>
      <button class="nav__hamburger" id="hamburger" aria-label="Toggle menu" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </div>
</nav>
<div class="nav__mobile" id="mobileMenu" role="dialog" aria-modal="true" aria-label="Navigation menu">
  <ul role="list">
    <li><a href="/index.html#about" class="nav__link" data-mobile-link>About</a></li>
    <li><a href="/projects/index.html" class="nav__link" data-mobile-link>Projects</a></li>
    <li><a href="/blog/index.html" class="nav__link" data-mobile-link>Writing</a></li>
    <li><a href="/books/index.html" class="nav__link" data-mobile-link>Books</a></li>
    <li><a href="/cv/index.html" class="nav__link" data-mobile-link>CV</a></li>
    <li><a href="/index.html#contact" class="nav__link" data-mobile-link>Contact</a></li>
  </ul>
</div>`;
}

function bookCard(b, i) {
  const delay = i % 3 ? ` reveal-delay-${Math.min(i % 3, 2)}` : '';
  return `      <a href="/books/${b.slug}.html" class="blog-full-card reveal${delay}" style="text-decoration:none;">
        <div class="blog-full-card__image"><div class="cms-post-cover" style="background:${escapeAttr(b.gradient || 'var(--clr-accent-soft)')};display:flex;align-items:center;justify-content:center;font-size:3rem;">${b.emoji || '\u{1F4D6}'}</div></div>
        <div class="blog-full-card__body"><span class="blog-full-card__category">${escapeHTML(b.author || '')}</span><h2 class="blog-full-card__title">${escapeHTML(b.title)}</h2><p class="blog-full-card__excerpt">${escapeHTML(b.excerpt || '')}</p><div class="blog-full-card__footer"><span>${escapeHTML(b.category || '')}</span><span>My notes →</span></div></div>
      </a>`;
}

function booksIndexPage(items) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${bookHead(`Books · ${AUTHOR}`, `Books that shaped how ${AUTHOR} thinks and builds — with personal notes on each.`, '/books/index.html')}
</head>
<body>
<div class="offline-banner" id="offlineBanner" aria-live="polite" role="status"><span class="offline-banner__dot"></span>You're offline · browsing cached content</div>
${bookNav()}
<main>
  <header class="projects-page-header" aria-label="Books header">
    <div class="container">
      <p class="section-label reveal">Reading</p>
      <h1 class="section-title reveal reveal-delay-1" style="font-size: clamp(2.25rem, 5vw, 4rem);">Books that<br/>rewired me.</h1>
      <p class="section-desc reveal reveal-delay-2" style="margin-top: var(--space-4);">
        Mostly behavioral economics and psychology — the operating system behind
        every product decision I make. Each entry is my own notes, not a summary.
      </p>
    </div>
  </header>
  <section style="padding-bottom: var(--space-24);" aria-label="All books">
    <div class="container container--lg">
      <div class="blog-grid">
${items.map(bookCard).join('\n')}
      </div>
    </div>
  </section>
</main>
<footer class="footer" role="contentinfo">
  <div class="container"><div class="footer__inner"><p class="footer__copy">© 2026 ${escapeHTML(AUTHOR)}. Built with care.</p></div></div>
</footer>
<script src="/js/main.js" defer></script>
</body>
</html>
`;
}

function bookPage(b, next) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${bookHead(`${b.title} · My notes · ${AUTHOR}`, b.excerpt || `Reading notes by ${AUTHOR}.`, `/books/${b.slug}.html`)}
</head>
<body>
<div class="offline-banner" id="offlineBanner" aria-live="polite" role="status"><span class="offline-banner__dot"></span>You're offline · browsing cached content</div>
${bookNav()}
<main>
  <header class="post-header" aria-label="Book header">
    <a href="/books/index.html" class="post-category">← All books</a>
    <h1 class="post-title reveal">${escapeHTML(b.title)}</h1>
    <div class="post-meta reveal reveal-delay-1">
      <span style="font-weight:500;color:var(--clr-text);font-size:var(--text-sm);">${escapeHTML(b.author || '')}</span>
      <span class="post-divider" aria-hidden="true"></span>
      <span>${escapeHTML(b.category || '')}</span>
    </div>
  </header>
  <div style="max-width: var(--container-md); margin-inline: auto; padding-inline: var(--space-6); margin-bottom: var(--space-12);" class="reveal">
    <div class="cms-post-cover" style="aspect-ratio:16/7;border-radius:var(--radius-xl);border:1px solid var(--clr-border);display:flex;align-items:center;justify-content:center;font-size:5rem;background:${escapeAttr(b.gradient || 'var(--clr-accent-soft)')};">${b.emoji || '\u{1F4D6}'}</div>
  </div>
  <div class="post-content container">
    <article class="cms-post-body">${markdownToHTML(b.content)}</article>
    <div style="margin-top: var(--space-16); padding-top: var(--space-8); border-top: 1px solid var(--clr-border); display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-6);" class="reveal">
      <a href="/books/index.html" class="btn btn--outline" style="font-size: var(--text-sm);">← All books</a>
      ${next ? `<a href="/books/${next.slug}.html" class="btn btn--ghost" style="font-size: var(--text-sm);">Next: ${escapeHTML(next.title)} →</a>` : ''}
    </div>
  </div>
</main>
<footer class="footer" role="contentinfo">
  <div class="container"><div class="footer__inner"><p class="footer__copy">© 2026 ${escapeHTML(AUTHOR)}. Built with care.</p></div></div>
</footer>
<script src="/js/main.js" defer></script>
</body>
</html>
`;
}

// ----------------------------------------------------------------------------
// Marker injection
// ----------------------------------------------------------------------------
function inject(file, marker, html) {
  const path = join(ROOT, file);
  const src = readFileSync(path, 'utf8');
  const re = new RegExp(`(<!-- BUILD:${marker}:START -->)[\\s\\S]*?(<!-- BUILD:${marker}:END -->)`);
  if (!re.test(src)) { console.warn(`  ! marker ${marker} not found in ${file} · skipped`); return; }
  writeFileSync(path, src.replace(re, `$1\n${html}\n$2`));
  console.log(`  ✓ injected ${marker} into ${file}`);
}

// ----------------------------------------------------------------------------
// Build
// ----------------------------------------------------------------------------
console.log(`\n▸ Building ${posts.length} article(s) with base URL ${BASE}\n`);

for (const p of posts) {
  if (p.custom) { console.log(`  · blog/${p.slug} (custom page, listed but not generated)`); continue; }
  writeFileSync(join(ROOT, 'blog', `${p.slug}.html`), articlePage(p));
  console.log(`  ✓ blog/${p.slug}.html  "${p.title}"`);
}

const featured = posts.find((p) => p.featured) || posts[0];
const rest = posts.filter((p) => p.slug !== (featured && featured.slug));

inject('index.html', 'BLOG_PREVIEW', posts.slice(0, 4).map(previewCard).join('\n'));
if (featured) inject('blog/index.html', 'BLOG_FEATURED', featuredCard(featured));
inject('blog/index.html', 'BLOG_GRID', rest.map(gridCard).join('\n'));

// ----------------------------------------------------------------------------
// Project case-study pages + static grid
// ----------------------------------------------------------------------------
console.log(`\n▸ Building ${projects.length} case stud${projects.length === 1 ? 'y' : 'ies'}\n`);
for (const p of projects) {
  const siblings = projects.filter((x) => (x.series || null) === (p.series || null));
  const i = siblings.findIndex((x) => x.slug === p.slug);
  const next = siblings.length > 1 ? siblings[(i + 1) % siblings.length] : null;
  writeFileSync(join(ROOT, 'projects', `${p.slug}.html`), projectPage(p, next));
  console.log(`  ✓ projects/${p.slug}.html  "${p.title}"`);
}
inject('projects/index.html', 'PROJECTS_GRID', projects.filter((p) => !p.series).map(projectCard).join('\n'));

// ----------------------------------------------------------------------------
// Books pages
// ----------------------------------------------------------------------------
if (books.length) {
  mkdirSync(join(ROOT, 'books'), { recursive: true });
  for (let i = 0; i < books.length; i++) {
    const next = books.length > 1 ? books[(i + 1) % books.length] : null;
    writeFileSync(join(ROOT, 'books', `${books[i].slug}.html`), bookPage(books[i], next));
  }
  writeFileSync(join(ROOT, 'books', 'index.html'), booksIndexPage(books));
  console.log(`  ✓ books/ (${books.length} books + index)`);
}

// ----------------------------------------------------------------------------
// Sitemap
// ----------------------------------------------------------------------------
const staticUrls = ['/', '/projects/index.html', '/blog/index.html', '/books/index.html', '/cv/index.html', '/cover-letter/index.html'];
const urls = [
  ...staticUrls.map((u) => ({ loc: BASE + u, priority: u === '/' ? '1.0' : '0.7' })),
  ...projects.map((p) => ({ loc: `${BASE}/projects/${p.slug}.html`, priority: '0.7' })),
  ...posts.map((p) => ({ loc: BASE + postUrl(p), lastmod: p.date, priority: '0.6' })),
  ...books.map((b) => ({ loc: `${BASE}/books/${b.slug}.html`, priority: '0.5' })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(ROOT, 'sitemap.xml'), sitemap);
console.log(`  ✓ sitemap.xml (${urls.length} urls)`);

// ----------------------------------------------------------------------------
// Stamp the service worker cache version so every build busts stale caches
// for returning visitors (cache-first assets like js/cms.js otherwise persist).
// ----------------------------------------------------------------------------
const swPath = join(ROOT, 'sw.js');
const stamp = 'b' + Date.now().toString(36);
const swOut = readFileSync(swPath, 'utf8').replace(/const BUILD\s*=\s*'[^']*';/, `const BUILD         = '${stamp}';`);
writeFileSync(swPath, swOut);
console.log(`  ✓ sw.js cache version -> ${stamp}`);

// ----------------------------------------------------------------------------
// Cache-bust first-party css/js so new HTML never pairs with stale cached
// assets (the SW caches css/js cache-first; a version query forces a miss).
// ----------------------------------------------------------------------------
const htmlFiles = [
  'index.html', 'cv/index.html', 'cover-letter/index.html',
  ...readdirSync(join(ROOT, 'projects')).filter((f) => f.endsWith('.html')).map((f) => `projects/${f}`),
  ...readdirSync(join(ROOT, 'blog')).filter((f) => f.endsWith('.html')).map((f) => `blog/${f}`),
  ...(existsSync(join(ROOT, 'books')) ? readdirSync(join(ROOT, 'books')).filter((f) => f.endsWith('.html')).map((f) => `books/${f}`) : []),
];
const assetRe = /((?:\.\.\/|\/)?(?:css\/main\.css|js\/(?:main|cms|map|site)\.js))(?:\?v=[a-z0-9]+)?/g;
for (const f of htmlFiles) {
  const fp = join(ROOT, f);
  writeFileSync(fp, readFileSync(fp, 'utf8').replace(assetRe, `$1?v=${stamp}`));
}
console.log(`  ✓ cache-busted css/js urls (?v=${stamp}) across ${htmlFiles.length} pages`);

console.log('\n✅ Build complete.\n');
