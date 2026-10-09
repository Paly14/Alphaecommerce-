// Punto de entrada: arma la interfaz y conecta todos los módulos.
import {
  store,
  on,
  emit,
  newProject,
  FORMATS,
  getClip,
  checkpoint,
  changed,
  select,
  setTime,
  undo,
  redo,
  resetHistory,
  projectDuration,
  deleteClip,
  duplicateClip,
  addTrack,
  makeClip,
  placeClip,
  uid,
  MIN_CLIP,
  deepMerge,
} from './state.js';
import { propAt, setKeyframe, setAnimatable } from './anim.js';
import { renderFrame, drawSelection, hitTest, clipState } from './render.js';
import { importFile, loadAssets, deleteAsset, syncMedia, pauseAll, ensureAudio, kvGet, kvSet } from './media.js';
import { initTimeline, formatTime, addAssetClip, zoomToFit, setZoom } from './timeline.js';
import { initInspector, FONTS, loadFont } from './inspector.js';
import { TEMPLATES, EFFECTS, insertTemplate, applyEffect } from './templates.js';
import { exportVideo, download, safeName, pickMime } from './export.js';
import { parseSubtitles, addSubtitles, SUB_STYLES } from './subtitles.js';

const $ = (sel) => document.querySelector(sel);
const canvas = $('#preview');
const ctx = canvas.getContext('2d');
const viewer = $('#viewer');
let viewScale = 0.5;
let dirty = true;

// ---------- Toast ----------
let toastTimer;
export function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ---------- Vista previa ----------
function fitPreview() {
  const P = store.project;
  const r = viewer.getBoundingClientRect();
  const availW = Math.max(50, r.width - 32);
  const availH = Math.max(50, r.height - 32);
  const s = Math.min(availW / P.width, availH / P.height);
  const cssW = Math.floor(P.width * s);
  const cssH = Math.floor(P.height * s);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.min(P.width, Math.round(cssW * dpr));
  canvas.height = Math.round((canvas.width * P.height) / P.width);
  viewScale = canvas.width / P.width;
  dirty = true;
}
new ResizeObserver(fitPreview).observe(viewer);

function drawPreview() {
  renderFrame(ctx, store.time, viewScale);
  const sel = store.selection && getClip(store.selection);
  if (sel && !store.playing) drawSelection(ctx, sel, store.time, viewScale);
}

// ---------- Reproducción ----------
let playStartT = 0;
let playStartNow = 0;

function play() {
  if (store.playing) return;
  ensureAudio();
  const dur = projectDuration();
  if (dur <= 0) return toast('Agregá algo a la línea de tiempo primero');
  if (store.time >= dur - 1e-3) setTime(0);
  store.playing = true;
  playStartT = store.time;
  playStartNow = performance.now();
  $('#btnPlay').textContent = '❚❚';
}

function pause() {
  if (!store.playing) return;
  store.playing = false;
  pauseAll();
  $('#btnPlay').textContent = '▶';
  dirty = true;
}

const togglePlay = () => (store.playing ? pause() : play());

function seek(t) {
  const wasPlaying = store.playing;
  if (wasPlaying) pause();
  setTime(Math.max(0, t));
  if (wasPlaying) play();
}

function loop(now) {
  if (!store.exporting) {
    if (store.playing) {
      const dur = projectDuration();
      const t = playStartT + (now - playStartNow) / 1000;
      if (t >= dur) {
        setTime(dur);
        pause();
      } else setTime(t);
    }
    syncMedia(store.time, store.playing);
    if (dirty || store.playing) {
      drawPreview();
      dirty = false;
    }
  }
  requestAnimationFrame(loop);
}

on('frame', () => (dirty = true));
on('time', () => {
  dirty = true;
  $('#tcNow').textContent = formatTime(store.time);
});
on('project', () => {
  dirty = true;
  $('#tcDur').textContent = formatTime(projectDuration());
  scheduleSave();
});
on('selection', () => (dirty = true));
on('format', () => {
  fitPreview();
  $('#fmtQuick').value = store.project.format;
});
on('name', () => {
  $('#projectName').value = store.project.name;
  scheduleSave();
});

