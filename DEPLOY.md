# Publishing & Operations Guide

Ahmed Alfateh — personal portfolio. Static site, **no CMS, no build step to babysit**,
hosted on **Vercel**. You write, you commit, it deploys.

---

## How the site is structured

| Path | What it is |
|------|-----------|
| `index.html` | Homepage (hero, about, projects preview, blog preview, contact) |
| `blog/index.html` | Writing index (featured + grid + Substack CTA) |
| `blog/<slug>.html` | **Generated** static article pages (do not edit by hand) |
| `projects/index.html` | Projects listing (rendered from `content/projects/*.md`) |
| `content/blog/*.md` | Article source — **this is what you edit** |
| `content/projects/*.md` | Project source |
| `site.config.json` | Single config: base URL, analytics IDs, Substack, socials |
| `tools/build.mjs` | The generator (turns markdown into static article pages) |
| `api/theme.js` | Vercel function that serves `/css/theme.css` from `content/settings/theme.json` |

---

## Publishing a new article (the whole process)

1. Create `content/blog/my-article-slug.md` with frontmatter:

   ```markdown
   ---
   title: My Article Title
   date: 2026-07-15
   categoryKey: product        # one of: product | thinking | process | fintech
   category: Product           # human label shown on the card
   readTime: 7
   excerpt: One or two sentences shown on the card and in social/SEO previews.
   emoji: ✍️
   gradient: "linear-gradient(135deg, #f0f4ff, #dde8ff)"
   featured: false             # true = show as the big featured card on /blog
   draft: false                # true = never rendered
   ---

   Your article body in Markdown. ## Headings, **bold**, *italic*,
   > blockquotes, - lists, [links](https://example.com), and `code` all work.
   ```

2. Generate the static pages, listings, and sitemap:

   ```bash
   node tools/build.mjs
   ```

   This writes `blog/my-article-slug.html`, refreshes the homepage + `/blog`
   listings, and updates `sitemap.xml`.

3. Commit and push:

   ```bash
   git add -A && git commit -m "Publish: My Article Title" && git push
   ```

   Vercel auto-deploys `main` to production in ~10 seconds.

> You can also just hand the article to Claude (in Markdown or plain text) and
> ask it to publish — steps 1–3 are exactly what it runs.

---

## Configuration (`site.config.json`)

One file drives the integrations. Fill a value and it turns on; leave it empty
and that feature stays off. **No rebuild needed** — these are read at runtime.

```json
{
  "baseUrl": "https://portfolio-three-zeta-9cw6dwpro4.vercel.app",
  "analytics": { "ga4": "", "clarity": "" },
  "substackUrl": "",
  "social": { "linkedin": "...", "twitter": "", "github": "", "substack": "" }
}
```

- **`baseUrl`** — used to bake canonical/OG URLs into generated pages. If you
  connect a custom domain, update this and re-run `node tools/build.mjs`.
- **`analytics.ga4`** — Google Analytics 4 Measurement ID (`G-XXXXXXX`).
- **`analytics.clarity`** — Microsoft Clarity project ID.
- **`substackUrl`** — your Substack URL; powers the "Subscribe on Substack" CTA
  (the newsletter section hides itself while this is empty).
- **`social.*`** — footer links; each hides itself while empty.

---

## Deploying

- **Production:** push to `main` → Vercel builds and deploys automatically.
- **Preview:** `vercel` (from the repo root) deploys the current working tree to
  a throwaway preview URL without touching production.
- The Vercel project is `portfolio` (org `ahmed-s-projects-398325f4`). The theme
  endpoint rewrite lives in `vercel.json`.

## Local preview

```bash
node server.js      # serves the site + /css/theme.css + live reload at localhost
```
