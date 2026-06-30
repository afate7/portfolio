# Ahmed Alfateh — Portfolio

Personal portfolio site for Ahmed Alfateh (Digital Product Lead) with a built-in,
no-build CMS. Pure static front-end (HTML / CSS / vanilla JS) plus a zero-dependency
Node admin server. Installable PWA with offline support.

## Run locally

No `npm install` needed — the server uses only Node.js built-ins.

```bash
npm start        # or: node server.js
```

Then open:

- Site:  http://localhost:3456
- Admin: http://localhost:3456/admin/

On first start the server creates `content/settings/admin.json` with default
credentials:

```
Username: admin
Password: admin1234
```

**Change the password before deploying anywhere public.** This file is
git-ignored so it is never committed.

## Project structure

| Path | Purpose |
|------|---------|
| `index.html`, `blog/`, `projects/` | Site pages |
| `css/main.css` | Styles (`css/theme.css` is generated from `content/settings/theme.json`) |
| `js/main.js` | Global UX (nav, reveal, PWA registration) |
| `js/cms.js` | Loads Markdown/JSON content into the pages |
| `content/blog/*.md`, `content/projects/*.md` | Content (front-matter + Markdown) |
| `content/settings/*.json` | Profile, about, navigation, theme |
| `server.js` | Local site + authenticated admin API (port 3456) |
| `api/theme.js` | Vercel serverless function mirroring the dynamic theme CSS |
| `admin/` | Decap CMS config (Netlify) |

## Deploy

The repo is ready for either host — both are pre-configured.

### Vercel (`vercel.json`)
1. Import the repo at [vercel.com](https://vercel.com/new).
2. Framework preset: **Other**. Build command: *(empty)*. Output dir: *(root)*.
3. Deploy. The dynamic `/css/theme.css` is served by `api/theme.js`.

### Netlify (`netlify.toml`)
Publish directory `.`, no build command. See [`DEPLOY.md`](./DEPLOY.md) for the
full Netlify + Decap CMS + custom-domain walkthrough.

## Editing content

Use `/admin` (after logging in) or edit the files directly:

- Blog posts: `content/blog/*.md`
- Projects: `content/projects/*.md`
- Profile / about / theme: `content/settings/*.json`
