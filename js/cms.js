/**
 * CMS Content Loader
 * Reads Markdown files from /content/ and renders them into the page.
 * Uses a lightweight frontmatter parser — no build step needed.
 */

'use strict';

// ============================================================
// FRONTMATTER PARSER
// Parses --- YAML --- blocks from Markdown strings
// ============================================================
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const yamlStr  = match[1];
  const content  = match[2].trim();
  const data     = {};

  // Simple YAML line parser (handles strings, booleans, numbers, arrays)
  let currentKey   = null;
  let currentArray = null;

  yamlStr.split('\n').forEach(line => {
    // Array item
    if (/^\s+-\s+/.test(line)) {
      const val = line.replace(/^\s+-\s+/, '').trim();
      if (currentArray !== null) {
        // Could be object or scalar
        if (val.includes(':')) {
          const [k, ...v] = val.split(':');
          if (!data[currentKey]) data[currentKey] = [];
          const last = data[currentKey][data[currentKey].length - 1];
          if (typeof last !== 'object') data[currentKey][data[currentKey].length - 1] = {};
          data[currentKey][data[currentKey].length - 1][k.trim()] = v.join(':').trim().replace(/^["']|["']$/g, '');
        } else {
          data[currentKey].push(val.replace(/^["']|["']$/g, ''));
        }
      }
      return;
    }

    // Key: value
    const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)?$/);
    if (kvMatch) {
      currentArray = null;
      currentKey   = kvMatch[1];
      let val      = (kvMatch[2] || '').trim();

      if (val === '' || val === null) {
        // Likely an array follows
        data[currentKey] = [];
        currentArray = [];
      } else if (val === 'true')  { data[currentKey] = true; }
      else if (val === 'false')   { data[currentKey] = false; }
      else if (/^\d+$/.test(val)) { data[currentKey] = parseInt(val, 10); }
      else { data[currentKey] = val.replace(/^["']|["']$/g, ''); }
    }
  });

  return { data, content };
}

// ============================================================
// MARKDOWN → HTML (minimal renderer)
// ============================================================
function markdownToHTML(md) {
  if (!md) return '';
  let html = md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="language-${lang}">${escapeHTML(code.trim())}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,         '<em>$1</em>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered list
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    // Horizontal rule
    .replace(/^---$/gm, '<hr />')
    // Paragraphs (wrap bare text blocks)
    .replace(/\n{2,}/g, '\n\n')
    .split('\n\n')
    .map(block => {
      block = block.trim();
      if (!block) return '';
      if (/^<(h[1-6]|ul|ol|li|blockquote|pre|hr|img)/.test(block)) return block;
      if (block.startsWith('<li>')) return `<ul>${block}</ul>`;
      return `<p>${block.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  return html;
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ============================================================
// FETCH CONTENT FILE
// ============================================================
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

// ============================================================
// LOAD SETTINGS (profile + about)
// ============================================================
async function loadSettings() {
  try {
    const [profileRes, aboutRes] = await Promise.all([
      fetch('/content/settings/profile.json'),
      fetch('/content/settings/about.json'),
    ]);

    const profile = profileRes.ok ? await profileRes.json() : null;
    const about   = aboutRes.ok  ? await aboutRes.json()   : null;

    if (profile) applyProfile(profile);
    if (about)   applyAbout(about);
  } catch (e) {
    console.warn('[CMS] Settings load failed:', e.message);
  }
}

function applyProfile(p) {
  // Name / logo
  document.querySelectorAll('.cms-name').forEach(el => el.textContent = p.name || el.textContent);
  // Hero headline
  const headline = document.querySelector('.cms-hero-headline');
  if (headline) headline.textContent = p.heroHeadline || headline.textContent;
  // Hero subtext
  const subtext = document.querySelector('.cms-hero-subtext');
  if (subtext) subtext.textContent = p.heroSubtext || subtext.textContent;
  // Availability badge
  const badge = document.querySelector('.cms-availability-label');
  if (badge) badge.textContent = p.availabilityLabel || badge.textContent;
  const dot = document.querySelector('.hero__badge-dot');
  if (dot) dot.style.background = p.available ? '#22c55e' : '#94a3b8';
  // Email link
  document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
    a.href = `mailto:${p.email}`;
    if (a.classList.contains('cms-email')) a.textContent = p.email;
  });
  // Social links
  if (p.twitter) document.querySelectorAll('a.cms-twitter').forEach(a => a.href = p.twitter);
  if (p.github)  document.querySelectorAll('a.cms-github').forEach(a  => a.href = p.github);
}

function applyAbout(a) {
  const heading = document.querySelector('.cms-about-heading');
  if (heading) heading.textContent = a.heading || heading.textContent;
  const paras = document.querySelectorAll('.cms-about-para');
  if (paras[0] && a.para1) paras[0].innerHTML = a.para1;
  if (paras[1] && a.para2) paras[1].innerHTML = a.para2;
  if (paras[2] && a.para3) paras[2].innerHTML = a.para3;

  // Stats
  const statValues = document.querySelectorAll('.cms-stat-value');
  const statLabels = document.querySelectorAll('.cms-stat-label');
  if (a.stats) {
    a.stats.forEach((stat, i) => {
      if (statValues[i]) statValues[i].textContent = stat.value;
      if (statLabels[i]) statLabels[i].textContent = stat.label;
    });
  }

  // Skills
  const skillsWrap = document.querySelector('.cms-skills');
  if (skillsWrap && a.skills) {
    skillsWrap.innerHTML = a.skills
      .map(s => `<span class="tag">${s}</span>`)
      .join('');
  }
}

// ============================================================
// LOAD BLOG INDEX (list of posts)
// ============================================================
const BLOG_POSTS = [
  '/content/blog/the-case-against-dark-patterns.md',
  '/content/blog/how-i-approach-every-new-project.md',
];

const PROJECTS = [
  '/content/projects/atlas.md',
];

async function loadBlogIndex(containerSelector, limit = 4) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const posts = [];
  await Promise.all(BLOG_POSTS.map(async (path, i) => {
    const raw = await fetchContent(path);
    if (!raw) return;
    const { data } = parseFrontmatter(raw);
    if (data.draft) return;
    // Derive slug from filename
    const slug = path.split('/').pop().replace('.md', '');
    posts.push({ ...data, slug, _index: i });
  }));

  // Sort by date desc
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Render
  container.innerHTML = posts.slice(0, limit).map((post, i) => `
    <a href="/blog/${post.slug}.html" class="blog-card reveal${i > 0 ? ` reveal-delay-${i}` : ''}">
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

// ============================================================
// LOAD SINGLE BLOG POST
// ============================================================
async function loadBlogPost(slug) {
  const path = `/content/blog/${slug}.md`;
  const raw  = await fetchContent(path);
  if (!raw) return;

  const { data, content } = parseFrontmatter(raw);
  const html = markdownToHTML(content);

  // Inject into page elements
  const titleEl = document.querySelector('.cms-post-title');
  if (titleEl) titleEl.textContent = data.title || titleEl.textContent;

  const dateEl = document.querySelector('.cms-post-date');
  if (dateEl) dateEl.textContent = formatDate(data.date);

  const timeEl = document.querySelector('.cms-post-readtime');
  if (timeEl) timeEl.textContent = `${data.readTime} min read`;

  const catEl = document.querySelector('.cms-post-category');
  if (catEl) catEl.textContent = data.category || '';

  const bodyEl = document.querySelector('.cms-post-body');
  if (bodyEl) bodyEl.innerHTML = html;

  const coverEl = document.querySelector('.cms-post-cover');
  if (coverEl) {
    coverEl.style.background = data.gradient || '';
    const emojiEl = coverEl.querySelector('.cms-post-emoji');
    if (emojiEl) emojiEl.textContent = data.emoji || '✍️';
  }

  // Update page title
  if (data.title) document.title = `${data.title} — Alex Morgan`;

  // Update meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && data.excerpt) metaDesc.setAttribute('content', data.excerpt);
}

// ============================================================
// LOAD PROJECTS INDEX
// ============================================================
async function loadProjectsIndex(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const projects = [];
  await Promise.all(PROJECTS.map(async (path) => {
    const raw = await fetchContent(path);
    if (!raw) return;
    const { data } = parseFrontmatter(raw);
    const slug = path.split('/').pop().replace('.md', '');
    projects.push({ ...data, slug });
  }));

  projects.sort((a, b) => (b.year || 0) - (a.year || 0));

  container.innerHTML = projects.map(p => `
    <article class="project-card${p.featured ? ' project-card--featured' : ''} reveal" data-category="${p.category}">
      <div class="project-card__image">
        <div class="project-card__image-inner" style="background:${p.gradient}; font-size: 3rem;">${p.emoji}</div>
      </div>
      <div class="project-card__body">
        <div class="project-card__meta">
          <span class="project-card__category">${p.categoryLabel}</span>
          <span class="project-card__year">${p.year}</span>
        </div>
        <h2 class="project-card__title">${p.title}</h2>
        <p class="project-card__desc">${p.description}</p>
        <div class="project-card__footer">
          <div class="project-card__tags">
            ${(p.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
          </div>
          <div class="project-card__links">
            ${p.liveUrl ? `<a href="${p.liveUrl}" class="project-card__link" aria-label="Live project" target="_blank" rel="noopener">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M2 8h12M9 3l5 5-5 5"/></svg>
            </a>` : ''}
            ${p.githubUrl ? `<a href="${p.githubUrl}" class="project-card__link" aria-label="GitHub" target="_blank" rel="noopener">
              <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            </a>` : ''}
          </div>
        </div>
      </div>
    </article>
  `).join('');
}

// ============================================================
// HELPERS
// ============================================================
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

// ============================================================
// AUTO-INIT based on page
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  const path = window.location.pathname;

  // Always try to load settings on every page
  await loadSettings();

  // Blog listing page
  if (path.includes('/blog/') && !path.includes('post') && document.querySelector('#cms-blog-grid')) {
    await loadBlogIndex('#cms-blog-grid', 12);
  }

  // Home page — blog preview
  if ((path === '/' || path.endsWith('index.html')) && document.querySelector('#cms-blog-preview')) {
    await loadBlogIndex('#cms-blog-preview', 4);
  }

  // Single post page — detect slug from URL or data attribute
  const postSlugEl = document.querySelector('[data-post-slug]');
  if (postSlugEl) {
    await loadBlogPost(postSlugEl.dataset.postSlug);
  }

  // Projects page
  if (path.includes('/projects/') && document.querySelector('#cms-projects-grid')) {
    await loadProjectsIndex('#cms-projects-grid');
  }
});

// Export for direct use
window.CMS = { loadBlogIndex, loadBlogPost, loadProjectsIndex, loadSettings, parseFrontmatter, markdownToHTML };
