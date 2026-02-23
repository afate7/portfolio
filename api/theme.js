'use strict';
/**
 * Vercel Serverless Function — /css/theme.css
 *
 * Reads content/settings/theme.json from the repo and returns
 * a CSS file with :root custom properties. Mirrors the logic
 * in server.js so local dev and production are identical.
 */

const fs   = require('fs');
const path = require('path');

// Font family stacks
const FONT_MAP = {
  'Inter':             "'Inter', system-ui, -apple-system, sans-serif",
  'DM Sans':           "'DM Sans', system-ui, sans-serif",
  'Plus Jakarta Sans': "'Plus Jakarta Sans', system-ui, sans-serif",
  'Manrope':           "'Manrope', system-ui, sans-serif",
  'Space Grotesk':     "'Space Grotesk', system-ui, sans-serif",
  'Lora':              "'Lora', Georgia, serif",
  'Playfair Display':  "'Playfair Display', Georgia, serif",
  'Merriweather':      "'Merriweather', Georgia, serif",
};

// Google Fonts CDN URLs for non-system fonts
const GOOGLE_FONTS = {
  'DM Sans':           'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',
  'Plus Jakarta Sans': 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
  'Manrope':           'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap',
  'Space Grotesk':     'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
  'Lora':              'https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap',
  'Playfair Display':  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
  'Merriweather':      'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',
};

function buildCss(theme) {
  const r         = parseInt(theme.borderRadius) || 12;
  const fontStack = FONT_MAP[theme.fontFamily] || FONT_MAP['Inter'];
  const btnRadius = theme.buttonStyle === 'pill'   ? '9999px'
                  : theme.buttonStyle === 'square'  ? '4px'
                  : Math.round(r * 0.67) + 'px';

  const fontImport = GOOGLE_FONTS[theme.fontFamily]
    ? `@import url('${GOOGLE_FONTS[theme.fontFamily]}');\n\n`
    : '';

  return fontImport + `:root {
  --clr-accent:       ${theme.accentColor  || '#2563eb'};
  --clr-accent-hover: ${theme.accentHover  || '#1d4ed8'};
  --clr-accent-soft:  ${theme.accentSoft   || '#eff6ff'};
  --clr-bg:           ${theme.bgColor      || '#fafafa'};
  --clr-bg-alt:       ${theme.bgAlt        || '#f4f4f0'};
  --clr-surface:      ${theme.surfaceColor || '#ffffff'};
  --clr-border:       ${theme.borderColor  || '#e8e8e4'};
  --clr-text:         ${theme.textColor    || '#111110'};
  --clr-text-muted:   ${theme.textMuted    || '#6b6b67'};
  --clr-text-faint:   ${theme.textFaint    || '#a8a8a4'};
  --font-sans:        ${fontStack};
  --radius-sm:        ${Math.max(2, Math.round(r * 0.33))}px;
  --radius-md:        ${Math.max(4, Math.round(r * 0.67))}px;
  --radius-lg:        ${r}px;
  --radius-xl:        ${Math.round(r * 1.33)}px;
  --radius-2xl:       ${Math.round(r * 2)}px;
  --radius-full:      9999px;
  --btn-radius:       ${btnRadius};
}
.btn { border-radius: var(--btn-radius) !important; }
.nav__cta { border-radius: var(--btn-radius) !important; }
`;
}

module.exports = function handler(req, res) {
  try {
    const themeFile = path.resolve(process.cwd(), 'content', 'settings', 'theme.json');
    const theme     = JSON.parse(fs.readFileSync(themeFile, 'utf8'));
    const css       = buildCss(theme);

    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).send(css);
  } catch (err) {
    // Fallback: return minimal CSS so the site still renders
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.status(200).send(':root { --clr-accent: #2563eb; }');
  }
};
