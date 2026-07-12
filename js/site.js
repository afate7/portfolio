/**
 * site.js — single runtime config loader
 * Reads /site.config.json and wires up analytics + Substack + socials.
 * Everything is conditional: an empty value simply means "feature off",
 * so filling site.config.json needs no rebuild and never breaks the page.
 */
(function () {
  'use strict';

  fetch('/site.config.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) { if (cfg) applyConfig(cfg); })
    .catch(function () { /* config optional — site works without it */ });

  function applyConfig(cfg) {
    var a = cfg.analytics || {};
    if (a.ga4) loadGA4(a.ga4);
    if (a.clarity) loadClarity(a.clarity);
    wireSubstack(cfg.substackUrl || (cfg.social && cfg.social.substack) || '');
    wireSocials(cfg.social || {});
    wireIntroVideo(cfg.introVideoUrl || '');
  }

  // ---- Google Analytics 4 ---------------------------------------------------
  function loadGA4(id) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
  }

  // ---- Microsoft Clarity ----------------------------------------------------
  function loadClarity(id) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', id);
  }

  // ---- Substack CTA ---------------------------------------------------------
  // Any element with [data-substack] becomes a subscribe link when a URL exists.
  // A [data-substack-section] wrapper is hidden entirely when no URL is set.
  function wireSubstack(url) {
    var targets = document.querySelectorAll('[data-substack]');
    var sections = document.querySelectorAll('[data-substack-section]');
    if (url) {
      targets.forEach(function (el) {
        el.setAttribute('href', url);
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      });
    } else {
      sections.forEach(function (el) { el.style.display = 'none'; });
    }
  }

  // ---- Social links ---------------------------------------------------------
  // Populates any [data-social="linkedin|twitter|github|substack"] anchor;
  // hides the anchor if that handle is empty.
  function wireSocials(social) {
    document.querySelectorAll('[data-social]').forEach(function (el) {
      var key = el.getAttribute('data-social');
      var url = social[key];
      if (url) {
        el.setAttribute('href', url);
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });
  }

  // ---- Intro video ----------------------------------------------------------
  // When introVideoUrl is set, embed it into [data-intro-video]; otherwise hide
  // the [data-intro-video-section] wrapper entirely (no empty box ever ships).
  // Supports YouTube, Vimeo, and direct video files (.mp4/.webm).
  function wireIntroVideo(url) {
    var sections = document.querySelectorAll('[data-intro-video-section]');
    var mounts = document.querySelectorAll('[data-intro-video]');
    if (!url) {
      sections.forEach(function (el) { el.style.display = 'none'; });
      return;
    }
    var embed = toEmbed(url);
    mounts.forEach(function (el) { el.innerHTML = embed; });
  }

  function toEmbed(url) {
    var yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (yt) {
      return '<iframe src="https://www.youtube-nocookie.com/embed/' + yt[1] +
        '" title="Intro video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen ' +
        'style="position:absolute;inset:0;width:100%;height:100%;border:0;"></iframe>';
    }
    var vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) {
      return '<iframe src="https://player.vimeo.com/video/' + vm[1] +
        '" title="Intro video" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen ' +
        'style="position:absolute;inset:0;width:100%;height:100%;border:0;"></iframe>';
    }
    return '<video controls playsinline preload="metadata" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000;">' +
      '<source src="' + escapeAttr(url) + '" /></video>';
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
