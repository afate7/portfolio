/**
 * CMS Content Loader
 * Reads Markdown files from /content/ and renders them into the page.
 * Uses a lightweight frontmatter parser — no build step needed.
 */

'use strict';

const BLOG_POSTS = [
  'content/blog/economics-was-never-about-money.md',
  'content/blog/the-case-against-dark-patterns.md',
  'content/blog/how-i-approach-every-new-project.md',
];

const PROJECTS = [
  'content/projects/geotech-gis.md',
  'content/projects/aevapay.md',
  'content/projects/tameeni.md',
  'content/projects/driver-licensing.md',
  'content/projects/nagwa.md',
];

const BLOG_TAXONOMY = ['all', 'product', 'thinking', 'process', 'fintech'];
const PROJECT_TAXONOMY = ['all', 'fintech', 'govtech', 'edtech', 'insurtech'];

function normalizeBlogCategory(value = '') {
  const raw = String(value).toLowerCase();
  if (raw.includes('process')) return 'process';
  if (raw.includes('fintech')) return 'fintech';
  if (raw.includes('think') || raw.includes('econom')) return 'thinking';
  return 'product';
}

function rootRelative(path) {
  const depth = Math.max(0, window.location.pathname.split('/').filter(Boolean).length - 1);
  return `${'../'.repeat(depth)}${path.replace(/^\/+/, '')}`;
}

function pageLink(path) {
  const clean = path.replace(/^\/+/, '');
  const isNested = window.location.pathname.split('/').filter(Boolean).length > 1;
  return isNested ? `../${clean}` : clean;
}