// ---------- Interacción con el canvas: seleccionar y mover ----------
function toProject(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * store.project.width,
    y: ((e.clientY - r.top) / r.height) * store.project.height,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  if (store.playing) pause();
  const p = toProject(e);
  const hit = hitTest(p.x, p.y, store.time);
  select(hit ? hit.id : null);
  if (!hit) return;
  const c = hit;
  const lt = Math.min(c.duration, Math.max(0, store.time - c.start));
  const base = { x: propAt(c, 'x', lt), y: propAt(c, 'y', lt) };
  // compensar el desplazamiento que agregan los presets (slide, etc.)
  const st = clipState(c, store.time - c.start);
  const offs = { x: st.x - base.x, y: st.y - base.y };
  let moved = false;
  canvas.setPointerCapture(e.pointerId);
  const move = (ev) => {
    const q = toProject(ev);
    if (!moved) {
      checkpoint();
      moved = true;
    }
    let nx = base.x + (q.x - p.x);
    let ny = base.y + (q.y - p.y);
    // imán al centro del cuadro
    const P = store.project;
    const th = 12 / viewScale;
    if (store.snapping) {
      if (Math.abs(nx + offs.x - P.width / 2) < th) nx = P.width / 2 - offs.x;
      if (Math.abs(ny + offs.y - P.height / 2) < th) ny = P.height / 2 - offs.y;
    }
    setAnimatable(c, 'x', lt, Math.round(nx));
    setAnimatable(c, 'y', lt, Math.round(ny));
    changed('inspector');
  };
  const up = () => {
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    if (moved) changed();
  };
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
});

canvas.addEventListener(
  'wheel',
  (e) => {
    const c = store.selection && getClip(store.selection);
    if (!c || c.type === 'audio' || !e.altKey) return;
    e.preventDefault();
    checkpoint();
    const lt = Math.min(c.duration, Math.max(0, store.time - c.start));
    setAnimatable(c, 'scale', lt, Math.max(0.01, propAt(c, 'scale', lt) * (e.deltaY < 0 ? 1.05 : 1 / 1.05)));
    changed('inspector');
  },
  { passive: false },
);

// ---------- Cortar / duplicar / borrar ----------
function splitClip(c, t) {
  const lt = t - c.start;
  if (lt <= MIN_CLIP || lt >= c.duration - MIN_CLIP) return null;
  const b = structuredClone(c);
  b.id = uid('c');
  b.start = t;
  b.duration = c.duration - lt;
  if (c.in != null) b.in = c.in + lt;
  b.keyframes = {};
  for (const prop of Object.keys(c.keyframes || {})) {
    const v = propAt(c, prop, lt);
    const list = c.keyframes[prop];
    b.keyframes[prop] = list.filter((k) => k.t > lt).map((k) => ({ ...k, t: k.t - lt }));
    c.keyframes[prop] = list.filter((k) => k.t < lt);
    setKeyframe(c, prop, lt, v);
    setKeyframe(b, prop, 0, v);
  }
  c.duration = lt;
  c.animOut = { ...c.animOut, type: 'none' };
  b.animIn = { ...b.animIn, type: 'none' };
  if (c.fadeOut != null) c.fadeOut = 0;
  if (b.fadeIn != null) b.fadeIn = 0;
  store.project.clips.push(b);
  return b;
}

function splitAtPlayhead() {
  const t = store.time;
  const sel = store.selection && getClip(store.selection);
  const targets = sel ? [sel] : store.project.clips.filter((c) => t > c.start && t < c.start + c.duration);
  if (!targets.length) return toast('No hay clips en el playhead para cortar');
  checkpoint();
  let last = null;
  for (const c of targets) last = splitClip(c, t) || last;
  if (!last) return toast('Mové el playhead dentro del clip para cortarlo');
  changed();
  if (sel) select(last.id);
}
on('split', splitAtPlayhead);

function deleteSelected() {
  if (!store.selection) return;
  checkpoint();
  deleteClip(store.selection);
  changed();
  emit('selection');
}

function duplicateSelected() {
  if (!store.selection) return;
  checkpoint();
  const copy = duplicateClip(store.selection);
  changed();
  if (copy) select(copy.id);
}

