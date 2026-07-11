# Deploy & Edit Guide — Ahmed Alfateh Portfolio

This is a **static site** (no build step) hosted on **Vercel**, connected to the
GitHub repo `afate7/portfolio`. There is no CMS — you edit content as files and push.

---

## How deploys happen

The Vercel project `portfolio` is linked to this GitHub repo:

- **Push to `main`** → Vercel builds a **Production** deployment automatically.
- **Open a PR / push any other branch** → Vercel builds a **Preview** deployment.

Production URL: <https://portfolio-three-zeta-9cw6dwpro4.vercel.app>

There is no build command — Vercel serves the repo root as static files, plus one
serverless function (`api/theme.js`) that generates `/css/theme.css` from
`content/settings/theme.json` (see `vercel.json` rewrite).

---

## Editing content

All content lives in `content/` as Markdown + JSON. Edit, commit, push — the site
redeploys in ~10s.

| What | Where |
|------|-------|
| Blog posts | `content/blog/*.md` |
| Projects / case studies | `content/projects/*.md` |
| Name, role, hero, email, socials | `content/settings/profile.json` |
| About section | `content/settings/about.json` |
| Nav links | `content/settings/navigation.json` |
| Page titles / descriptions / site URL | `content/settings/pages.json` |
| Theme (colors, fonts, radius) | `content/settings/theme.json` |

### Add a blog post

Create `content/blog/my-post.md`:

```markdown
---
title: My Post Title
date: 2026-01-01
category: Product
categoryKey: product
readTime: 5
excerpt: A short summary shown in the listing.
emoji: ✍️
gradient: "linear-gradient(135deg, #f0f4ff, #dde8ff)"
featured: false
draft: false
---

Your post content in Markdown.
```

Then register its path in the `BLOG_POSTS` array in `js/cms.js` if the loader
uses an explicit list.

---

## Local preview

```bash
node server.js      # serves the site with live-reload on file changes
```

`js/live-reload.js` only activates on `localhost` and no-ops in production.

> Note: `server.js` also starts a legacy local admin server that referenced the
> now-removed Decap/Netlify CMS. The public site server is unaffected; the admin
> portion is dead and can be trimmed from `server.js` when convenient.

---

## Custom domain (later)

`ahmedalfateh.com` currently hosts a separate WordPress site and is **not** attached
to this Vercel project. To move the portfolio there later:

1. `vercel domains add ahmedalfateh.com` (or add it in the Vercel dashboard).
2. Point DNS at Vercel (via Cloudflare, where the domain's DNS is managed).
3. Update the canonical/`og:url`/JSON-LD URLs and `content/settings/pages.json`
   `siteUrl` from the vercel.app URL to `https://ahmedalfateh.com`.
4. Regenerate `robots.txt` + `sitemap.xml` with the new host.
