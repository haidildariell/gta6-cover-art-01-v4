// editor.js — editor state, undo/redo, presets, panel editing and PNG export.
// Wires the controls in index.html to the cover renderer and keeps every
// change undoable. Also handles the ?shot=cover scene the maker uses for
// screenshots, and exposes window.__coverApp for automated checks.

import { LAYOUT_LIST, EXPORT_SIZES, layoutById, layoutPanels, panelCountForLayout, renderCover, cropForPanel } from './cover.js';
import { GRADE_LIST, gradeById } from './grades.js';

export const SAMPLE_PHOTOS = [
  { src: 'samples/sample-convertible.jpg', label: 'Convertible', name: 'Convertible woman' },
  { src: 'samples/sample-rooftop.jpg', label: 'Rooftop', name: 'Rooftop man' },
  { src: 'samples/sample-neon.jpg', label: 'Neon Night', name: 'Neon friends' },
  { src: 'samples/sample-pier.jpg', label: 'Pier', name: 'Pier man' },
];

export const PRESETS = [
  {
    id: 'photo-cover',
    name: 'Photo Cover',
    layout: 'nine',
    grade: 'sunset',
    halftone: true,
    title: 'PALM HEAT',
    subtitle: 'Coastline Summer',
    tagline: 'VICE CITY SUNSET • PALMS • NEON NIGHTS',
    badge: 'SUMMER 2026',
  },
  {
    id: 'hero-photo',
    name: 'Hero Photo',
    layout: 'hero',
    grade: 'rose',
    halftone: false,
    title: 'PALM HEAT',
    subtitle: 'Coastline Summer',
    tagline: 'VICE CITY SUNSET • PALMS • NEON NIGHTS',
    badge: 'SUMMER 2026',
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    layout: 'fullbleed',
    grade: 'neon',
    halftone: true,
    title: 'NEON HEAT',
    subtitle: 'After Dark',
    tagline: 'NEON • RAIN • MIDNIGHT DINER',
    badge: 'NIGHT 2026',
  },
];

