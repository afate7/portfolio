/**
 * cms.js · client-side wiring for build-generated listings
 *
 * Blog posts and project case studies are pre-rendered as static HTML by
 * tools/build.mjs (run `node tools/build.mjs` after editing content/).
 * This file only wires the category filters on the two listing pages.
 */

'use strict';

const BLOG_TAXONOMY = ['all', 'product', 'thinking', 'process'];
const PROJECT_TAXONOMY = ['all', 'fintech', 'govtech', 'edtech', 'insurtech'];

function initFilter(cardSelector, taxonomy) {
  const filterBtns = document.querySelectorAll('.filter-btn[data-filter]');
  const cards = document.querySelectorAll(cardSelector);
  if (!filterBtns.length || !cards.length) return;

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = taxonomy.includes(btn.dataset.filter) ? btn.dataset.filter : 'all';
      cards.forEach((card) => {
        card.hidden = !(filter === 'all' || card.dataset.category === filter);
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('#cms-blog-grid')) {
    initFilter('#cms-blog-grid .blog-full-card[data-category]', BLOG_TAXONOMY);
  }
  if (document.querySelector('#cms-projects-grid')) {
    initFilter('#cms-projects-grid .project-card[data-category]', PROJECT_TAXONOMY);
  }
});
