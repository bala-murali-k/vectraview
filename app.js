/* ============================================================
   VectraView — app.js
   ============================================================ */

'use strict';

// ──────────────────────────────────────────────
// State
// ──────────────────────────────────────────────
const state = {
  svgSource: '',      // raw SVG string
  lottieData: null,   // parsed Lottie JSON
  mode: 'svg',        // 'svg' | 'lottie'
  zoom: 1,
  bgMode: 0,          // cycles: 0=transparent, 1=checker, 2=white, 3=dark
  lottieAnim: null,
  pngDataUrl: '',
};

const bgClasses = ['', 'preview-canvas--checker', 'preview-canvas--white', 'preview-canvas--dark'];

// ──────────────────────────────────────────────
// DOM refs
// ──────────────────────────────────────────────
const $ = id => document.getElementById(id);

const codeInput      = $('codeInput');
const codeLangBadge  = $('codeLangBadge');
const clearCodeBtn   = $('clearCodeBtn');
const parseCodeBtn   = $('parseCodeBtn');

const dropzone       = $('dropzone');
const fileInput      = $('fileInput');
const fileInfo       = $('fileInfo');
const fileName       = $('fileName');
const fileSize       = $('fileSize');
const clearFileBtn   = $('clearFileBtn');

const lottieUrl      = $('lottieUrl');
const loadLottieBtn  = $('loadLottieBtn');
const lottieControls = $('lottieControls');
const lottieSpeed    = $('lottieSpeed');
const lottieSpeedVal = $('lottieSpeedVal');
const lottiePauseBtn = $('lottiePauseBtn');
const lottieStopBtn  = $('lottieStopBtn');
const lottiePlayBtn  = $('lottiePlayBtn');

const previewCanvas  = $('previewCanvas');
const previewEmpty   = $('previewEmpty');
const previewRender  = $('previewRender');
const previewLottie  = $('previewLottie');
const bgToggleBtn    = $('bgToggleBtn');
const zoomInBtn      = $('zoomInBtn');
const zoomOutBtn     = $('zoomOutBtn');
const resetZoomBtn   = $('resetZoomBtn');
const metaType       = $('metaType');
const metaDimensions = $('metaDimensions');
const metaSize       = $('metaSize');

const toast   = $('toast');
const toastMsg = $('toastMsg');

// ──────────────────────────────────────────────
// Tab switching
// ──────────────────────────────────────────────
document.querySelectorAll('.panel__tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.panel__tabs .tab').forEach(t => t.classList.remove('tab--active'));
    tab.classList.add('tab--active');
    const target = tab.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(tc => {
      tc.classList.remove('tab-content--active');
      tc.style.display = 'none';
    });
    const active = $('tab-' + target);
    active.style.display = 'flex';
    active.classList.add('tab-content--active');
  });
});
// Init first tab display
document.querySelectorAll('.tab-content').forEach((tc, i) => {
  tc.style.display = i === 0 ? 'flex' : 'none';
});

// ──────────────────────────────────────────────
// Code input
// ──────────────────────────────────────────────
codeInput.addEventListener('input', () => {
  const val = codeInput.value.trim();
  if (val.startsWith('{') || val.startsWith('[')) {
    codeLangBadge.textContent = 'JSON (Lottie)';
  } else if (val.startsWith('<svg') || val.startsWith('<SVG') || val.includes('<svg')) {
    codeLangBadge.textContent = 'SVG';
  } else {
    codeLangBadge.textContent = '...';
  }
});

clearCodeBtn.addEventListener('click', () => {
  codeInput.value = '';
  codeLangBadge.textContent = 'SVG';
});

parseCodeBtn.addEventListener('click', () => {
  const val = codeInput.value.trim();
  if (!val) { showToast('Nothing to render', false); return; }
  if (isLottieJSON(val)) {
    try {
      const json = JSON.parse(val);
      loadLottie(json);
    } catch {
      showToast('Invalid JSON', false);
    }
  } else {
    loadSVG(val);
  }
});