// ---------- Teclado ----------
window.addEventListener('keydown', (e) => {
  const tag = e.target.tagName;
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') {
    if (typing) return;
    e.preventDefault();
    e.shiftKey ? redo() : undo();
    return;
  }
  if (mod && e.key.toLowerCase() === 'y') {
    if (typing) return;
    e.preventDefault();
    redo();
    return;
  }
  if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveProjectFile();
    return;
  }
  if (typing) return;
  const frame = 1 / store.project.fps;
  switch (e.key) {
    case ' ':
      e.preventDefault();
      togglePlay();
      break;
    case 's':
    case 'S':
      if (!mod) splitAtPlayhead();
      break;
    case 'Delete':
    case 'Backspace':
      e.preventDefault();
      deleteSelected();
      break;
    case 'd':
    case 'D':
      if (mod) {
        e.preventDefault();
        duplicateSelected();
      }
      break;
    case 'ArrowLeft':
      e.preventDefault();
      seek(store.time - (e.shiftKey ? 1 : frame));
      break;
    case 'ArrowRight':
      e.preventDefault();
      seek(store.time + (e.shiftKey ? 1 : frame));
      break;
    case 'Home':
      seek(0);
      break;
    case 'End':
      seek(projectDuration());
      break;
    case 'k':
    case 'K': {
      const c = store.selection && getClip(store.selection);
      if (!c || c.type === 'audio') break;
      const lt = Math.min(c.duration, Math.max(0, store.time - c.start));
      checkpoint();
      setKeyframe(c, 'x', lt, propAt(c, 'x', lt));
      setKeyframe(c, 'y', lt, propAt(c, 'y', lt));
      changed();
      toast('Keyframe de posición agregado');
      break;
    }
    case 'Escape':
      select(null);
      break;
  }
});

// ---------- Barra superior y transporte ----------
$('#btnPlay').onclick = togglePlay;
$('#btnStart').onclick = () => seek(0);
$('#btnEnd').onclick = () => seek(projectDuration());
$('#btnPrevFrame').onclick = () => seek(store.time - 1 / store.project.fps);
$('#btnNextFrame').onclick = () => seek(store.time + 1 / store.project.fps);
$('#btnUndo').onclick = undo;
$('#btnRedo').onclick = redo;
$('#projectName').addEventListener('input', (e) => {
  store.project.name = e.target.value;
  scheduleSave();
});

const fmtQuick = $('#fmtQuick');
for (const [k, f] of Object.entries(FORMATS)) fmtQuick.add(new Option(k, k));
fmtQuick.title = 'Formato: 16:9, 9:16, 1:1 o 4:5';
fmtQuick.addEventListener('change', () => {
  const P = store.project;
  const f = FORMATS[fmtQuick.value];
  checkpoint();
  const sx = f.width / P.width;
  const sy = f.height / P.height;
  for (const c of P.clips) {
    c.x *= sx;
    c.y *= sy;
    for (const kf of c.keyframes?.x || []) kf.v *= sx;
    for (const kf of c.keyframes?.y || []) kf.v *= sy;
  }
  Object.assign(P, { format: fmtQuick.value, width: f.width, height: f.height });
  fitPreview();
  changed();
});

$('#btnSnapshot').onclick = () => {
  const c = document.createElement('canvas');
  c.width = store.project.width;
  c.height = store.project.height;
  renderFrame(c.getContext('2d'), store.time);
  c.toBlob((b) => download(b, `${safeName(store.project.name)}-${formatTime(store.time).replace(/[:.]/g, '-')}.png`));
};

// ---------- Pestañas ----------
document.querySelectorAll('.tabs button').forEach((b) =>
  b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x === b));
    document.querySelectorAll('.tab-body').forEach((s) => (s.hidden = s.dataset.body !== b.dataset.tab));
  }),
);

// ---------- Biblioteca de medios ----------
async function importFiles(files) {
  let ok = 0;
  for (const f of files) {
    try {
      toast(`Importando ${f.name}…`, 10000);
      await importFile(f);
      ok++;
    } catch (err) {
      toast(err.message, 5000);
      console.error(err);
      return;
    }
  }
  if (ok) toast(`${ok} archivo(s) importado(s)`);
}

$('#fileImport').addEventListener('change', (e) => {
  importFiles([...e.target.files]);
  e.target.value = '';
});