// ============================================================
// FRONTMATTER PARSER
// ============================================================
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const yamlStr = match[1];
  const content = match[2].trim();
  const data = {};

  let currentKey = null;
  let inArray = false;

  yamlStr.split('\n').forEach((line) => {
    if (/^\s+-\s+/.test(line) && currentKey && inArray) {
      const item = line.replace(/^\s+-\s+/, '').trim().replace(/^['"]|['"]$/g, '');
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(item);
      return;
    }

    const kvMatch = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!kvMatch) return;

    currentKey = kvMatch[1];
    const val = (kvMatch[2] || '').trim();
    inArray = false;

    if (!val) {
      data[currentKey] = [];
      inArray = true;
      return;
    }

    if (val === 'true') data[currentKey] = true;
    else if (val === 'false') data[currentKey] = false;
    else if (/^\d+$/.test(val)) data[currentKey] = Number(val);
    else data[currentKey] = val.replace(/^['"]|['"]$/g, '');
  });

  return { data, content };
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
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/^---$/gm, '<hr />')
    .replace(/\n{2,}/g, '\n\n')
    .split('\n\n')
    .map((block) => {
      const clean = block.trim();
      if (!clean) return '';
      if (/^<(h[1-6]|ul|ol|li|blockquote|pre|hr|img)/.test(clean)) return clean;
      if (clean.startsWith('<li>')) return `<ul>${clean}</ul>`;
      return `<p>${clean.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function fetchContent(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${res.status} ${path}`);
    return await res.text();
  } catch (e) {
    console.warn('[CMS] Could not load:', path, e.message);
    return null;
  }
}

async function loadBlogPosts() {
  const posts = [];
  await Promise.all(BLOG_POSTS.map(async (path) => {
    const raw = await fetchContent(rootRelative(path));
    if (!raw) return;
    const { data, content } = parseFrontmatter(raw);
    if (data.draft) return;
    const slug = path.split('/').pop().replace('.md', '');
    posts.push({ ...data, content, slug, categoryKey: data.categoryKey || normalizeBlogCategory(data.category) });
  }));
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  return posts;
}

async function loadProjectItems() {
  const projects = [];
  await Promise.all(PROJECTS.map(async (path) => {
    const raw = await fetchContent(rootRelative(path));
    if (!raw) return;
    const { data } = parseFrontmatter(raw);
    const slug = path.split('/').pop().replace('.md', '');
    projects.push({ ...data, slug });
  }));
  projects.sort((a, b) => (b.year || 0) - (a.year || 0));
  return projects;
}

function renderHomeBlogPreview(posts) {
  const container = document.querySelector('#cms-blog-preview');
  if (!container) return;

  container.innerHTML = posts.slice(0, 4).map((post, i) => `
    <a href="${pageLink(`blog/post.html?slug=${post.slug}`)}" class="blog-card reveal${i > 0 ? ` reveal-delay-${Math.min(i, 3)}` : ''}">
      <span class="blog-card__number">0${i + 1}</span>
      <div class="blog-card__content">
        <h3 class="blog-card__title">${post.title}</h3>
        <div class="blog-card__meta">
          <span>${post.category}</span>
          <span class="blog-card__dot"></span>
          <span>${post.readTime} min read</span>
          <span class="blog-card__dot"></span>
          <span>${formatDate(post.date)}</span>
        </div>
      </div>
      <span class="blog-card__arrow" aria-hidden="true">→</span>
    </a>
  `).join('');
}

function renderBlogIndex(posts) {
  const featuredWrap = document.querySelector('#cms-featured-post');
  const grid = document.querySelector('#cms-blog-grid');
  if (!grid) return;

  const featured = posts.find((p) => p.featured) || posts[0];
  if (featuredWrap && featured) {
    featuredWrap.innerHTML = `
      <a href="${pageLink(`blog/post.html?slug=${featured.slug}`)}" style="display:block; text-decoration:none;">
        <article class="featured-post-card reveal">
          <div class="featured-post-card__media">
            <div class="cms-post-cover" style="background:${featured.gradient || 'var(--clr-accent-soft)'};">${featured.emoji || '✍️'}</div>
          </div>
          <div class="featured-post-card__content">
            <div style="display:flex;align-items:center;gap:var(--space-3);">
              <span class="blog-full-card__category">${featured.category}</span>
              <span class="featured-pill">Featured</span>
            </div>
            <h2 class="blog-full-card__title">${featured.title}</h2>
            <p class="blog-full-card__excerpt">${featured.excerpt || ''}</p>
            <div class="blog-full-card__footer"><span>${formatDateLong(featured.date)}</span><span>${featured.readTime} min read</span></div>
          </div>
        </article>
      </a>`;
  }

  grid.innerHTML = posts.map((post, i) => `
    <a href="${pageLink(`blog/post.html?slug=${post.slug}`)}" class="blog-full-card reveal${i % 3 ? ` reveal-delay-${Math.min(i % 3, 2)}` : ''}" data-category="${post.categoryKey}" style="text-decoration:none;">
      <div class="blog-full-card__image"><div class="cms-post-cover" style="background:${post.gradient || 'var(--clr-accent-soft)'};">${post.emoji || '✍️'}</div></div>
      <div class="blog-full-card__body">
        <span class="blog-full-card__category">${post.category}</span>
        <h3 class="blog-full-card__title">${post.title}</h3>
        <p class="blog-full-card__excerpt">${post.excerpt || ''}</p>
        <div class="blog-full-card__footer"><span>${formatDateLong(post.date)}</span><span>${post.readTime} min read</span></div>
      </div>
    </a>
  `).join('');
}

function initBlogFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn[data-filter]');
  const cards = document.querySelectorAll('#cms-blog-grid .blog-full-card[data-category]');
  if (!filterBtns.length || !cards.length) return;

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = BLOG_TAXONOMY.includes(btn.dataset.filter) ? btn.dataset.filter : 'all';

      cards.forEach((card) => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.hidden = !show;
      });
    });
  });
}

