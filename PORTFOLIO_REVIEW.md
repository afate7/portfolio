# Portfolio Website Review

## 1) Current component map

### Core pages
- **Home (`index.html`)**: Hero, trust logos, story/about, project preview cards, blog preview cards, contact section, footer.
- **Projects (`projects/index.html`)**: Intro header, category filters, project grid, CTA.
- **Blog index (`blog/index.html`)**: Header, category filters, featured article, article grid, newsletter block.
- **Blog post (`blog/post.html`)**: Reading progress bar, article layout, author card, related posts.

### Shared front-end behavior
- **`js/main.js`** controls global UX: sticky nav behavior, mobile menu, section-based active nav highlighting, reveal animations, smooth in-page scrolling, hero parallax, offline status banner, simple contact form validation, and service worker registration.
- **`js/cms.js`** introduces no-build CMS-style loading via Markdown + frontmatter parsing and can inject profile/about/blog/project content when matching placeholders exist.
- **`sw.js`** + `manifest.json` provide installability and offline behavior.

### Content model
- Blog and project content exists under `content/blog/*.md` and `content/projects/*.md`.
- Profile/about/navigation/theme settings exist under `content/settings/*.json`.
- Admin UI configured via Netlify CMS (`admin/config.yml`, `admin/index.html`).

---

## 2) What is strong already

- Strong personal positioning and voice (clear POV, executive credibility, measurable outcomes).
- Good visual hierarchy and modern UI patterns (hero, cards, section rhythm, strong typography).
- Good baseline UX enhancements: offline awareness, mobile nav, reveal animation, and PWA foundations.
- Content-first architecture is partially in place through Markdown + settings JSON, which is a strong base for a blog-led personal brand.

---

## 3) Key gaps (especially for blog + project focus)

1. **CMS/data layer is not fully wired into templates**
   - `cms.js` expects selectors like `#cms-blog-preview`, `#cms-blog-grid`, `#cms-projects-grid`, and classes like `.cms-post-title`, but many page templates are still hardcoded. This means content files exist but do not consistently drive the UI.

2. **Blog category taxonomy is inconsistent**
   - Blog filter buttons use categories like `thinking` and `fintech`, while several card `data-category` values are `design`, `life`, and `code`. This can make filters feel broken or incomplete.

3. **Single post routing is static**
   - Most links go to `blog/post.html`, but the CMS loader expects slug pages like `/blog/<slug>.html` or a `data-post-slug` attribute. Dynamic content scaling is limited.

4. **Contact + newsletter are UI-only**
   - Forms currently simulate behavior or point to `#` without production submission handling.

5. **Performance and consistency opportunities**
   - Extensive inline styles across pages increase maintenance cost and reduce theme consistency.
   - Many large Unsplash images load directly from third-party URLs; optimization strategy (responsive sizes, local optimization/CDN pipeline) is limited.

---

## 4) High-impact enhancements (prioritized)

## P0 — Make blog + projects truly content-driven

1. **Unify templates with CMS selectors**
   - Add/align required IDs/classes in HTML so `cms.js` actually renders blog/project cards and post content from Markdown.

2. **Standardize taxonomy**
   - Define a single allowed category set in one source (e.g., settings JSON) and enforce it in filters + frontmatter.

3. **Implement real post routing strategy**
   - Option A: Generate static post pages per slug.
   - Option B: Use one `post.html?slug=` pattern and load markdown by slug.
   - Ensure every blog card links to real slug-based content.

## P1 — Improve project storytelling for hiring/clients

4. **Adopt a consistent project case-study schema**
   - For each project: Context → Problem → Approach → Outcome → Metrics → Role.
   - Add “My role” and “Team size” fields to frontmatter.

5. **Add proof artifacts**
   - Screenshots, process snapshots, decision memos, KPI charts, or before/after metrics visuals.

## P1 — Conversion and trust

6. **Wire contact and newsletter to real backends**
   - Netlify Forms, serverless endpoint, or your preferred provider.
   - Add spam protection + success/error states.

7. **Strengthen social proof**
   - Add testimonials, logos with links, talks/podcasts, and notable publications.

## P2 — Technical and SEO hardening

8. **Structured data**
   - Add JSON-LD (`Person`, `BlogPosting`, `CreativeWork`) per page type.

9. **Open Graph/Twitter cards per post/project**
   - Ensure unique meta tags for each post/project to improve sharing quality.

10. **Accessibility pass**
   - Audit heading hierarchy, focus trapping in mobile menu dialog, keyboard close/open states, and contrast checks.

11. **Performance pass**
   - Replace repeated inline styles with reusable classes.
   - Add responsive image `srcset/sizes`, lazy-loading where suitable, and optional self-hosted optimized assets.

---

## 5) Suggested roadmap (3 short phases)

### Phase 1 (1–2 days)
- Align CMS selectors with templates.
- Fix blog/project category mismatch.
- Convert blog cards to real slug links.

### Phase 2 (2–4 days)
- Implement reliable post loading/routing.
- Convert project cards to data-driven case-study cards.
- Wire forms to production endpoints.

### Phase 3 (ongoing)
- Weekly blog cadence + monthly deep case study.
- Add SEO schema + social cards + performance polish.
- Add lightweight analytics funnel for blog → project → contact conversion.

---

## 6) Content strategy tuned for your goals

Given your portfolio is personal-brand first with emphasis on **blog + projects**, recommended content loop:

1. Publish one practical blog post/week (decision frameworks, product trade-offs, leadership lessons).
2. Every 3–4 posts, publish one “project deep-dive” case study.
3. Cross-link every post to relevant projects and every project to 2–3 related posts.
4. End each article with one clear CTA: “Discuss this challenge with me.”

This creates compounding authority: writing proves thinking, projects prove execution.

