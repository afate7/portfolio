---
title: "Phase 1 · Empathize"
year: 2024
category: insurtech
categoryLabel: "Tameeni Rebrand · Phase 1"
role: "Research Manager"
teamSize: "5-person squad"
description: GA archaeology, Hotjar session reviews, and the three personas the traffic actually contained — the phase that replaced "I think" with "we watched."
emoji: 🫀
gradient: "linear-gradient(135deg, #fff7ed, #ffedd5)"
tags:
  - Google Analytics
  - Hotjar
  - Personas
  - Behavioral Research
draft: false
series: tameeni-rebrand
seriesTitle: "Rebranding Tameeni — The Full Story"
---

Empathy in a consumer product with hundreds of thousands of users doesn't start with interviews. It starts with instrumentation — because before you can ask people why, you need to know **who they are and where they struggle**, and only the traffic can tell you that.

## Step 1 — Decide what to ask before looking

**Deliverable: a GA event framework, page by page.**

We didn't open Google Analytics and browse. We wrote the questions first — a structured matrix covering every page of the funnel: which entry tabs get used, whether the login module converts, who touches the tooltips, how far people scroll, what gets clicked on the quote list, which payment methods get chosen and in what order. Where the answer lived in BI systems instead of GA, the question was tagged and routed. Where no event existed, we created one.

![Google Analytics analysis board, zoomed out](/assets/cases/tameeni/stage-analytics.png)
*The GA board: a question matrix per page, then the answers pinned beside them. Zoomed out deliberately.*

## Step 2 — Learn who is actually out there

**Deliverable: a demographic and device profile of the real audience.**

The data window ran November 2023 to February 2024, and it redrew our assumptions:

- **57% of users on iOS mobile** (105k+ users) — the webview's worst platform was the audience's favorite
- **80.8% male**, with the **25–34 bracket at 44%** — young, mobile-native, low tolerance for web friction
- **Riyadh and Jeddah alone: 35.8%** of identified traffic
- Arabic-language sessions dominated — and the Arabic homepage logged **1.5M+ scroll events** against 87k on English

That last pair matters more than it looks: the product's primary audience was experiencing the weakest version of it — a right-to-left interface rendered through a webview designed left-to-right first.

## Step 3 — Watch people fail

**Deliverable: a Hotjar session-review corpus, tagged by behavior.**

Numbers say where; recordings say why. We reviewed sessions systematically and tagged what we saw. One recording became the project's unofficial mascot: **a single user spending 31 minutes trying to complete one purchase** of a product the law requires them to own. Others showed the patterns that later became problem statements — validation errors firing *while the user was still typing*, the Buy Now button hiding below the fold at common viewport sizes, users sorting by price as their very first act on the quote list and then failing to find the filter again.

![Hotjar analysis wall, zoomed out](/assets/cases/tameeni/stage-hotjar.png)
*The Hotjar wall: session findings organized screen by screen across the funnel.*

One funnel number from this step set the tone for everything after: on the homepage, **29,657 users engaged the ID field — and only 11,299 reached Buy Now**. Losing nearly two-thirds of intent at the very first form field is not a marketing problem.

## Step 4 — Give the traffic faces

**Deliverable: three personas drawn from real segments, not stock photos.**

From the demographics, behaviors, and support-side knowledge, we built three personas that carried the rest of the project: **the first-time buyer** (late twenties, Riyadh, new car, never bought insurance online), **the Uber driver** (Jeddah, needs cover spanning personal and rideshare use, no time to waste), and **the renewer** (mid-thirties IT consultant, policy expired, wants this done in one sitting). Every wireframe in Phase 4 would eventually be walked through their three pairs of eyes.

---

*Next: the phase where all of this becomes accountable — [Phase 2 · Define](/projects/tameeni-rebrand-define.html), where every journey step gets a problem statement with a drop-off number attached.*
