// grades.js — colour grades, posterize/duotone and halftone for the cover press.
// Every grade here works on real pixels: the panel image is drawn to a small
// offscreen canvas, its ImageData is re-mapped channel by channel, and the
// result is painted back. Poster Ink adds a true halftone dot screen on top.

export const GRADE_LIST = [
  { id: 'sunset', name: 'Sunset', hint: 'Warm golden-hour glow' },
  { id: 'neon', name: 'Neon Nights', hint: 'Pink and teal night neon' },
  { id: 'teal', name: 'Teal Noir', hint: 'Teal shadows, warm skin' },
  { id: 'rose', name: 'Rose Gold', hint: 'Soft pink-gold blush' },
  { id: 'mono', name: 'Mono Poster', hint: 'High-contrast black and white' },
  { id: 'poster', name: 'Poster Ink', hint: 'Inked comic poster + halftone' },
];

export function gradeById(id) {
  return GRADE_LIST.find((g) => g.id === id) || GRADE_LIST[0];
}

function clampByte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

// Contrast around the midpoint, amount in [-1, 1].
function contrast(v, amount) {
  const f = 1 + amount;
  return clampByte((v - 128) * f + 128);
}

function saturate(r, g, b, amount) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return [
    clampByte(lum + (r - lum) * amount),
    clampByte(lum + (g - lum) * amount),
    clampByte(lum + (b - lum) * amount),
  ];
}

// Split-tone: push shadows toward one colour, highlights toward another.
function splitTone(r, g, b, shadow, highlight) {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const w = lum * lum;
  return [
    clampByte(r + (shadow[0] - r) * (1 - w) * 0.55 + (highlight[0] - r) * w * 0.55),
    clampByte(g + (shadow[1] - g) * (1 - w) * 0.55 + (highlight[1] - g) * w * 0.55),
    clampByte(b + (shadow[2] - b) * (1 - w) * 0.55 + (highlight[2] - b) * w * 0.55),
  ];
}

function posterizeChannel(v, levels) {
  const step = 255 / (levels - 1);
  return Math.round(Math.round(v / step) * step);
}

// Duotone gradient map: dark end colour -> light end colour by luminance.
function duotone(r, g, b, dark, light) {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return [
    clampByte(dark[0] + (light[0] - dark[0]) * lum),
    clampByte(dark[1] + (light[1] - dark[1]) * lum),
    clampByte(dark[2] + (light[2] - dark[2]) * lum),
  ];
}

// Re-map one panel's pixels in place. `data` is a Uint8ClampedArray (RGBA).
export function applyGradePixels(data, gradeId) {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    if (gradeId === 'sunset') {
      r = contrast(r * 1.14, 0.10);
      g = contrast(g * 1.02, 0.10);
      b = contrast(b * 0.80, 0.10);
      [r, g, b] = saturate(r, g, b, 1.25);
    } else if (gradeId === 'neon') {
      r = contrast(r * 1.16, 0.14);
      g = contrast(g * 0.88, 0.14);
      b = contrast(b * 1.18, 0.14);
      [r, g, b] = saturate(r, g, b, 1.45);
    } else if (gradeId === 'teal') {
      [r, g, b] = splitTone(r, g, b, [18, 78, 86], [255, 176, 110]);
      r = contrast(r, 0.12);
      g = contrast(g, 0.12);
      b = contrast(b, 0.12);
    } else if (gradeId === 'rose') {
      r = contrast(r * 1.12, 0.06);
      g = contrast(g * 0.94, 0.06);
      b = contrast(b * 1.02, 0.06);
      [r, g, b] = saturate(r, g, b, 1.18);
      [r, g, b] = splitTone(r, g, b, [96, 48, 66], [255, 214, 190]);
    } else if (gradeId === 'mono') {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = contrast(lum, 0.22);
      g = r;
      b = r;
    } else if (gradeId === 'poster') {
      r = posterizeChannel(r, 4);
      g = posterizeChannel(g, 4);
      b = posterizeChannel(b, 4);
      [r, g, b] = duotone(r, g, b, [16, 14, 34], [255, 214, 150]);
      r = contrast(r, 0.10);
      g = contrast(g, 0.10);
      b = contrast(b, 0.10);
    }
    data[i] = clampByte(r);
    data[i + 1] = clampByte(g);
    data[i + 2] = clampByte(b);
  }
}

// Deterministic seeded random (mulberry32) so grain is identical every export.
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Film grain: sparse light/dark speckles over the whole cover.
export function drawGrain(ctx, w, h, amount) {
  if (amount <= 0) return;
  const rand = seededRandom(20261119);
  const count = Math.floor(w * h * amount * 0.00012);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const light = rand() > 0.5;
    ctx.fillStyle = light ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
}

// Vignette: darkened corners so the cover reads like a printed poster.
export function drawVignette(ctx, w, h, strength) {
  const radius = Math.hypot(w, h) / 2;
  const grad = ctx.createRadialGradient(w / 2, h / 2, radius * 0.45, w / 2, h / 2, radius);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// True halftone: ink dots whose radius follows the local luminance of the
// panel underneath. `source` is the already-graded panel canvas.
export function drawHalftone(ctx, source, x, y, w, h, cell, ink) {
  const cols = Math.max(1, Math.floor(w / cell));
  const rows = Math.max(1, Math.floor(h / cell));
  const probe = document.createElement('canvas');
  probe.width = cols;
  probe.height = rows;
  const pctx = probe.getContext('2d');
  pctx.drawImage(source, 0, 0, cols, rows);
  const px = pctx.getImageData(0, 0, cols, rows).data;
  ctx.save();
  ctx.fillStyle = ink;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = (row * cols + col) * 4;
      const lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
      const radius = (1 - lum) * cell * 0.62;
      if (radius < 0.4) continue;
      ctx.beginPath();
      ctx.arc(x + (col + 0.5) * cell, y + (row + 0.5) * cell, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Grade one panel image into a fresh canvas of the panel's size and return it.
export function gradePanelImage(img, crop, pw, ph, gradeId) {
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(pw));
  off.height = Math.max(2, Math.round(ph));
  const octx = off.getContext('2d');
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const zoom = crop.zoom || 1;
  const baseScale = Math.max(pw / iw, ph / ih) * zoom;
  const sw = iw * baseScale;
  const sh = ih * baseScale;
  // Cover-fit: clamp the pan so the photo always fills the whole panel —
  // an unclamped offset leaves a transparent strip at the panel edge.
  const dxRaw = (pw - sw) / 2 + (crop.x || 0) * pw;
  const dyRaw = (ph - sh) / 2 + (crop.y || 0) * ph;
  const dx = Math.max(pw - sw, Math.min(0, dxRaw));
  const dy = Math.max(ph - sh, Math.min(0, dyRaw));
  octx.fillStyle = '#1b0b3b';
  octx.fillRect(0, 0, off.width, off.height);
  octx.drawImage(img, dx, dy, sw, sh);
  const imageData = octx.getImageData(0, 0, off.width, off.height);
  applyGradePixels(imageData.data, gradeId);
  octx.putImageData(imageData, 0, 0);
  return off;
}
