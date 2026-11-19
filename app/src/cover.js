// cover.js — cover layouts, panel geometry and the full cover renderer.
// A cover is drawn on one 2D canvas: photo panels first, then the title block
// (giant gradient lettering + neon script subtitle), badge and tagline strip,
// then grain and vignette on top. All coordinates are in cover pixels.

import { gradePanelImage, drawGrain, drawVignette, drawHalftone } from './grades.js';

export const LAYOUT_LIST = [
  { id: 'nine', name: '9-Panel Grid', hint: 'Nine photos + title block' },
  { id: 'hero', name: 'Hero + Three', hint: 'One big hero, three stacked' },
  { id: 'fullbleed', name: 'Full Bleed', hint: 'One photo edge to edge' },
  { id: 'tilted', name: 'Tilted Snapshots', hint: 'Rotated snapshot prints' },
  { id: 'four', name: '4-Panel Grid', hint: 'Four photos + title block' },
  { id: 'split', name: '2-Panel Split', hint: 'Two tall photos, title band' },
];

export const EXPORT_SIZES = [
  { id: 'square', label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { id: 'story', label: 'Story 1080 x 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
];

export function layoutById(id) {
  return LAYOUT_LIST.find((l) => l.id === id) || LAYOUT_LIST[0];
}

export function panelCountForLayout(layoutId) {
  if (layoutId === 'nine') return 9;
  if (layoutId === 'hero') return 4;
  if (layoutId === 'fullbleed') return 1;
  if (layoutId === 'tilted') return 4;
  if (layoutId === 'four') return 4;
  return 2;
}

// Geometry of every panel plus the title block, in cover pixels.
// Panels carry an optional rotation (tilted layout) in radians.
export function layoutPanels(layoutId, W, H) {
  const gap = Math.round(W * 0.012);
  const pad = Math.round(W * 0.02);
  const titleH = Math.round(H * 0.30);
  const photoH = H - titleH - pad * 2;
  const panels = [];
  if (layoutId === 'nine') {
    const cw = (W - pad * 2 - gap * 2) / 3;
    const ch = (photoH - gap * 2) / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        panels.push({ x: pad + c * (cw + gap), y: pad + r * (ch + gap), w: cw, h: ch, rot: 0 });
      }
    }
  } else if (layoutId === 'hero') {
    const heroW = (W - pad * 2) * 0.62;
    const sideW = W - pad * 2 - heroW - gap;
    const sh = (photoH - gap * 2) / 3;
    panels.push({ x: pad, y: pad, w: heroW, h: photoH, rot: 0 });
    for (let i = 0; i < 3; i++) {
      panels.push({ x: pad + heroW + gap, y: pad + i * (sh + gap), w: sideW, h: sh, rot: 0 });
    }
  } else if (layoutId === 'fullbleed') {
    panels.push({ x: 0, y: 0, w: W, h: H - titleH, rot: 0 });
  } else if (layoutId === 'tilted') {
    const cw = (W - pad * 2) * 0.46;
    const ch = photoH * 0.52;
    const tilts = [-0.055, 0.05, -0.04, 0.06];
    const spots = [
      [pad, pad],
      [W - pad - cw, pad + photoH * 0.06],
      [pad + cw * 0.12, pad + photoH * 0.44],
      [W - pad - cw * 1.06, pad + photoH * 0.42],
    ];
    for (let i = 0; i < 4; i++) {
      panels.push({ x: spots[i][0], y: spots[i][1], w: cw, h: ch, rot: tilts[i] });
    }
  } else if (layoutId === 'four') {
    const cw = (W - pad * 2 - gap) / 2;
    const ch = (photoH - gap) / 2;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        panels.push({ x: pad + c * (cw + gap), y: pad + r * (ch + gap), w: cw, h: ch, rot: 0 });
      }
    }
  } else {
    const cw = (W - pad * 2 - gap) / 2;
    panels.push({ x: pad, y: pad, w: cw, h: photoH, rot: 0 });
    panels.push({ x: pad + cw + gap, y: pad, w: cw, h: photoH, rot: 0 });
  }
  const title = { x: pad, y: H - titleH + pad * 0.4, w: W - pad * 2, h: titleH - pad };
  return { panels, title };
}