function isLottieJSON(str) {
  if (!str.startsWith('{') && !str.startsWith('[')) return false;
  try {
    const j = JSON.parse(str);
    return j && (j.v !== undefined || j.animations !== undefined || j.op !== undefined);
  } catch { return false; }
}

// ──────────────────────────────────────────────
// File drop / browse
// ──────────────────────────────────────────────
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dropzone--over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dropzone--over'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('dropzone--over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});
clearFileBtn.addEventListener('click', () => {
  fileInput.value = '';
  fileInfo.classList.add('hidden');
  dropzone.classList.remove('hidden');
});

function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['svg', 'json'].includes(ext)) { showToast('Only .svg and .json files are supported', false); return; }
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size);
  fileInfo.classList.remove('hidden');
  const reader = new FileReader();
  reader.onload = e => {
    const content = e.target.result;
    codeInput.value = content;
    codeLangBadge.textContent = ext === 'svg' ? 'SVG' : 'JSON (Lottie)';
    if (ext === 'json' && isLottieJSON(content)) {
      loadLottie(JSON.parse(content));
    } else {
      loadSVG(content);
    }
  };
  reader.readAsText(file);
}

// ──────────────────────────────────────────────
// Lottie URL load
// ──────────────────────────────────────────────
loadLottieBtn.addEventListener('click', async () => {
  const url = lottieUrl.value.trim();
  if (!url) return;
  try {
    loadLottieBtn.textContent = '…';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed');
    const json = await res.json();
    loadLottie(json);
    codeInput.value = JSON.stringify(json, null, 2);
    codeLangBadge.textContent = 'JSON (Lottie)';
    loadLottieBtn.textContent = 'Load';
  } catch (err) {
    showToast('Could not load Lottie URL', false);
    loadLottieBtn.textContent = 'Load';
  }
});

lottieSpeed.addEventListener('input', () => {
  const v = parseFloat(lottieSpeed.value);
  lottieSpeedVal.textContent = v + '×';
  if (state.lottieAnim) state.lottieAnim.setSpeed(v);
});
lottiePauseBtn.addEventListener('click', () => state.lottieAnim?.pause());
lottieStopBtn.addEventListener('click',  () => state.lottieAnim?.stop());
lottiePlayBtn.addEventListener('click',  () => state.lottieAnim?.play());

