/**
 * js/globe.js — MENA presence globe (About section)
 *
 * A dotted sphere with the four cities Ahmed has shipped from — Cairo, Riyadh,
 * Dubai, Kuwait City — highlighted and connected with arcs. Doubles as quiet
 * signal: he now leads a GIS company, so a geospatial globe is on-topic, not
 * decoration.
 *
 * Design constraints (deliberate):
 *   - three.js is loaded lazily via dynamic import, only when the section nears
 *     the viewport, so it never touches first paint.
 *   - Reduced-motion, small screens, or missing WebGL get a clean static SVG
 *     fallback (no three.js downloaded at all).
 *   - Palette matches the site: airy light card, cool-gray dots, accent-blue
 *     cities + arcs. Auto-rotates slowly; drag to spin; pauses when offscreen.
 */
'use strict';

const THREE_URL = 'https://esm.sh/three@0.160.1';

// Ahmed's shipping map, from the CV. [lat, lon, label]
const CITIES = [
  { name: 'Cairo',       lat: 30.04, lon: 31.24 },
  { name: 'Riyadh',      lat: 24.71, lon: 46.68 },
  { name: 'Dubai',       lat: 25.20, lon: 55.27 },
  { name: 'Kuwait City', lat: 29.38, lon: 47.99 },
];

const ACCENT = 0x2563eb;
const DOT     = 0xb4bcca;

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch { return false; }
}

// lat/lon (degrees) -> point on a sphere of given radius
function latLonToVec3(lat, lon, r) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return [
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  ];
}

