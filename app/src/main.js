// main.js — boot the Sunset Palms Cover Press editor.
import { CoverEditor, wireEditor, runShotMode } from './editor.js';

const canvas = document.getElementById('cover-canvas');
const editor = new CoverEditor(canvas);
window.__coverApp = editor;

// Size the preview canvas to its box, then draw.
function fitPreview() {
  const box = document.getElementById('preview-wrap');
  const rect = box.getBoundingClientRect();
  const w = Math.max(320, Math.floor(rect.width));
  editor.previewSize = { w, h: Math.round(w * 0.5625) };
  editor.drawPreview();
}

window.addEventListener('resize', fitPreview);

// Fonts first, then the first paint, so the title uses Anton/Pacifico.
document.fonts.ready.then(() => {
  fitPreview();
  editor.drawPreview();
});

if (!runShotMode(editor)) {
  wireEditor(editor);
  fitPreview();
  editor.drawPreview();
}