function fitFont(ctx, text, maxWidth, startPx, family, weight) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 24 && ctx.measureText(text).width > maxWidth) {
    px -= 4;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

// Giant gradient title: sunset gradient fill, heavy black outline, slight tilt.
export function drawGradientTitle(ctx, text, x, y, w, maxPx, align) {
  const px = fitFont(ctx, text.toUpperCase(), w, maxPx, 'Anton, "Arial Black", sans-serif', 400);
  ctx.save();
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'alphabetic';
  const cx = align === 'left' ? x : align === 'right' ? x + w : x + w / 2;
  const grad = ctx.createLinearGradient(x, y - px, x, y + px * 0.12);
  grad.addColorStop(0, '#ffe259');
  grad.addColorStop(0.35, '#ffa751');
  grad.addColorStop(0.62, '#ff5e8a');
  grad.addColorStop(0.85, '#c86bff');
  grad.addColorStop(1, '#5e7bff');
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#12041f';
  ctx.lineWidth = Math.max(4, px * 0.10);
  ctx.strokeText(text.toUpperCase(), cx, y);
  ctx.fillStyle = grad;
  ctx.fillText(text.toUpperCase(), cx, y);
  ctx.restore();
  return px;
}

// Neon script subtitle: Pacifico with a pink glow and a soft white core.
export function drawNeonScript(ctx, text, x, y, w, maxPx) {
  const px = fitFont(ctx, text, w, maxPx, 'Pacifico, cursive', 400);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${px}px Pacifico, cursive`;
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = px * 0.55;
  ctx.fillStyle = '#ff5ea8';
  ctx.fillText(text, x + w / 2, y);
  ctx.shadowBlur = px * 0.22;
  ctx.fillStyle = '#ffd7ec';
  ctx.fillText(text, x + w / 2, y);
  ctx.restore();
  return px;
}

// Starburst badge: spiked circle with a bold label, like a magazine sticker.
export function drawStarburstBadge(ctx, cx, cy, r, label) {
  const spikes = 14;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.78;
    const x = cx + Math.cos(ang) * rr;
    const y = cy + Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffe259';
  ctx.fill();
  ctx.lineWidth = Math.max(3, r * 0.07);
  ctx.strokeStyle = '#12041f';
  ctx.stroke();
  ctx.fillStyle = '#12041f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const px = fitFont(ctx, label.toUpperCase(), r * 1.55, r * 0.42, 'Anton, "Arial Black", sans-serif', 400);
  ctx.font = `${px}px Anton, "Arial Black", sans-serif`;
  ctx.fillText(label.toUpperCase(), cx, cy + 1);
  ctx.restore();
}

// Draw one photo panel (with white frame border) into the cover.
function drawPhotoPanel(ctx, img, crop, rect, gradeId, halftoneOn) {
  const graded = gradePanelImage(img, crop, rect.w, rect.h, gradeId);
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  if (rect.rot) ctx.rotate(rect.rot);
  ctx.translate(-rect.w / 2, -rect.h / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-5, -5, rect.w + 10, rect.h + 10);
  ctx.drawImage(graded, 0, 0, rect.w, rect.h);
  ctx.strokeStyle = 'rgba(18,4,31,0.85)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, rect.w, rect.h);
  if (halftoneOn) {
    const cell = Math.max(6, Math.round(rect.w / 90));
    drawHalftone(ctx, graded, 0, 0, rect.w, rect.h, cell, 'rgba(10,6,24,0.16)');
  }
  ctx.restore();
}

function defaultCrop() {
  return { x: 0, y: 0, zoom: 1 };
}

export function cropForPanel(state, index) {
  const list = state.crops || [];
  return list[index] || defaultCrop();
}

export function photoForPanel(state, index) {
  const picks = state.panelPhotos || [];
  const photos = state.photos || [];
  if (!photos.length) return null;
  const pick = picks[index] === undefined ? index % photos.length : picks[index];
  return photos[pick % photos.length] || null;
}

// The full cover render. `state` holds layout/grade/text/panels; `images` is a
// map from photo src string to a loaded HTMLImageElement.
export function renderCover(ctx, W, H, state, images) {
  const layoutId = state.layout || 'nine';
  const gradeId = state.grade || 'sunset';
  const halftoneOn = state.halftone || gradeId === 'poster';
  const { panels, title } = layoutPanels(layoutId, W, H);

  // Sunset sky background behind everything.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1b0b3b');
  sky.addColorStop(0.45, '#7a1e6e');
  sky.addColorStop(0.75, '#ff5e62');
  sky.addColorStop(1, '#ffb347');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Palm silhouettes along the bottom edge, drawn as simple fronds.
  drawPalmSilhouettes(ctx, W, H);

  for (let i = 0; i < panels.length; i++) {
    const photo = photoForPanel(state, i);
    const rect = panels[i];
    if (!photo) {
      ctx.save();
      ctx.fillStyle = '#2a1145';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = '#ff8fb8';
      ctx.font = `${Math.round(rect.h * 0.08)}px Anton, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.restore();
      continue;
    }
    const img = images[photo.src];
    if (!img || !img.complete || !img.naturalWidth) {
      ctx.save();
      ctx.fillStyle = '#2a1145';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
      continue;
    }
    drawPhotoPanel(ctx, img, cropForPanel(state, i), rect, gradeId, halftoneOn);
  }

  // Title block: eyebrow, giant gradient title, neon script subtitle.
  const t = title;
  const eyebrow = (state.eyebrow || 'WELCOME TO').toUpperCase();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const ebPx = Math.round(H * 0.022);
  ctx.font = `${ebPx}px Anton, "Arial Black", sans-serif`;
  ctx.fillStyle = '#ffe259';
  ctx.letterSpacing = `${Math.round(ebPx * 0.35)}px`;
  ctx.fillText(eyebrow, t.x + t.w / 2, t.y + ebPx);
  ctx.restore();

  const titlePx = Math.round(H * 0.115);
  const titleY = t.y + ebPx + titlePx * 0.95;
  drawGradientTitle(ctx, state.title || 'PALM HEAT', t.x, titleY, t.w, titlePx, 'center');

  const subPx = Math.round(H * 0.042);
  drawNeonScript(ctx, state.subtitle || 'Coastline Summer', t.x, titleY + subPx * 1.7, t.w, subPx);

  // Tagline strip under the subtitle.
  if (state.tagline) {
    ctx.save();
    ctx.textAlign = 'center';
    const tagPx = Math.round(H * 0.016);
    ctx.font = `${tagPx}px Anton, "Arial Black", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.letterSpacing = `${Math.round(tagPx * 0.3)}px`;
    ctx.fillText(state.tagline.toUpperCase(), t.x + t.w / 2, t.y + t.h - Math.round(H * 0.012));
    ctx.restore();
  }

  // Starburst badge overlapping the title block's right corner.
  if (state.showBadge !== false && state.badge) {
    const br = Math.round(W * 0.075);
    const bx = W - br * 1.1;
    const by = t.y + t.h * 0.42;
    drawStarburstBadge(ctx, bx, by, br, state.badge);
  }

  drawGrain(ctx, W, H, 0.9);
  drawVignette(ctx, W, H, 0.34);
}

function drawPalmSilhouettes(ctx, W, H) {
  ctx.save();
  ctx.strokeStyle = 'rgba(12,4,26,0.38)';
  ctx.lineWidth = Math.max(3, W * 0.004);
  ctx.lineCap = 'round';
  const base = H * 0.995;
  const spots = [
    [W * 0.03, H * 0.20],
    [W * 0.97, H * 0.22],
  ];
  for (const [px, len] of spots) {
    const topX = px + (px < W / 2 ? W * 0.04 : -W * 0.04);
    ctx.beginPath();
    ctx.moveTo(px, base);
    ctx.quadraticCurveTo(px + W * 0.015, base - len * 0.6, topX, base - len);
    ctx.stroke();
    for (let f = 0; f < 4; f++) {
      const ang = px < W / 2 ? -Math.PI * (0.08 + f * 0.14) : -Math.PI * (0.92 - f * 0.14);
      const fx = topX + Math.cos(ang) * len * 0.42;
      const fy = base - len + Math.sin(ang) * len * 0.34;
      ctx.beginPath();
      ctx.moveTo(topX, base - len);
      ctx.quadraticCurveTo((topX + fx) / 2, (base - len + fy) / 2 - len * 0.10, fx, fy);
      ctx.stroke();
    }
  }
  ctx.restore();
}