// ──────────────────────────────────────────────
// Load SVG
// ──────────────────────────────────────────────
function loadSVG(svgString) {
  // Clean up existing lottie
  if (state.lottieAnim) { state.lottieAnim.destroy(); state.lottieAnim = null; }
  previewLottie.classList.add('hidden');
  previewLottie.innerHTML = '';
  lottieControls.classList.add('hidden');

  state.svgSource = svgString;
  state.lottieData = null;
  state.mode = 'svg';

  // Inject into preview
  previewRender.innerHTML = svgString;
  const svgEl = previewRender.querySelector('svg');
  if (!svgEl) { showToast('No valid SVG found', false); return; }

  // Ensure viewBox
  if (!svgEl.getAttribute('viewBox') && svgEl.getAttribute('width') && svgEl.getAttribute('height')) {
    const w = svgEl.getAttribute('width').replace(/[^0-9.]/g, '');
    const h = svgEl.getAttribute('height').replace(/[^0-9.]/g, '');
    svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  svgEl.removeAttribute('width');
  svgEl.removeAttribute('height');
  svgEl.style.width = '100%';
  svgEl.style.height = '100%';

  showPreview('svg');

  const vb = svgEl.getAttribute('viewBox');
  const dims = vb ? vb.split(/[\s,]+/).slice(2).join(' × ') : '—';
  setMeta('SVG', dims, formatBytes(svgString.length));

  generateAllConversions();
  generatePNG(svgString);
}

// ──────────────────────────────────────────────
// Load Lottie
// ──────────────────────────────────────────────
function loadLottie(json) {
  state.lottieData = json;
  state.svgSource = '';
  state.mode = 'lottie';

  if (state.lottieAnim) { state.lottieAnim.destroy(); state.lottieAnim = null; }
  previewRender.classList.add('hidden');
  previewRender.innerHTML = '';
  previewLottie.innerHTML = '';

  showPreview('lottie');
  lottieControls.classList.remove('hidden');

  state.lottieAnim = lottie.loadAnimation({
    container: previewLottie,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData: json,
  });

  const fps = json.fr || 30;
  const dur = ((json.op - json.ip) / fps).toFixed(1) + 's';
  const w = json.w || '—', h = json.h || '—';
  setMeta('Lottie', `${w} × ${h}`, `${fps}fps · ${dur}`);

  clearConversions();
}

// ──────────────────────────────────────────────
// Show preview helpers
// ──────────────────────────────────────────────
function showPreview(mode) {
  previewEmpty.classList.add('hidden');
  if (mode === 'svg') {
    previewRender.classList.remove('hidden');
    previewLottie.classList.add('hidden');
  } else {
    previewRender.classList.add('hidden');
    previewLottie.classList.remove('hidden');
  }
}

function setMeta(type, dims, size) {
  metaType.textContent = type;
  metaDimensions.textContent = dims;
  metaSize.textContent = size;
}

// ──────────────────────────────────────────────
// Preview controls
// ──────────────────────────────────────────────
bgToggleBtn.addEventListener('click', () => {
  const canvas = previewCanvas;
  canvas.classList.remove(bgClasses[state.bgMode]);
  state.bgMode = (state.bgMode + 1) % bgClasses.length;
  if (bgClasses[state.bgMode]) canvas.classList.add(bgClasses[state.bgMode]);
});
zoomInBtn.addEventListener('click', () => { state.zoom = Math.min(state.zoom + 0.25, 4); applyZoom(); });
zoomOutBtn.addEventListener('click', () => { state.zoom = Math.max(state.zoom - 0.25, 0.25); applyZoom(); });
resetZoomBtn.addEventListener('click', () => { state.zoom = 1; applyZoom(); });
function applyZoom() {
  previewRender.style.transform = `scale(${state.zoom})`;
}

// ──────────────────────────────────────────────
// Conversions
// ──────────────────────────────────────────────
function generateAllConversions() {
  const svg = state.svgSource;
  if (!svg) return;

  setConvCode('react',       convertToReact(svg));
  setConvCode('reactnative', convertToReactNative(svg));
  setConvCode('html',        convertToHTML(svg));
  setConvCode('css',         convertToCSS(svg));
  setConvCode('datauri',     convertToDataURI(svg));
  setConvCode('optimized',   convertToOptimized(svg));
  setConvCode('urlenc',      convertToURLEncoded(svg));
}

function clearConversions() {
  ['react','reactnative','html','css','datauri','optimized','urlenc'].forEach(id => {
    const el = $('code-' + id);
    if (el) { el.querySelector('code').textContent = '(only SVG mode supports code conversions)'; }
  });
  $('png-preview').classList.add('hidden');
  state.pngDataUrl = '';
}

function setConvCode(id, code) {
  const el = $('code-' + id);
  if (!el) return;
  el.querySelector('code').textContent = code;
}

// ──────────────────────────────────────────────
// Converters
// ──────────────────────────────────────────────
function convertToReact(svg) {
  let jsx = svg
    .replace(/<svg/g, '<svg')
    .replace(/class=/g, 'className=')
    .replace(/for=/g, 'htmlFor=')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/xmlns:xlink="[^"]*"/g, '')
    .replace(/xlink:href=/g, 'href=')
    .replace(/([a-z])-([a-z])/g, (_, a, b) => a + b.toUpperCase())
    .replace(/style="([^"]*)"/g, (_, s) => {
      const obj = s.split(';').filter(Boolean).map(p => {
        const [k, v] = p.split(':').map(x => x.trim());
        const camel = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        return `${camel}: '${v}'`;
      }).join(', ');
      return `style={{ ${obj} }}`;
    });

  return `import React from 'react';

const MyIcon = ({ width = 24, height = 24, ...props }) => (
  ${jsx.replace(/<svg/, '<svg width={width} height={height}').replace(/>/, '  {...props}\n  >')}
);

export default MyIcon;`;
}