export function defaultCoverState() {
  return {
    layout: 'nine',
    grade: 'sunset',
    halftone: true,
    eyebrow: 'WELCOME TO',
    title: 'PALM HEAT',
    subtitle: 'Coastline Summer',
    tagline: 'VICE CITY SUNSET • PALMS • NEON NIGHTS',
    badge: 'SUMMER 2026',
    showBadge: true,
    photos: SAMPLE_PHOTOS.map((s) => ({ src: s.src, name: s.name })),
    panelPhotos: [0, 1, 2, 3, 0, 2, 1, 3, 0],
    // Default vertical offsets keep faces in frame on the wide, short
    // panels (positive y shows more of the photo's top).
    crops: [
      { x: 0, y: 0.05, zoom: 1 },
      { x: 0, y: 0.12, zoom: 1 },
      { x: 0, y: 0.08, zoom: 1 },
      { x: 0, y: 0.18, zoom: 1 },
      { x: 0, y: 0.05, zoom: 1 },
      { x: 0, y: 0.08, zoom: 1 },
      { x: 0, y: 0.12, zoom: 1 },
      { x: 0, y: 0.18, zoom: 1 },
      { x: 0, y: 0.05, zoom: 1 },
    ],
    selectedPanel: 0,
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export class CoverEditor {
  constructor(canvas, onChange) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = defaultCoverState();
    this.images = {};
    this.undoStack = [];
    this.redoStack = [];
    this.onChange = onChange || (() => {});
    this.previewSize = { w: 720, h: 720 };
    this.loadSampleImages();
  }

  loadSampleImages() {
    for (const photo of this.state.photos) {
      this.loadImage(photo.src);
    }
  }

  loadImage(src) {
    if (this.images[src]) return this.images[src];
    const img = new Image();
    img.onload = () => this.drawPreview();
    img.src = src;
    this.images[src] = img;
    return img;
  }

  pushHistory() {
    this.undoStack.push(cloneState(this.state));
    if (this.undoStack.length > 60) this.undoStack.shift();
    this.redoStack.length = 0;
    this.onChange();
  }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(cloneState(this.state));
    this.state = this.undoStack.pop();
    this.drawPreview();
    this.onChange();
  }

  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(cloneState(this.state));
    this.state = this.redoStack.pop();
    this.drawPreview();
    this.onChange();
  }

  update(patch, recordHistory) {
    if (recordHistory) this.pushHistory();
    Object.assign(this.state, patch);
    this.drawPreview();
    this.onChange();
  }

  applyPreset(presetId) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    this.pushHistory();
    Object.assign(this.state, {
      layout: preset.layout,
      grade: preset.grade,
      halftone: preset.halftone,
      title: preset.title,
      subtitle: preset.subtitle,
      tagline: preset.tagline,
      badge: preset.badge,
    });
    this.drawPreview();
    this.onChange();
  }

  addUploadedPhoto(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result);
        const photo = { src, name: file.name || 'Uploaded photo' };
        this.pushHistory();
        this.state.photos.push(photo);
        this.loadImage(src);
        const idx = this.state.photos.length - 1;
        this.state.panelPhotos[this.state.selectedPanel] = idx;
        this.drawPreview();
        this.onChange();
        resolve(photo);
      };
      reader.readAsDataURL(file);
    });
  }

  assignSampleToSelected(sampleIndex) {
    this.pushHistory();
    this.state.panelPhotos[this.state.selectedPanel] = sampleIndex;
    this.drawPreview();
    this.onChange();
  }

  fillAllPanelsWith(sampleIndex) {
    this.pushHistory();
    const count = panelCountForLayout(this.state.layout);
    for (let i = 0; i < count; i++) this.state.panelPhotos[i] = sampleIndex;
    this.drawPreview();
    this.onChange();
  }

  selectPanel(index) {
    this.state.selectedPanel = index;
    this.drawPreview();
    this.onChange();
  }

  nudgeSelectedCrop(dx, dy, zoomDelta) {
    const i = this.state.selectedPanel;
    const crop = cropForPanel(this.state, i);
    crop.x = Math.max(-0.6, Math.min(0.6, crop.x + dx));
    crop.y = Math.max(-0.6, Math.min(0.6, crop.y + dy));
    crop.zoom = Math.max(1, Math.min(3, crop.zoom + zoomDelta));
    this.state.crops[i] = crop;
    this.drawPreview();
  }

  resetSelectedCrop() {
    this.pushHistory();
    this.state.crops[this.state.selectedPanel] = { x: 0, y: 0, zoom: 1 };
    this.drawPreview();
    this.onChange();
  }

  // Preview: draw the current cover at a square-ish preview size, sized to
  // the canvas element's box, keeping the export aspect of the wide size.
  drawPreview() {
    const size = this.previewSize;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(size.w * dpr);
    this.canvas.height = Math.round(size.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = Math.min(size.w / 1920, size.h / 1080);
    const w = 1920 * scale;
    const h = 1080 * scale;
    const ox = (size.w - w) / 2;
    const oy = (size.h - h) / 2;
    this.ctx.save();
    this.ctx.translate(ox, oy);
    this.ctx.scale(scale, scale);
    renderCover(this.ctx, 1920, 1080, this.state, this.images);
    this.ctx.restore();
    this.drawSelectionOutline(scale, ox, oy);
  }

  drawSelectionOutline(scale, ox, oy) {
    const { panels } = layoutPanels(this.state.layout, 1920, 1080);
    const rect = panels[this.state.selectedPanel];
    if (!rect) return;
    this.ctx.save();
    this.ctx.strokeStyle = '#ffe259';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([10, 6]);
    this.ctx.strokeRect(ox + rect.x * scale - 4, oy + rect.y * scale - 4, rect.w * scale + 8, rect.h * scale + 8);
    this.ctx.restore();
  }

  // Hit-test a point on the preview canvas (CSS pixels) to a panel index.
  panelAtPoint(clientX, clientY) {
    const box = this.canvas.getBoundingClientRect();
    const px = clientX - box.left;
    const py = clientY - box.top;
    const size = this.previewSize;
    const scale = Math.min(size.w / 1920, size.h / 1080);
    const w = 1920 * scale;
    const h = 1080 * scale;
    const ox = (size.w - w) / 2;
    const oy = (size.h - h) / 2;
    const cx = (px - ox) / scale;
    const cy = (py - oy) / scale;
    const { panels } = layoutPanels(this.state.layout, 1920, 1080);
    for (let i = panels.length - 1; i >= 0; i--) {
      const r = panels[i];
      if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) return i;
    }
    return -1;
  }

  // Render a full export canvas at one of the three post sizes.
  renderExportCanvas(sizeId) {
    const size = EXPORT_SIZES.find((s) => s.id === sizeId) || EXPORT_SIZES[0];
    const canvas = document.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext('2d');
    renderCover(ctx, size.w, size.h, this.state, this.images);
    return { canvas, size };
  }

  exportPng(sizeId) {
    const { canvas, size } = this.renderExportCanvas(sizeId);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return resolve(null);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `palm-heat-cover-${size.w}x${size.h}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        resolve(blob);
      }, 'image/png');
    });
  }

  exportDataUrl(sizeId) {
    const { canvas } = this.renderExportCanvas(sizeId);
    return canvas.toDataURL('image/png');
  }
}

// ---- UI wiring -----------------------------------------------------------

export function wireEditor(editor) {
  const $ = (id) => document.getElementById(id);

  function buildPicker(containerId, items, currentId, onPick) {
    const box = $(containerId);
    box.innerHTML = '';
    for (const item of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick' + (item.id === currentId ? ' active' : '');
      b.textContent = item.name;
      b.title = item.hint || item.name;
      b.addEventListener('click', () => onPick(item.id));
      box.appendChild(b);
    }
  }

  function refreshAll() {
    const s = editor.state;
    buildPicker('layout-picker', LAYOUT_LIST, s.layout, (id) => {
      editor.pushHistory();
      editor.state.layout = id;
      editor.state.selectedPanel = 0;
      editor.drawPreview();
      refreshAll();
    });
    buildPicker('grade-picker', GRADE_LIST, s.grade, (id) => {
      editor.pushHistory();
      editor.state.grade = id;
      editor.drawPreview();
      refreshAll();
    });
    buildPicker('preset-picker', PRESETS, null, (id) => {
      editor.applyPreset(id);
      refreshAll();
    });
    $('title-input').value = s.title;
    $('subtitle-input').value = s.subtitle;
    $('tagline-input').value = s.tagline;
    $('badge-input').value = s.badge;
    $('eyebrow-input').value = s.eyebrow;
    $('halftone-toggle').checked = !!s.halftone;
    $('badge-toggle').checked = s.showBadge !== false;
    $('undo-btn').disabled = editor.undoStack.length === 0;
    $('redo-btn').disabled = editor.redoStack.length === 0;
    $('panel-label').textContent = `Panel ${s.selectedPanel + 1} of ${panelCountForLayout(s.layout)} — ${layoutById(s.layout).name}`;
    const crop = cropForPanel(s, s.selectedPanel);
    $('zoom-slider').value = String(Math.round(crop.zoom * 100));
    $('zoom-value').textContent = `${Math.round(crop.zoom * 100)}%`;
    const photo = editor.state.photos[editor.state.panelPhotos[s.selectedPanel]] || editor.state.photos[0];
    $('panel-photo-label').textContent = photo ? photo.name : 'No photo';
  }

  editor.onChange = refreshAll;

  $('title-input').addEventListener('input', (e) => { editor.state.title = e.target.value; editor.drawPreview(); });
  $('subtitle-input').addEventListener('input', (e) => { editor.state.subtitle = e.target.value; editor.drawPreview(); });
  $('tagline-input').addEventListener('input', (e) => { editor.state.tagline = e.target.value; editor.drawPreview(); });
  $('badge-input').addEventListener('input', (e) => { editor.state.badge = e.target.value; editor.drawPreview(); });
  $('eyebrow-input').addEventListener('input', (e) => { editor.state.eyebrow = e.target.value; editor.drawPreview(); });
  $('halftone-toggle').addEventListener('change', (e) => { editor.pushHistory(); editor.state.halftone = e.target.checked; editor.drawPreview(); refreshAll(); });
  $('badge-toggle').addEventListener('change', (e) => { editor.pushHistory(); editor.state.showBadge = e.target.checked; editor.drawPreview(); refreshAll(); });

  $('undo-btn').addEventListener('click', () => { editor.undo(); refreshAll(); });
  $('redo-btn').addEventListener('click', () => { editor.redo(); refreshAll(); });

  $('photo-input').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) await editor.addUploadedPhoto(f);
    refreshAll();
  });

  const sampleBox = $('sample-picker');
  sampleBox.innerHTML = '';
  SAMPLE_PHOTOS.forEach((sample, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick sample-pick';
    const img = document.createElement('img');
    img.src = sample.src;
    img.alt = sample.name;
    b.appendChild(img);
    const span = document.createElement('span');
    span.textContent = sample.label;
    b.appendChild(span);
    b.addEventListener('click', () => { editor.assignSampleToSelected(i); refreshAll(); });
    b.addEventListener('dblclick', () => { editor.fillAllPanelsWith(i); refreshAll(); });
    b.title = 'Click: put in selected panel. Double-click: fill all panels.';
    sampleBox.appendChild(b);
  });

  $('zoom-slider').addEventListener('input', (e) => {
    const zoom = Number(e.target.value) / 100;
    const crop = cropForPanel(editor.state, editor.state.selectedPanel);
    crop.zoom = zoom;
    editor.state.crops[editor.state.selectedPanel] = crop;
    $('zoom-value').textContent = `${e.target.value}%`;
    editor.drawPreview();
  });
  $('zoom-slider').addEventListener('change', () => editor.pushHistory());
  $('crop-reset-btn').addEventListener('click', () => { editor.resetSelectedCrop(); refreshAll(); });

  for (const size of EXPORT_SIZES) {
    const btn = document.querySelector(`[data-export="${size.id}"]`);
    if (btn) btn.addEventListener('click', () => editor.exportPng(size.id));
  }

  // Drag to position the selected panel's photo; wheel to zoom it.
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  editor.canvas.addEventListener('pointerdown', (e) => {
    const idx = editor.panelAtPoint(e.clientX, e.clientY);
    if (idx < 0) return;
    editor.selectPanel(idx);
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    editor.canvas.setPointerCapture(e.pointerId);
    refreshAll();
  });
  editor.canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = (e.clientX - lastX) / editor.canvas.getBoundingClientRect().width;
    const dy = (e.clientY - lastY) / editor.canvas.getBoundingClientRect().height;
    lastX = e.clientX;
    lastY = e.clientY;
    editor.nudgeSelectedCrop(dx * 1.2, dy * 1.2, 0);
  });
  editor.canvas.addEventListener('pointerup', () => {
    if (dragging) { dragging = false; editor.pushHistory(); refreshAll(); }
  });
  editor.canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    editor.nudgeSelectedCrop(0, 0, e.deltaY < 0 ? 0.08 : -0.08);
  }, { passive: false });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); editor.undo(); refreshAll(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); editor.redo(); refreshAll(); }
  });

  refreshAll();
}

// ---- Shot mode: ?shot=cover&w=1920&h=1080[&export=wide] -----------------
// Renders the cover full-window (and, with &export=, puts the PNG data URL
// into the page) so headless Chromium can capture the exact exported cover.

export function runShotMode(editor) {
  const params = new URLSearchParams(window.location.search);
  if (params.get('shot') !== 'cover') return false;
  const w = Math.min(1920, Math.max(320, Number(params.get('w')) || 1280));
  const h = Math.min(1350, Math.max(320, Number(params.get('h')) || 720));
  document.body.classList.add('shot-mode');
  const stage = document.getElementById('shot-stage');
  stage.hidden = false;
  const canvas = document.getElementById('shot-canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  const waitForImages = () => new Promise((resolve) => {
    let tries = 0;
    const check = () => {
      tries++;
      const ready = editor.state.photos.every((p) => {
        const img = editor.images[p.src];
        return img && img.complete && img.naturalWidth > 0;
      });
      if (ready || tries > 100) resolve();
      else setTimeout(check, 60);
    };
    check();
  });
  const render = async () => {
    await document.fonts.ready;
    await waitForImages();
    renderCover(ctx, w, h, editor.state, editor.images);
    const exportId = params.get('export');
    if (exportId) {
      const dataUrl = editor.exportDataUrl(exportId);
      const holder = document.getElementById('shot-export');
      holder.textContent = dataUrl;
      document.title = 'export-ready';
    } else {
      document.title = 'shot-ready';
    }
  };
  render();
  return true;
}