window.addEventListener('dragover', (e) => {
  if (e.dataTransfer.types.includes('Files')) {
    e.preventDefault();
    document.body.classList.add('dragging');
  }
});
window.addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) document.body.classList.remove('dragging');
});
window.addEventListener('drop', (e) => {
  document.body.classList.remove('dragging');
  if (!e.dataTransfer.files.length) return;
  e.preventDefault();
  importFiles([...e.dataTransfer.files]);
});

function renderAssets() {
  const grid = $('#assetGrid');
  const assets = [...store.assets.values()];
  grid.innerHTML = assets
    .map((a) => {
      const icon = a.kind === 'audio' ? '♪' : a.kind === 'video' ? '▶' : '▣';
      const media = a.thumb ? `<img src="${a.thumb}" alt="">` : `<div class="a-ico">${icon}</div>`;
      const dur = a.kind !== 'image' ? `<span class="a-dur">${formatTime(a.duration).slice(0, 5)}</span>` : '';
      return `<div class="asset" draggable="true" data-asset="${a.id}" title="${a.name.replace(/"/g, '&quot;')}">
        ${media}${dur}
        <div class="a-btns"><button data-act="add" title="Agregar en el playhead">+</button><button data-act="del" title="Eliminar de la biblioteca">✕</button></div>
        <div class="a-meta">${a.name.replace(/</g, '&lt;')}</div>
      </div>`;
    })
    .join('');
}
on('assets', renderAssets);

$('#assetGrid').addEventListener('dragstart', (e) => {
  const el = e.target.closest('.asset');
  if (!el) return;
  e.dataTransfer.setData('application/x-asset', el.dataset.asset);
  e.dataTransfer.effectAllowed = 'copy';
});
$('#assetGrid').addEventListener('click', async (e) => {
  const el = e.target.closest('.asset');
  if (!el) return;
  const id = el.dataset.asset;
  const act = e.target.closest('button')?.dataset.act;
  if (act === 'del') {
    const used = store.project.clips.filter((c) => c.assetId === id).length;
    if (!confirm(used ? `Este archivo se usa en ${used} clip(s). ¿Eliminarlo igual?` : '¿Eliminar este archivo de la biblioteca?'))
      return;
    if (used) {
      checkpoint();
      store.project.clips = store.project.clips.filter((c) => c.assetId !== id);
      changed();
      emit('selection');
    }
    await deleteAsset(id);
  } else if (act === 'add') addAssetClip(id);
});
$('#assetGrid').addEventListener('dblclick', (e) => {
  const el = e.target.closest('.asset');
  if (el) addAssetClip(el.dataset.asset);
});

// ---------- Plantillas de motion ----------
function renderTemplates() {
  const tpl = TEMPLATES.map(
    (t) => `<button class="tpl" data-tpl="${t.id}"><b>${t.name}</b><small>${t.desc}</small></button>`,
  ).join('');
  const fx = EFFECTS.map(
    (f) => `<button class="tpl effect" data-fx="${f.id}"><b>${f.name}</b><small>${f.desc}</small></button>`,
  ).join('');
  $('#tplGrid').innerHTML = `${tpl}<p class="tpl-title">Efectos sobre el clip seleccionado</p>${fx}`;
}
$('#tplGrid').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.tpl) {
    insertTemplate(b.dataset.tpl);
    toast('Plantilla insertada: editala en el panel derecho');
  } else if (b.dataset.fx) {
    if (!store.selection) return toast('Primero seleccioná un clip');
    if (applyEffect(b.dataset.fx, store.selection)) toast('Efecto aplicado');
  }
});

// ---------- Elementos básicos ----------
$('.el-grid').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const { width: W, height: H } = store.project;
  const U = Math.min(W, H);
  const presets = {
    text: () => makeClip('text', { text: 'Tu texto', weight: 600, size: Math.round(U * 0.05) }),
    heading: () =>
      makeClip('text', { text: 'TÍTULO', font: 'Bebas Neue', weight: 400, size: Math.round(U * 0.15), animIn: { type: 'slideUp', duration: 0.5 } }),
    rect: () => makeClip('shape', { shape: 'rect', radius: U * 0.02 }),
    circle: () => makeClip('shape', { shape: 'ellipse', w: U * 0.25, h: U * 0.25, fill: '#ff3d81' }),
    line: () => makeClip('shape', { shape: 'rect', w: W * 0.4, h: Math.max(4, U * 0.006), fill: '#ffffff' }),
    frame: () =>
      makeClip('shape', { shape: 'rect', w: W * 0.9, h: H * 0.9, fill: 'transparent', strokeColor: '#ffffff', strokeWidth: U * 0.008, radius: U * 0.02 }),
  };
  const make = presets[b.dataset.el];
  if (!make) return;
  checkpoint();
  const c = placeClip(make());
  if (c.type === 'text') loadFont(c);
  changed();
  select(c.id);
});

