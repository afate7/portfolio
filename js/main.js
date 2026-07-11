/**
 * Personal Portfolio — Main JavaScript
 * Vanilla JS, no dependencies, works offline
 */

'use strict';

// ============================================================
// 1. NAVIGATION: Scroll state + Hamburger mobile menu
// ============================================================
(function initNav() {
  const nav         = document.getElementById('nav');
  const hamburger   = document.getElementById('hamburger');
  const mobileMenu  = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('[data-mobile-link]');

  if (!nav) return;

  // Sticky nav scroll effect
  const onScroll = () => {
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Run once on load

  // Mobile menu toggle
  if (!hamburger || !mobileMenu) return;
  mobileMenu.setAttribute('aria-hidden', 'true');

  const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select';
  let previousFocus = null;

  const trapFocus = (e) => {
    if (!mobileMenu.classList.contains('open') || e.key !== 'Tab') return;
    const focusables = mobileMenu.querySelectorAll(focusableSelector);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const openMenu = () => {
    previousFocus = document.activeElement;
    hamburger.classList.add('open');
    mobileMenu.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    mobileMenu.querySelector(focusableSelector)?.focus();
  };

  const closeMenu = () => {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  };

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.contains('open');
    isOpen ? closeMenu() : openMenu();
  });

  // Close on mobile link click
  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
    trapFocus(e);
  });
})();

// ============================================================
// 2. ACTIVE NAV LINK: Highlight current section on scroll
// ============================================================
(function initActiveNav() {
  const sections  = document.querySelectorAll('section[id], header[id]');
  const navLinks  = document.querySelectorAll('.nav__link[href*="#"]');

  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href').includes(`#${id}`));
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(section => observer.observe(section));
})();

// ============================================================
// 3. SCROLL REVEAL: Intersection Observer for .reveal elements
// ============================================================
(function initReveal() {
  // Respect reduced motion preference
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
      el.classList.add('visible');
    });
    return;
  }

  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!revealEls.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // Fire once only
      }
    });
  }, {
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.05,
  });

  revealEls.forEach(el => observer.observe(el));
})();

// ============================================================
// 4. SMOOTH ANCHOR SCROLLING: Handle same-page #hash links
// ============================================================
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;

      e.preventDefault();
      const offset = 80; // nav height
      const top = target.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();

// ============================================================
// 5. HERO PARALLAX: Subtle parallax on scroll for hero elements
// ============================================================
(function initParallax() {
  const hero     = document.querySelector('.hero');
  const bgGrid   = document.querySelector('.bg-grid');
  const bgGrad   = document.querySelector('.bg-gradient');

  if (!hero) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (ticking) return;
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const heroH   = hero.offsetHeight;

      if (scrollY < heroH) {
        const progress = scrollY / heroH;
        if (bgGrid) bgGrid.style.transform = `translateY(${scrollY * 0.15}px)`;
        if (bgGrad) bgGrad.style.transform = `translate(${scrollY * 0.05}px, ${scrollY * 0.1}px)`;
      }

      ticking = false;
    });
    ticking = true;
  }, { passive: true });
})();

// ============================================================
// 6. OFFLINE DETECTION: Show banner when offline
// ============================================================
(function initOffline() {
  const banner = document.getElementById('offlineBanner');
  if (!banner) return;

  const show = () => banner.classList.add('visible');
  const hide = () => banner.classList.remove('visible');

  window.addEventListener('offline', show);
  window.addEventListener('online',  hide);

  // Show immediately if already offline
  if (!navigator.onLine) show();
})();

