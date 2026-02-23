# 🚀 Deploy Guide — Personal Portfolio

This guide gets your site live on Netlify with a custom domain and CMS in about 15 minutes.

---

## What you'll have when done

- ✅ Live website at `yourname.com` (or `.dev`, `.io`, etc.)
- ✅ `/admin` panel to write blog posts and manage projects visually
- ✅ Auto-deploy every time you save content in the CMS
- ✅ Free SSL certificate (HTTPS)
- ✅ Offline-capable PWA
- ✅ Cost: ~$10–15/year (domain only — hosting is free)

---

## Step 1: Push to GitHub

You need a GitHub account. It's free.

1. Go to [github.com](https://github.com) → **New repository**
2. Name it `portfolio` (or anything you like)
3. Set it to **Public** (required for free Netlify CMS)
4. Click **Create repository**

Then in your terminal:

```bash
cd /Users/ahmadalfateh/Desktop/claude/portfolio

git init
git add .
git commit -m "Initial portfolio site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/portfolio.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## Step 2: Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) → Sign up free (use GitHub login)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** → select your `portfolio` repo
4. Build settings:
   - **Build command:** *(leave empty)*
   - **Publish directory:** `.`
5. Click **"Deploy site"**

Your site will be live in ~30 seconds at a random URL like `amazing-site-123.netlify.app`.

---

## Step 3: Enable Netlify Identity (for CMS login)

1. In Netlify dashboard → your site → **Site settings** → **Identity**
2. Click **"Enable Identity"**
3. Under **Registration**, set to **"Invite only"** (so only you can log in)
4. Scroll to **Services** → **Git Gateway** → click **"Enable Git Gateway"**

This lets the CMS commit directly to GitHub when you save.

---

## Step 4: Invite yourself to the CMS

1. In Netlify → **Identity** → **Invite users**
2. Enter your own email address
3. Check your email → click the invite link
4. Set your password

---

## Step 5: Add a custom domain

**Buy a domain** (if you don't have one):
- [namecheap.com](https://namecheap.com) ~$10/yr
- [porkbun.com](https://porkbun.com) ~$9/yr
- [cloudflare.com/registrar](https://cloudflare.com/registrar) ~$9/yr (at-cost pricing)

**Connect it to Netlify:**
1. Netlify → **Site settings** → **Domain management** → **Add custom domain**
2. Enter your domain (e.g. `alexmorgan.dev`)
3. Netlify will give you nameservers — go to your domain registrar and update the nameservers
4. Wait 5–30 minutes for DNS to propagate
5. Netlify auto-provisions a free SSL certificate

---

## Step 6: Update your CMS config with your domain

Open `admin/config.yml` and update this line:

```yaml
site_url: https://your-site.netlify.app   # ← change to your real domain
```

Commit and push:

```bash
git add admin/config.yml
git commit -m "Update site URL in CMS config"
git push
```

---

## Step 7: Access your CMS

Go to `https://yourdomain.com/admin`

Log in with the email/password you set in Step 4.

You'll see:
- **Blog Posts** — write, edit, publish posts with a rich text editor
- **Projects** — add/edit projects through a form
- **Site Settings** — update your name, bio, social links, availability status

Every time you save and publish in the CMS, it commits to GitHub and Netlify auto-deploys in ~30 seconds.

---

## Updating content without the CMS

You can also edit files directly:

- Blog posts: `content/blog/*.md`
- Projects: `content/projects/*.md`
- Profile: `content/settings/profile.json`
- About: `content/settings/about.json`

Commit and push → Netlify deploys automatically.

---

## Adding a new blog post manually

Create a file: `content/blog/my-post-title.md`

```markdown
---
title: My Post Title
date: 2025-03-01
category: Design
readTime: 5
excerpt: A short summary of this post.
emoji: ✍️
gradient: "linear-gradient(135deg, #f0f4ff, #dde8ff)"
featured: false
draft: false
---

Your post content here in Markdown.
```

---

## Cost breakdown

| Item | Cost |
|------|------|
| Netlify hosting | **Free** |
| SSL certificate | **Free** |
| Custom domain | ~$10–15/year |
| CMS (Decap) | **Free** |
| **Total** | **~$10–15/year** |

---

## Need help?

- Netlify docs: [docs.netlify.com](https://docs.netlify.com)
- Decap CMS docs: [decapcms.org/docs](https://decapcms.org/docs)
- Netlify Identity: [docs.netlify.com/security/secure-access-to-sites/identity](https://docs.netlify.com/security/secure-access-to-sites/identity/)
