// Línea de tiempo: pistas, clips, mover/recortar con imán, playhead y zoom.
import {
  store,
  on,
  emit,
  getClip,
  getTrack,
  checkpoint,
  changed,
  select,
  setTime,
  projectDuration,
  trackTypeFor,
  removeTrack,
  makeClip,
  placeClip,
  MIN_CLIP,
} from './state.js';

const HEAD_W = 148;
const STEPS = [1 / 30, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];

let scroll, inner, playhead;

export function formatTime(t, fps = store.project.fps) {
  t = Math.max(0, t);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const f = Math.floor((t % 1) * fps + 1e-6);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(f).padStart(2, '0')}`;
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export function clipLabel(c) {
  if (c.name) return c.name;
  if (c.type === 'text') return c.text?.split('\n')[0] || 'Texto';
  if (c.type === 'shape') return c.shape === 'ellipse' ? 'Círculo' : 'Rectángulo';
  return store.assets.get(c.assetId)?.name || 'Archivo faltante';
}

export function initTimeline(root) {
  scroll = root.querySelector('.tl-scroll');
  inner = document.createElement('div');
  inner.className = 'tl-inner';
  scroll.appendChild(inner);

  on('project', render);
  on('assets', render);
  on('selection', markSelection);
  on('time', updatePlayhead);
  new ResizeObserver(render).observe(scroll);

  inner.addEventListener('pointerdown', onPointerDown);
  inner.addEventListener('dblclick', onDblClick);
  inner.addEventListener('click', onHeadClick);
  inner.addEventListener('dragover', (e) => {
    if (e.dataTransfer.types.includes('application/x-asset')) e.preventDefault();
  });
  inner.addEventListener('drop', onDrop);
  scroll.addEventListener(
    'wheel',
    (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = scroll.getBoundingClientRect();
      const tAtCursor = (e.clientX - rect.left + scroll.scrollLeft - HEAD_W) / store.zoom;
      setZoom(store.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
      scroll.scrollLeft = tAtCursor * store.zoom + HEAD_W - (e.clientX - rect.left);
    },
    { passive: false },
  );

  const zoomInput = root.querySelector('[data-tl="zoom"]');
  zoomInput?.addEventListener('input', () => setZoom(Math.pow(2, Number(zoomInput.value))));
  on('zoom', () => zoomInput && (zoomInput.value = Math.log2(store.zoom)));
  render();
}

export function setZoom(z) {
  store.zoom = Math.min(600, Math.max(4, z));
  emit('zoom');
  render();
}

export function zoomToFit() {
  const d = Math.max(5, projectDuration());
  setZoom((scroll.clientWidth - HEAD_W - 40) / d);
}

function render() {
  if (!inner) return;
  const P = store.project;
  const z = store.zoom;
  const visibleSec = (scroll.clientWidth - HEAD_W) / z;
  const dur = Math.max(projectDuration() + 10, 30, visibleSec);
  inner.style.width = `${HEAD_W + dur * z}px`;

  const step = STEPS.find((s) => s * z >= 70) || 600;
  let ticks = '';
  for (let i = 0; i * step <= dur; i++) {
    const t = i * step;
    const label = step < 1 ? formatTime(t) : formatTime(t).slice(0, 5);
    ticks += `<div class="tick" style="left:${t * z}px"><span>${label}</span></div>`;
    if (step * z >= 120)
      for (let k = 1; k < 4; k++) ticks += `<div class="tick minor" style="left:${(t + (step * k) / 4) * z}px"></div>`;
  }

  const rows = P.tracks
    .map((tr) => {
      const clips = P.clips
        .filter((c) => c.trackId === tr.id)
        .map((c) => clipHTML(c, z))
        .join('');
      const icon = tr.type === 'audio' ? '♪' : '▣';
      return `<div class="tl-row ${tr.type}${tr.hidden ? ' is-hidden' : ''}${tr.muted ? ' is-muted' : ''}" data-track="${tr.id}" data-type="${tr.type}">
        <div class="tl-head">
          <span class="tl-name" title="Doble clic para renombrar"><b>${icon}</b> ${esc(tr.name)}</span>
          <span class="tl-btns">
            ${tr.type === 'visual' ? `<button data-act="hide" title="Ocultar pista" class="${tr.hidden ? 'off' : ''}">◉</button>` : ''}
            <button data-act="mute" title="Silenciar pista" class="${tr.muted ? 'off' : ''}">${tr.muted ? '🔇' : '🔊'}</button>
            <button data-act="del" title="Eliminar pista">✕</button>
          </span>
        </div>
        <div class="tl-lane">${clips}</div>
      </div>`;
    })
    .join('');

  inner.innerHTML = `
    <div class="tl-ruler-row"><div class="tl-corner"></div><div class="tl-ruler">${ticks}</div></div>
    ${rows}
    <div class="tl-playhead"><div class="tl-playhead-cap"></div></div>`;
  playhead = inner.querySelector('.tl-playhead');
  updatePlayhead();
  markSelection();
}

function clipHTML(c, z) {
  const a = store.assets.get(c.assetId);
  const missing = (c.type === 'video' || c.type === 'image' || c.type === 'audio') && !a;
  const thumb = (c.type === 'video' || c.type === 'image') && a?.thumb ? `style="--thumb:url('${a.thumb}')"` : '';
  const kfTimes = new Set();
  for (const list of Object.values(c.keyframes || {})) for (const k of list) kfTimes.add(k.t.toFixed(3));
  const kfs = [...kfTimes].map((t) => `<i class="kf" style="left:${Number(t) * z}px"></i>`).join('');
  const anim = [c.animIn?.type, c.animOut?.type].some((x) => x && x !== 'none');
  return `<div class="clip type-${c.type}${missing ? ' missing' : ''}" data-clip="${c.id}"
      style="left:${c.start * z}px;width:${Math.max(2, c.duration * z)}px">
      <div class="clip-thumb" ${thumb}></div>
      <span class="clip-label">${anim ? '✦ ' : ''}${esc(clipLabel(c))}${missing ? ' (falta archivo)' : ''}</span>
      ${kfs}
      <div class="h h-l"></div><div class="h h-r"></div>
    </div>`;
}

function markSelection() {
  if (!inner) return;
  inner.querySelectorAll('.clip.selected').forEach((el) => el.classList.remove('selected'));
  if (store.selection) inner.querySelector(`[data-clip="${store.selection}"]`)?.classList.add('selected');
}

function updatePlayhead() {
  if (!playhead) return;
  const x = HEAD_W + store.time * store.zoom;
  playhead.style.transform = `translateX(${x}px)`;
  if (store.playing) {
    const left = scroll.scrollLeft + HEAD_W;
    const right = scroll.scrollLeft + scroll.clientWidth - 40;
    if (x > right || x < left) scroll.scrollLeft = x - HEAD_W - 40;
  }
}

function timeAt(clientX) {
  return Math.max(0, (clientX - inner.getBoundingClientRect().left - HEAD_W) / store.zoom);
}

function rowAt(clientY) {
  for (const row of inner.querySelectorAll('.tl-row')) {
    const r = row.getBoundingClientRect();
    if (clientY >= r.top && clientY < r.bottom) return row;
  }
  return null;
}

function snapPoints(ignoreId) {
  const pts = [0, store.time];
  for (const c of store.project.clips) {
    if (c.id === ignoreId) continue;
    pts.push(c.start, c.start + c.duration);
  }
  return pts;
}

function snap(value, pts) {
  if (!store.snapping) return value;
  const th = 8 / store.zoom;
  let best = value;
  let bestD = th;
  for (const p of pts) {
    const d = Math.abs(p - value);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

function drag(e, onMove, onUp) {
  inner.setPointerCapture(e.pointerId);
  const move = (ev) => onMove(ev);
  const up = (ev) => {
    inner.removeEventListener('pointermove', move);
    inner.removeEventListener('pointerup', up);
    inner.removeEventListener('pointercancel', up);
    onUp?.(ev);
  };
  inner.addEventListener('pointermove', move);
  inner.addEventListener('pointerup', up);
  inner.addEventListener('pointercancel', up);
}

function onPointerDown(e) {
  if (e.button !== 0) return;
  if (e.target.closest('.tl-head, .tl-corner')) return;

  if (e.target.closest('.tl-ruler') || e.target.closest('.tl-playhead')) {
    e.preventDefault();
    setTime(timeAt(e.clientX));
    drag(e, (ev) => setTime(timeAt(ev.clientX)));
    return;
  }

  const clipEl = e.target.closest('.clip');
  if (!clipEl) {
    if (e.target.closest('.tl-lane')) {
      select(null);
      setTime(timeAt(e.clientX));
      drag(e, (ev) => setTime(timeAt(ev.clientX)));
    }
    return;
  }

  e.preventDefault();
  const c = getClip(clipEl.dataset.clip);
  if (!c) return;
  if (store.selection !== c.id) select(c.id);
  const mode = e.target.classList.contains('h-l') ? 'trimL' : e.target.classList.contains('h-r') ? 'trimR' : 'move';
  const orig = { start: c.start, duration: c.duration, in: c.in, trackId: c.trackId, keyframes: structuredClone(c.keyframes) };
  const asset = store.assets.get(c.assetId);
  const maxLen = asset && (c.type === 'video' || c.type === 'audio') ? asset.duration : Infinity;
  const pts = snapPoints(c.id);
  const x0 = e.clientX;
  const y0 = e.clientY;
  let moved = false;

  drag(
    e,
    (ev) => {
      if (!moved && Math.abs(ev.clientX - x0) < 3 && Math.abs(ev.clientY - y0) < 3) return;
      if (!moved) {
        checkpoint();
        moved = true;
      }
      const dx = (ev.clientX - x0) / store.zoom;
      if (mode === 'move') {
        let s = Math.max(0, orig.start + dx);
        const sStart = snap(s, pts);
        const sEnd = snap(s + c.duration, pts) - c.duration;
        s = Math.abs(sStart - s) <= Math.abs(sEnd - s) ? sStart : sEnd;
        c.start = Math.max(0, s);
        const row = rowAt(ev.clientY);
        if (row && row.dataset.type === trackTypeFor(c.type)) c.trackId = row.dataset.track;
      } else if (mode === 'trimL') {
        let s = snap(orig.start + dx, pts);
        let minS = 0;
        if (c.in != null) minS = Math.max(minS, orig.start - orig.in);
        s = Math.min(Math.max(s, minS), orig.start + orig.duration - MIN_CLIP);
        const delta = s - orig.start;
        c.start = s;
        c.duration = orig.duration - delta;
        if (c.in != null) c.in = orig.in + delta;
        c.keyframes = structuredClone(orig.keyframes);
        for (const k of Object.keys(c.keyframes)) c.keyframes[k] = c.keyframes[k].map((kf) => ({ ...kf, t: kf.t - delta }));
      } else {
        const end = snap(orig.start + orig.duration + dx, pts);
        c.duration = Math.min(Math.max(MIN_CLIP, end - c.start), maxLen - (c.in || 0));
      }
      changed('timeline');
    },
    () => {
      if (moved) changed();
    },
  );
}

function onDblClick(e) {
  const name = e.target.closest('.tl-name');
  if (!name) return;
  const tr = getTrack(name.closest('.tl-row').dataset.track);
  const v = prompt('Nombre de la pista', tr.name);
  if (v) {
    checkpoint();
    tr.name = v;
    changed();
  }
}

function onHeadClick(e) {
  const btn = e.target.closest('.tl-head button');
  if (!btn) return;
  const tr = getTrack(btn.closest('.tl-row').dataset.track);
  if (btn.dataset.act === 'del') {
    const n = store.project.clips.filter((c) => c.trackId === tr.id).length;
    if (n && !confirm(`La pista "${tr.name}" tiene ${n} clip(s). ¿Eliminarla?`)) return;
  }
  checkpoint();
  if (btn.dataset.act === 'hide') tr.hidden = !tr.hidden;
  if (btn.dataset.act === 'mute') tr.muted = !tr.muted;
  if (btn.dataset.act === 'del') {
    removeTrack(tr.id);
    emit('selection');
  }
  changed();
}

// Soltar un archivo de la biblioteca sobre una pista.
function onDrop(e) {
  const id = e.dataTransfer.getData('application/x-asset');
  if (!id) return;
  e.preventDefault();
  const row = rowAt(e.clientY);
  addAssetClip(id, timeAt(e.clientX), row?.dataset.track);
}

export function addAssetClip(assetId, start = store.time, trackId) {
  const a = store.assets.get(assetId);
  if (!a) return;
  checkpoint();
  const c = makeClip(a.kind, { assetId, name: a.name, start, duration: a.kind === 'image' ? 5 : a.duration });
  placeClip(c, trackId);
  changed();
  select(c.id);
}