// ============================================================
// 7. CONTACT FORM: Validate, then hand off to the visitor's email client
//    (no backend / no keys — the message is pre-addressed to Ahmed)
// ============================================================
(function initContactForm() {
  const form = document.querySelector('.contact__form');
  if (!form) return;

  const RECIPIENT = 'afateh@me.com';

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const btn     = form.querySelector('.form-submit');
    const original = btn ? btn.textContent : '';
    const name    = form.querySelector('#name');
    const email   = form.querySelector('#email');
    const message = form.querySelector('#message');

    // Basic validation
    let valid = true;
    [name, email, message].forEach((field) => {
      if (!field) return;
      if (!field.value.trim()) { field.style.borderColor = '#ef4444'; valid = false; }
      else { field.style.borderColor = ''; }
    });
    if (email && email.value && !email.value.includes('@')) {
      email.style.borderColor = '#ef4444';
      valid = false;
    }
    if (!valid) return;

    // Build a pre-filled email and open the visitor's mail client.
    const subject = `Portfolio enquiry from ${name.value.trim()}`;
    const body    = `${message.value.trim()}\n\nSent by ${name.value.trim()} (${email.value.trim()})`;
    const href    = `mailto:${RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (btn) btn.textContent = 'Opening your email…';
    window.location.href = href;

    setTimeout(() => {
      if (btn) btn.textContent = '✓ Opened in your mail app';
      form.reset();
      setTimeout(() => { if (btn) btn.textContent = original; }, 4000);
    }, 600);
  });
})();

// ============================================================
// 8. SERVICE WORKER REGISTRATION
// ============================================================
(function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Determine root path
      const swPath = document.querySelector('link[rel="manifest"]')
        ?.getAttribute('href')
        ?.replace('manifest.json', 'sw.js') || '/sw.js';

      navigator.serviceWorker.register(swPath)
        .then(reg => console.log('[SW] Registered:', reg.scope))
        .catch(err => console.warn('[SW] Registration failed:', err));
    });
  }
})();

// ============================================================
// 9. TYPED TEXT EFFECT (Hero subtitle emphasis — optional)
// ============================================================
(function initTyped() {
  const target = document.querySelector('.hero__eyebrow');
  if (!target) return;

  const roles = ['Digital Product Lead', 'Product Strategist', 'FinTech Builder', 'Problem Solver'];
  let roleIndex = 0;
  let charIndex = 0;
  let deleting = false;
  const speed = { type: 80, delete: 40, pause: 2000 };

  const type = () => {
    const current = roles[roleIndex];

    if (!deleting) {
      target.textContent = current.substring(0, charIndex + 1);
      charIndex++;
      if (charIndex === current.length) {
        deleting = true;
        setTimeout(type, speed.pause);
        return;
      }
    } else {
      target.textContent = current.substring(0, charIndex - 1);
      charIndex--;
      if (charIndex === 0) {
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
      }
    }

    setTimeout(type, deleting ? speed.delete : speed.type);
  };

  // Start after initial animation completes
  setTimeout(type, 2000);
})();

// ============================================================
// 10. LAZY IMAGES: Native lazy loading + fade-in on load
// ============================================================
(function initLazyImages() {
  const images = document.querySelectorAll('img[loading="lazy"]');
  images.forEach(img => {
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.4s ease';
    if (img.complete) {
      img.style.opacity = '1';
    } else {
      img.addEventListener('load', () => { img.style.opacity = '1'; });
      img.addEventListener('error', () => { img.style.opacity = '0.5'; });
    }
  });
})();

// ============================================================
// 11. CURSOR TRAIL (Subtle, desktop only)
// ============================================================
(function initCursorTrail() {
  if (window.innerWidth < 768) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const trail = [];
  const NUM = 6;

  for (let i = 0; i < NUM; i++) {
    const dot = document.createElement('div');
    Object.assign(dot.style, {
      position: 'fixed',
      width: `${8 - i}px`,
      height: `${8 - i}px`,
      borderRadius: '50%',
      background: `rgba(37,99,235,${0.12 - i * 0.015})`,
      pointerEvents: 'none',
      zIndex: '9998',
      transition: `transform ${80 + i * 40}ms ease`,
      transform: 'translate(-50%, -50%)',
      left: '-100px',
      top: '-100px',
    });
    document.body.appendChild(dot);
    trail.push({ el: dot, x: -100, y: -100 });
  }

  let mx = -100, my = -100;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
  }, { passive: true });

  const animate = () => {
    let lx = mx, ly = my;
    trail.forEach((t, i) => {
      t.el.style.left = lx + 'px';
      t.el.style.top  = ly + 'px';
      lx = t.x = lx + (t.x - lx) * 0.4;
      ly = t.y = ly + (t.y - ly) * 0.4;
    });
    requestAnimationFrame(animate);
  };

  animate();
})();

// ============================================================
// 12. PAGE LOAD FADE-IN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.4s ease';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.opacity = '1';
    });
  });
});