function renderProjectsIndex(items) {
  const grid = document.querySelector('#cms-projects-grid');
  if (!grid) return;

  grid.innerHTML = items.map((p, i) => `
    <article class="project-card ${p.featured ? 'project-card--featured' : ''} reveal${i % 3 ? ` reveal-delay-${Math.min(i % 3, 2)}` : ''}" data-category="${p.category}">
      <div class="project-card__image">
        <div class="project-card__image-inner cms-post-cover" style="background:${p.gradient};font-size:3rem;display:flex;align-items:center;justify-content:center;">${p.emoji || '🚀'}</div>
      </div>
      <div class="project-card__body">
        <div class="project-card__meta">
          <span class="project-card__category">${p.categoryLabel || p.category}</span>
          <span class="project-card__year">${p.year || ''}</span>
        </div>
        <h2 class="project-card__title">${p.title}</h2>
        <p class="project-card__desc">${p.description}</p>
        <p class="project-card__desc" style="font-size:var(--text-sm);color:var(--clr-text-muted);margin-top:var(--space-2);">Role: ${p.role || 'Product Lead'} · Team: ${p.teamSize || 'Cross-functional'}</p>
        <div class="project-card__footer">
          <div class="project-card__tags">${(p.tags || []).map((t) => `<span class="tag">${t}</span>`).join('')}</div>
        </div>
      </div>
    </article>
  `).join('');
}

function initProjectsFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn[data-filter]');
  const cards = document.querySelectorAll('#cms-projects-grid .project-card[data-category]');
  if (!filterBtns.length || !cards.length) return;

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = PROJECT_TAXONOMY.includes(btn.dataset.filter) ? btn.dataset.filter : 'all';
      cards.forEach((card) => {
        card.hidden = !(filter === 'all' || card.dataset.category === filter);
      });
    });
  });
}

async function loadBlogPost(slug) {
  const raw = await fetchContent(rootRelative(`content/blog/${slug}.md`));
  if (!raw) return;

  const { data, content } = parseFrontmatter(raw);
  const html = markdownToHTML(content);

  const titleEl = document.querySelector('.cms-post-title');
  const dateEl = document.querySelector('.cms-post-date');
  const timeEl = document.querySelector('.cms-post-readtime');
  const catEl = document.querySelector('.cms-post-category');
  const bodyEl = document.querySelector('.cms-post-body');
  const emojiEl = document.querySelector('.cms-post-emoji');

  if (titleEl) titleEl.innerHTML = (data.title || '').replace(' — ', ' —<br/>');
  if (dateEl) dateEl.textContent = formatDateLong(data.date);
  if (timeEl) timeEl.textContent = `${data.readTime} min read`;
  if (catEl) catEl.textContent = data.category || '';
  if (bodyEl) bodyEl.innerHTML = html;
  if (emojiEl) emojiEl.textContent = data.emoji || '✍️';

  document.title = `${data.title || 'Post'} — Ahmed Alfateh`;

  const desc = document.querySelector('meta[name="description"]');
  if (desc && data.excerpt) desc.setAttribute('content', data.excerpt);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogTitle) ogTitle.setAttribute('content', `${data.title} — Ahmed Alfateh`);
  if (ogDesc) ogDesc.setAttribute('content', data.excerpt || '');
  if (ogUrl) ogUrl.setAttribute('content', `${location.origin}/blog/post.html?slug=${slug}`);

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', `${location.origin}/blog/post.html?slug=${slug}`);

  const jsonLd = document.querySelector('#blogPostingSchema');
  if (jsonLd) {
    jsonLd.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: data.title,
      datePublished: data.date,
      author: { '@type': 'Person', name: 'Ahmed Alfateh' },
      description: data.excerpt || '',
      mainEntityOfPage: `${location.origin}/blog/post.html?slug=${slug}`,
    });
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatDateLong(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

document.addEventListener('DOMContentLoaded', async () => {
  const path = window.location.pathname;

  // Blog listings (home preview + /blog index) are pre-rendered as static HTML
  // by tools/build.mjs, so cms.js no longer renders them. It still wires the
  // category filter on the blog index, powers the legacy post.html fallback,
  // and renders the projects grid.
  if (path.includes('/blog/index')) {
    initBlogFilter();
  }

  if (path.includes('/projects/')) {
    const projects = await loadProjectItems();
    renderProjectsIndex(projects);
    initProjectsFilter();
  }

  if (path.includes('/blog/post.html')) {
    const slug = new URLSearchParams(window.location.search).get('slug') || 'the-case-against-dark-patterns';
    await loadBlogPost(slug);
  }
});

window.CMS = { parseFrontmatter, markdownToHTML };