function convertToReactNative(svg) {
  // Extract viewBox
  const vbMatch = svg.match(/viewBox="([^"]*)"/);
  const vb = vbMatch ? vbMatch[1] : '0 0 24 24';

  // Build minimal RN-svg structure by parsing paths, rects, circles etc.
  const paths = [...svg.matchAll(/<path([^>]*)\/>/g)].map(m => {
    const attrs = parseAttrs(m[1]);
    const d = attrs.d || '';
    const fill = attrs.fill || 'currentColor';
    const stroke = attrs.stroke || 'none';
    return `  <Path d="${d}" fill="${fill}" stroke="${stroke}" />`;
  });

  const rects = [...svg.matchAll(/<rect([^>]*)\/?>/g)].map(m => {
    const a = parseAttrs(m[1]);
    return `  <Rect x="${a.x||0}" y="${a.y||0}" width="${a.width||0}" height="${a.height||0}" rx="${a.rx||0}" fill="${a.fill||'none'}" stroke="${a.stroke||'none'}" />`;
  });

  const circles = [...svg.matchAll(/<circle([^>]*)\/?>/g)].map(m => {
    const a = parseAttrs(m[1]);
    return `  <Circle cx="${a.cx||0}" cy="${a.cy||0}" r="${a.r||0}" fill="${a.fill||'currentColor'}" />`;
  });

  const elements = [...paths, ...rects, ...circles].join('\n') || `  {/* SVG elements */}`;

  return `import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';

const MyIcon = ({ width = 24, height = 24, color = '#000', ...props }) => (
  <Svg
    width={width}
    height={height}
    viewBox="${vb}"
    fill="none"
    {...props}
  >
${elements}
  </Svg>
);

export default MyIcon;`;
}

function convertToHTML(svg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SVG Embed</title>
  <style>
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .icon { width: 120px; height: 120px; }
  </style>
</head>
<body>
  <div class="icon">
    ${svg.trim()}
  </div>
</body>
</html>`;
}

function convertToCSS(svg) {
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  const dataUri = `data:image/svg+xml;base64,${encoded}`;
  return `.icon {
  width: 24px;
  height: 24px;
  background-image: url("${dataUri}");
  background-repeat: no-repeat;
  background-size: contain;
  background-position: center;
  display: inline-block;
}

/* Usage: <span class="icon"></span> */`;
}

function convertToDataURI(svg) {
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

function convertToOptimized(svg) {
  // Basic optimization: remove comments, whitespace, empty attrs
  let opt = svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\s+\/>/g, '/>')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .replace(/\t/g, '')
    .replace(/ xmlns:xlink="[^"]*"/g, '')
    .replace(/ xml:space="[^"]*"/g, '')
    .replace(/ id="[^"]*"/g, '')
    .trim();
  return opt;
}

function convertToURLEncoded(svg) {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}

/* Usage as img src:
<img src="data:image/svg+xml,${encoded.slice(0,60)}..." /> */`;
}

// ──────────────────────────────────────────────
// PNG Generation
// ──────────────────────────────────────────────
function generatePNG(svgString) {
  const scale = 2;
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return;

  const vb = (svgEl.getAttribute('viewBox') || '0 0 100 100').split(/[\s,]+/);
  const w = parseFloat(vb[2]) || 100;
  const h = parseFloat(vb[3]) || 100;

  const canvas = document.createElement('canvas');
  canvas.width  = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, w * scale, h * scale);
    URL.revokeObjectURL(url);
    const dataUrl = canvas.toDataURL('image/png');
    state.pngDataUrl = dataUrl;
    const pngImg = $('pngImg');
    pngImg.src = dataUrl;
    $('png-preview').classList.remove('hidden');
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