// ---------------------------------------------------------------------------
// Static fallback: an inline SVG dotted globe, MENA facing front (matches the
// live globe's orientation). Self-contained, zero JS runtime.
// ---------------------------------------------------------------------------
function renderFallback(host) {
  const R = 150, cx = 190, cy = 178;
  const A = -2.88, B = 0.34;                 // same orientation as the 3D globe
  const ca = Math.cos(A), sa = Math.sin(A), cb = Math.cos(B), sb = Math.sin(B);
  const rot = (x, y, z) => {                 // Ry(A) then Rx(B)
    const x1 = x * ca + z * sa, z1 = -x * sa + z * ca;
    return [x1, y * cb - z1 * sb, y * sb + z1 * cb];
  };
  const project = (v) => [cx + v[0] * R, cy - v[1] * R]; // returns [px,py]

  // dotted surface (Fibonacci sphere), rotated for consistency, front only
  const dots = [];
  const N = 300, golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const rad = Math.sqrt(1 - y * y), t = golden * i;
    const v = rot(Math.cos(t) * rad, y, Math.sin(t) * rad);
    if (v[2] < -0.12) continue;
    const depth = (v[2] + 1) / 2, [px, py] = project(v);
    dots.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(1 + depth * 1.3).toFixed(2)}" fill="#8a97ad" opacity="${(0.22 + depth * 0.5).toFixed(2)}"/>`);
  }

  const cityV = CITIES.map((c) => rot(...latLonToVec3(c.lat, c.lon, 1)));
  // arcs between consecutive cities
  const arcs = cityV.map((a, i) => {
    const b = cityV[(i + 1) % cityV.length];
    if (a[2] < -0.1 || b[2] < -0.1) return '';
    const [ax, ay] = project(a), [bx, by] = project(b);
    const mx = (ax + bx) / 2, my = (ay + by) / 2 - 26;
    return `<path d="M${ax.toFixed(1)},${ay.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}" fill="none" stroke="#2563eb" stroke-width="1.4" opacity="0.5"/>`;
  }).join('');
  const cities = cityV.map((v, i) => {
    if (v[2] < -0.1) return '';
    const [px, py] = project(v);
    return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="#2563eb"/>` +
      `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="8" fill="none" stroke="#2563eb" stroke-width="1.3" opacity="0.4"/>` +
      `<text x="${px.toFixed(1)}" y="${(py - 12).toFixed(1)}" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="10" font-weight="600" fill="#2563eb">${CITIES[i].name}</text>`;
  }).join('');

  host.innerHTML =
    `<svg viewBox="0 0 380 360" width="100%" height="100%" role="img" aria-label="Globe highlighting Cairo, Riyadh, Dubai and Kuwait City">
       <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#e2e5ee" stroke-width="1"/>
       ${dots.join('')}${arcs}${cities}
     </svg>`;
}

// ---------------------------------------------------------------------------
// Live globe
// ---------------------------------------------------------------------------
async function initGlobe(canvas, host) {
  let THREE;
  try {
    THREE = await import(/* @vite-ignore */ THREE_URL);
  } catch {
    renderFallback(host);            // CDN blocked / offline -> graceful static
    return;
  }

  const R = 1.6;
  const scene = new THREE.Scene();
  // Fog fades the far hemisphere into the card background, giving real depth and
  // making the front dots read crisply on a light surface.
  scene.fog = new THREE.Fog(0xf6f7fb, 4.2, 7.2);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.z = 5.7;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const globe = new THREE.Group();
  scene.add(globe);

  // --- dotted sphere (Fibonacci distribution) ---
  const COUNT = 1500;
  const positions = new Float32Array(COUNT * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const t = golden * i;
    positions[i * 3]     = Math.cos(t) * rad * R;
    positions[i * 3 + 1] = y * R;
    positions[i * 3 + 2] = Math.sin(t) * rad * R;
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({
    color: 0x8a97ad, size: 0.04, sizeAttenuation: true, transparent: true, opacity: 0.95, fog: true,
  }));
  globe.add(dots);

  // --- faint accent sphere to give the dots a "surface" ---
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.985, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.02 }),
  ));

  // --- city markers + tracking HTML labels ---
  const cityVecs = CITIES.map((c) => new THREE.Vector3(...latLonToVec3(c.lat, c.lon, R)));
  const markerGroup = new THREE.Group();
  globe.add(markerGroup);
  const rings = [];
  const labels = [];
  cityVecs.forEach((v, i) => {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 16, 16),
      new THREE.MeshBasicMaterial({ color: ACCENT }),
    );
    dot.position.copy(v);
    markerGroup.add(dot);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.058, 0.07, 28),
      new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.65, side: THREE.DoubleSide }),
    );
    ring.position.copy(v);
    ring.lookAt(0, 0, 0);
    markerGroup.add(ring);
    rings.push(ring);

    const label = document.createElement('span');
    label.className = 'globe-label';
    label.textContent = CITIES[i].name;
    host.appendChild(label);
    labels.push(label);
  });

  // --- arcs between consecutive cities (quadratic bezier lifted off surface) ---
  for (let i = 0; i < cityVecs.length; i++) {
    const a = cityVecs[i], b = cityVecs[(i + 1) % cityVecs.length];
    const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * (1 + a.distanceTo(b) * 0.22));
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const g = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
    globe.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.55, fog: true })));
  }

  // Bring the city cluster (~45°E, ~27°N) to face the camera, tilt slightly.
  // Euler Y so the idle auto-spin turns the globe about its polar axis.
  globe.rotation.x = 0.34;
  globe.rotation.y = -2.88;

  // --- interaction: drag to spin, inertia settles back to rest ---
  let vel = 0, dragging = false, lastX = 0;
  const onDown = (e) => { dragging = true; lastX = (e.touches ? e.touches[0].clientX : e.clientX); };
  const onMove = (e) => {
    if (!dragging) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    vel = (x - lastX) * 0.00035;
    globe.rotation.y += (x - lastX) * 0.005;
    lastX = x;
  };
  const onUp = () => { dragging = false; };
  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('touchstart', onDown, { passive: true });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('mouseup', onUp);
  window.addEventListener('touchend', onUp);

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // pause the RAF loop when the card is offscreen (battery/CPU)
  let visible = true, t = 0, raf = 0;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) loop();
  }, { threshold: 0.01 });
  io.observe(host);

  function loop() {
    if (!visible) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
    t += 0.016;
    if (!dragging) {
      globe.rotation.y += vel;
      vel *= 0.94;                          // glide to rest after a drag
    }
    const pulse = 1 + Math.sin(t * 2.2) * 0.12;
    rings.forEach((r) => r.scale.setScalar(pulse));
    renderer.render(scene, camera);

    // project city points to screen for the HTML labels
    globe.updateMatrixWorld();
    const w = host.clientWidth, h = host.clientHeight;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < cityVecs.length; i++) {
      tmp.copy(cityVecs[i]).applyMatrix4(globe.matrixWorld);
      const facing = tmp.z > -0.15; // world z > 0 == camera-facing hemisphere
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w;
      const y = (-tmp.y * 0.5 + 0.5) * h;
      const lbl = labels[i];
      lbl.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${(y - 16).toFixed(1)}px)`;
      lbl.style.opacity = facing ? '1' : '0';
    }
  }
  loop();
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const host = document.getElementById('mena-globe');
  if (!host) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.matchMedia('(max-width: 767px)').matches;

  if (reduced || small || !supportsWebGL()) {
    renderFallback(host);
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'width:100%;height:100%;display:block;cursor:grab;touch-action:pan-y;';
  host.appendChild(canvas);

  // defer the heavy import until the section approaches
  const io = new IntersectionObserver((entries, obs) => {
    if (entries.some((e) => e.isIntersecting)) {
      obs.disconnect();
      initGlobe(canvas, host);
    }
  }, { rootMargin: '200px' });
  io.observe(host);
});