// ---------- Subtítulos ----------
const subStyle = $('#subStyle');
for (const [k, s] of Object.entries(SUB_STYLES)) subStyle.add(new Option(s.label, k));
$('#subFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (f) $('#subText').value = await f.text();
  e.target.value = '';
});
$('#subAdd').addEventListener('click', () => {
  const cues = parseSubtitles($('#subText').value);
  if (!cues.length) return toast('No encontré subtítulos válidos (formato SRT o VTT)');
  const n = addSubtitles(cues, {
    style: subStyle.value,
    position: Number($('#subPos').value),
    size: Number($('#subSize').value),
  });
  toast(`${n} subtítulos agregados`);
});

// ---------- Línea de tiempo: barra de herramientas ----------
$('.tl-toolbar').addEventListener('click', (e) => {
  const act = e.target.closest('[data-tl]')?.dataset.tl;
  if (act === 'split') splitAtPlayhead();
  if (act === 'dup') duplicateSelected();
  if (act === 'del') deleteSelected();
  if (act === 'addV' || act === 'addA') {
    checkpoint();
    addTrack(act === 'addV' ? 'visual' : 'audio');
    changed();
  }
  if (act === 'fit') zoomToFit();
});
$('[data-tl="snap"]').addEventListener('change', (e) => (store.snapping = e.target.checked));

// Divisor para cambiar el alto de la línea de tiempo
$('#splitter').addEventListener('pointerdown', (e) => {
  const startY = e.clientY;
  const startH = $('#timeline').getBoundingClientRect().height;
  const el = e.target;
  el.setPointerCapture(e.pointerId);
  const move = (ev) => {
    const h = Math.min(window.innerHeight - 220, Math.max(140, startH - (ev.clientY - startY)));
    document.documentElement.style.setProperty('--tl-h', `${h}px`);
  };
  const up = () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
});

// ---------- Exportar ----------
const dlg = $('#exportDialog');
let exportAbort = null;
$('#btnExport').onclick = () => {
  pause();
  const P = store.project;
  const mime = pickMime();
  const fmt = mime === null ? 'no disponible' : mime.includes('mp4') ? 'MP4' : 'WebM';
  $('#exportInfo').textContent = `${P.width}×${P.height} · ${P.fps} fps · ${formatTime(projectDuration())} · formato ${fmt}`;
  $('#exportStatus').textContent = '';
  $('#exportDownload').hidden = true;
  dlg.querySelector('.progress').hidden = true;
  $('#exportStart').disabled = false;
  dlg.showModal();
};
$('#exportStart').addEventListener('click', async (e) => {
  e.preventDefault();
  if (exportAbort) return;
  exportAbort = new AbortController();
  $('#exportStart').disabled = true;
  $('#exportDownload').hidden = true;
  dlg.querySelector('.progress').hidden = false;
  $('#exportBar').style.width = '0%';
  $('#exportStatus').textContent = 'Renderizando…';
  try {
    const res = await exportVideo({
      bitrate: Number($('#exportQuality').value),
      signal: exportAbort.signal,
      onProgress: (p, frameCanvas) => {
        $('#exportBar').style.width = `${(p * 100).toFixed(1)}%`;
        $('#exportStatus').textContent = `Renderizando… ${Math.round(p * 100)}%`;
        ctx.drawImage(frameCanvas, 0, 0, canvas.width, canvas.height);
      },
    });
    if (res) {
      const name = `${safeName(store.project.name)}.${res.ext}`;
      const link = $('#exportDownload');
      if (link.href) URL.revokeObjectURL(link.href);
      link.href = URL.createObjectURL(res.blob);
      link.download = name;
      link.hidden = false;
      $('#exportBar').style.width = '100%';
      $('#exportStatus').textContent = `¡Listo! ${name} · ${(res.blob.size / 1e6).toFixed(1)} MB`;
    } else $('#exportStatus').textContent = 'Exportación cancelada';
  } catch (err) {
    console.error(err);
    $('#exportStatus').textContent = `Error: ${err.message}`;
  } finally {
    exportAbort = null;
    $('#exportStart').disabled = false;
  }
});
$('#exportCancel').addEventListener('click', () => exportAbort?.abort());
dlg.addEventListener('close', () => exportAbort?.abort());