// ──────────────────────────────────────────────
// Conv card expand / copy / download
// ──────────────────────────────────────────────
document.querySelectorAll('.conv-card__header').forEach(header => {
  header.addEventListener('click', e => {
    if (e.target.closest('.conv-card__actions')) return;
    const card = header.closest('.conv-card');
    const conv = card.dataset.conv;
    const codeEl   = $('code-' + conv);
    const pngEl    = $('png-preview');
    const target   = conv === 'png' ? pngEl : codeEl;
    if (!target) return;
    const isOpen = !target.classList.contains('hidden');
    target.classList.toggle('hidden', isOpen);
    card.classList.toggle('conv-card--expanded', !isOpen);
  });
});

document.querySelectorAll('[data-action]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const action = btn.dataset.action;
    const conv   = btn.dataset.conv;
    if (action === 'copy')     handleCopy(conv);
    if (action === 'download') handleDownload(conv);
  });
});

function getContent(conv) {
  if (conv === 'png') return state.pngDataUrl;
  const el = $('code-' + conv);
  return el ? el.querySelector('code').textContent : '';
}

function handleCopy(conv) {
  const content = getContent(conv);
  if (!content) { showToast('Nothing to copy — render an SVG first', false); return; }
  if (conv === 'png' && content.startsWith('data:')) {
    // Copy as text (data URL)
    navigator.clipboard.writeText(content).then(() => showToast('PNG data URL copied!'));
    return;
  }
  navigator.clipboard.writeText(content).then(() => showToast('Copied to clipboard!'));
}

function handleDownload(conv) {
  const content = getContent(conv);
  if (!content) { showToast('Nothing to download — render an SVG first', false); return; }

  const map = {
    react:       ['MyIcon.jsx',       'text/plain'],
    reactnative: ['MyIcon.native.jsx','text/plain'],
    html:        ['index.html',       'text/html'],
    css:         ['icon.css',         'text/css'],
    datauri:     ['datauri.txt',      'text/plain'],
    optimized:   ['icon.optimized.svg','image/svg+xml'],
    urlenc:      ['urlencoded.txt',   'text/plain'],
    png:         ['icon.png',         'image/png'],
  };

  const [fname, mime] = map[conv] || ['download.txt', 'text/plain'];

  if (conv === 'png' && content.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = content;
    a.download = fname;
    a.click();
    showToast('PNG downloaded!');
    return;
  }

  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = fname;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`${fname} downloaded!`);
}

// ──────────────────────────────────────────────
// Toast
// ──────────────────────────────────────────────
let toastTimer;
function showToast(msg, success = true) {
  toastMsg.textContent = msg;
  toast.style.color = success ? 'var(--accent3)' : 'var(--accent2)';
  toast.classList.add('toast--visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('toast--visible'), 2400);
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function parseAttrs(str) {
  const attrs = {};
  const re = /(\w[\w-]*)="([^"]*)"/g;
  let m;
  while ((m = re.exec(str)) !== null) attrs[m[1]] = m[2];
  return attrs;
}

// ──────────────────────────────────────────────
// Keyboard shortcuts
// ──────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    parseCodeBtn.click();
  }
});

// ──────────────────────────────────────────────
// Init — show placeholder animation in preview
// ──────────────────────────────────────────────
(function initPlaceholder() {
  // Subtle idle animation on the empty icon
  const icon = document.querySelector('.preview-empty__icon');
  if (!icon) return;
  let t = 0;
  const tick = () => {
    t += 0.01;
    const s = 0.95 + Math.sin(t) * 0.05;
    icon.style.transform = `scale(${s})`;
    icon.style.opacity = 0.4 + Math.sin(t * 0.7) * 0.15;
    requestAnimationFrame(tick);
  };
  tick();
})();