// ---------- Proyecto: nuevo / abrir / guardar / autoguardado ----------
function loadProject(p) {
  if (!p || !Array.isArray(p.tracks) || !Array.isArray(p.clips)) throw new Error('Archivo de proyecto inválido');
  pause();
  const f = FORMATS[p.format] || FORMATS['16:9'];
  p.width ||= f.width;
  p.height ||= f.height;
  p.fps ||= 30;
  p.background ||= '#000000';
  store.project = p;
  // completar con valores por defecto los campos que falten (útil para proyectos generados a mano)
  p.tracks = p.tracks.map((t) => ({ hidden: false, muted: false, name: t.type, ...t }));
  p.clips = p.clips.map((c) => {
    const full = deepMerge(makeClip(c.type), structuredClone(c));
    for (const list of Object.values(full.keyframes || {})) list.sort((a, b) => a.t - b.t);
    return full;
  });
  store.selection = null;
  resetHistory();
  setTime(0);
  $('#projectName').value = p.name || '';
  fmtQuick.value = p.format || '16:9';
  fitPreview();
  for (const c of p.clips) if (c.type === 'text') loadFont(c);
  changed();
  emit('selection');
  setTimeout(zoomToFit, 0);
  const missing = p.clips.filter((c) => c.assetId && !store.assets.has(c.assetId)).length;
  if (missing) toast(`Faltan ${missing} archivo(s) en este navegador: importalos de nuevo y reemplazá los clips en rojo`, 6000);
}

$('#btnNew').onclick = () => {
  if (store.project.clips.length && !confirm('¿Empezar un proyecto nuevo? El actual se reemplaza (guardalo antes si lo necesitás).'))
    return;
  loadProject(newProject(store.project.format));
};

function saveProjectFile() {
  const blob = new Blob([JSON.stringify(store.project, null, 2)], { type: 'application/json' });
  download(blob, `${safeName(store.project.name)}.motion.json`);
  toast('Proyecto descargado (los archivos de video quedan en este navegador)');
}
$('#btnSave').onclick = saveProjectFile;
$('#btnOpen').onclick = () => $('#fileOpen').click();
$('#fileOpen').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    loadProject(JSON.parse(await f.text()));
    toast('Proyecto abierto');
  } catch (err) {
    toast(err.message);
  }
});

let saveTimer;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => kvSet('project', JSON.stringify(store.project)).catch(console.warn), 400);
}

// API para automatizar desde la consola (o desde Claude con un navegador).
window.motionStudio = {
  store,
  loadProject,
  insertTemplate,
  addSubtitles: (srt, opts) => addSubtitles(parseSubtitles(srt), opts),
  play,
  pause,
  seek,
  exportVideo,
};

// ---------- Arranque ----------
async function boot() {
  renderTemplates();
  initTimeline($('#timeline'));
  initInspector($('#inspector'));
  fmtQuick.value = store.project.format;
  $('#projectName').value = store.project.name;
  try {
    await loadAssets();
    const saved = await kvGet('project');
    if (saved) loadProject(JSON.parse(saved));
  } catch (err) {
    console.warn('No se pudo restaurar el proyecto', err);
  }
  Promise.all(FONTS.flatMap((f) => [`400 40px "${f}"`, `800 40px "${f}"`].map((s) => document.fonts.load(s).catch(() => {})))).then(
    () => emit('frame'),
  );
  document.fonts.ready.then(() => emit('frame'));
  fitPreview();
  if (!store.project.clips.length) setZoom(60);
  changed();
  requestAnimationFrame(loop);
}
boot();
