// Archivos multimedia: importación, guardado en el navegador (IndexedDB),
// elementos <video>/<audio> por clip y mezcla de audio con Web Audio.
import { store, emit, uid, getTrack, clamp01 } from './state.js';

// ---------- IndexedDB ----------
let dbPromise;
function db() {
  return (dbPromise ||= new Promise((resolve, reject) => {
    const req = indexedDB.open('motion-studio', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('assets', { keyPath: 'id' });
      req.result.createObjectStore('kv');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}
async function run(storeName, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(storeName, mode);
    const req = fn(t.objectStore(storeName));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
export const kvGet = (key) => run('kv', 'readonly', (s) => s.get(key));
export const kvSet = (key, value) => run('kv', 'readwrite', (s) => s.put(value, key));

// ---------- Importar ----------
export function kindOf(file) {
  const t = file.type || '';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('audio/')) return 'audio';
  const ext = file.name.split('.').pop().toLowerCase();
  if (['mp4', 'webm', 'mov', 'mkv', 'm4v'].includes(ext)) return 'video';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus'].includes(ext)) return 'audio';
  return null;
}

function once(el, ok, fail = 'error', ms = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    el.addEventListener(ok, () => (clearTimeout(timer), resolve()), { once: true });
    el.addEventListener(fail, () => (clearTimeout(timer), reject(new Error('No se pudo leer el archivo'))), {
      once: true,
    });
  });
}

async function probe(url, kind) {
  if (kind === 'image') {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { width: img.naturalWidth || 1000, height: img.naturalHeight || 1000, duration: 0 };
  }
  if (kind === 'audio') {
    const a = document.createElement('audio');
    a.preload = 'metadata';
    a.src = url;
    await once(a, 'loadedmetadata');
    return { duration: a.duration, width: 0, height: 0 };
  }
  const v = document.createElement('video');
  v.preload = 'auto';
  v.muted = true;
  v.src = url;
  await once(v, 'loadedmetadata');
  const meta = { duration: v.duration, width: v.videoWidth, height: v.videoHeight };
  if (!meta.width) throw new Error('El navegador no puede decodificar este video (probá MP4 H.264)');
  try {
    v.currentTime = Math.min(0.5, meta.duration / 3);
    await once(v, 'seeked', 'error', 5000);
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = Math.round((160 * meta.height) / meta.width) || 90;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    meta.thumb = c.toDataURL('image/jpeg', 0.7);
  } catch {
    /* sin miniatura */
  }
  v.removeAttribute('src');
  v.load();
  return meta;
}

export async function importFile(file) {
  const kind = kindOf(file);
  if (!kind) throw new Error(`Formato no soportado: ${file.name}`);
  const id = uid('a');
  const url = URL.createObjectURL(file);
  let meta;
  try {
    meta = await probe(url, kind);
  } catch (err) {
    URL.revokeObjectURL(url);
    throw new Error(`${file.name}: ${err.message}`);
  }
  const record = { id, name: file.name, kind, mime: file.type, size: file.size, ...meta };
  const asset = { ...record, url };
  if (kind === 'image') asset.thumb = url;
  store.assets.set(id, asset);
  await run('assets', 'readwrite', (s) => s.put({ ...record, blob: file }));
  emit('assets');
  return asset;
}

export async function loadAssets() {
  const all = await run('assets', 'readonly', (s) => s.getAll());
  for (const rec of all || []) {
    const { blob, ...meta } = rec;
    const url = URL.createObjectURL(blob);
    store.assets.set(rec.id, { ...meta, url, thumb: meta.kind === 'image' ? url : meta.thumb });
  }
  emit('assets');
}

export async function deleteAsset(id) {
  const a = store.assets.get(id);
  if (!a) return;
  store.assets.delete(id);
  URL.revokeObjectURL(a.url);
  imageCache.delete(id);
  await run('assets', 'readwrite', (s) => s.delete(id));
  emit('assets');
}

// ---------- Imágenes ----------
const imageCache = new Map();
export function imageFor(assetId) {
  let img = imageCache.get(assetId);
  if (!img) {
    const a = store.assets.get(assetId);
    if (!a) return null;
    img = new Image();
    img.onload = () => emit('frame');
    img.src = a.url;
    imageCache.set(assetId, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}

// ---------- Audio (Web Audio) ----------
export const audio = { ctx: null, master: null, dest: null };

export function ensureAudio() {
  if (!audio.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new AC();
    audio.master = audio.ctx.createGain();
    audio.master.connect(audio.ctx.destination);
    audio.dest = audio.ctx.createMediaStreamDestination();
    audio.master.connect(audio.dest);
    for (const e of pool.values()) connectAudio(e);
  }
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  return audio;
}

function connectAudio(e) {
  if (!audio.ctx || e.gain) return;
  try {
    const src = audio.ctx.createMediaElementSource(e.el);
    const g = audio.ctx.createGain();
    src.connect(g);
    g.connect(audio.master);
    e.gain = g;
    e.el.volume = 1;
  } catch (err) {
    console.warn('No se pudo conectar el audio', err);
  }
}

function setVolume(e, v) {
  if (e.gain) e.gain.gain.value = v;
  else e.el.volume = clamp01(v);
}

// ---------- Elementos por clip ----------
const pool = new Map(); // clipId -> { el, assetId, gain }

export function elementFor(clip) {
  const asset = store.assets.get(clip.assetId);
  if (!asset) return null;
  let e = pool.get(clip.id);
  if (e && e.assetId !== clip.assetId) {
    dispose(e);
    pool.delete(clip.id);
    e = null;
  }
  if (!e) {
    const el = document.createElement(clip.type === 'audio' ? 'audio' : 'video');
    el.preload = 'auto';
    el.playsInline = true;
    el.src = asset.url;
    el.addEventListener('seeked', () => emit('frame'));
    el.addEventListener('loadeddata', () => emit('frame'));
    e = { el, assetId: clip.assetId, gain: null };
    pool.set(clip.id, e);
    connectAudio(e);
  }
  return e;
}

function dispose(e) {
  e.el.pause();
  e.el.removeAttribute('src');
  e.el.load();
  try {
    e.gain?.disconnect();
  } catch {
    /* ya desconectado */
  }
}

// Sincroniza todos los <video>/<audio> con el tiempo del proyecto.
export function syncMedia(t, playing) {
  const P = store.project;
  const live = new Set();
  const halfFrame = 1 / (P.fps * 2);
  for (const c of P.clips) {
    if (c.type !== 'video' && c.type !== 'audio') continue;
    const e = elementFor(c);
    if (!e) continue;
    live.add(c.id);
    const el = e.el;
    const tr = getTrack(c.trackId);
    const lt = t - c.start;
    const active = lt >= 0 && lt < c.duration;
    const target = c.in + lt;
    if (active) {
      let env = 1;
      if (c.fadeIn > 0) env = Math.min(env, lt / c.fadeIn);
      if (c.fadeOut > 0) env = Math.min(env, (c.duration - lt) / c.fadeOut);
      setVolume(e, tr?.muted ? 0 : c.volume * clamp01(env));
      if (playing) {
        if (el.paused) {
          if (Math.abs(el.currentTime - target) > 0.05) el.currentTime = target;
          el.play().catch(() => {});
        } else if (Math.abs(el.currentTime - target) > 0.25) {
          el.currentTime = target;
        }
      } else {
        if (!el.paused) el.pause();
        if (!el.seeking && Math.abs(el.currentTime - target) > halfFrame) el.currentTime = target;
      }
    } else {
      if (!el.paused) el.pause();
      // dejar listo el primer cuadro de los clips que están por empezar
      if (lt < 0 && lt > -2 && !el.seeking && Math.abs(el.currentTime - c.in) > 0.05) el.currentTime = c.in;
    }
  }
  for (const [id, e] of pool) {
    if (!live.has(id)) {
      dispose(e);
      pool.delete(id);
    }
  }
}

export function pauseAll() {
  for (const e of pool.values()) e.el.pause();
}

// Espera a que los videos del instante t tengan su cuadro listo.
export async function waitReady(t, ms = 4000) {
  const end = performance.now() + ms;
  syncMedia(t, false);
  while (performance.now() < end) {
    let ready = true;
    for (const c of store.project.clips) {
      if (c.type !== 'video') continue;
      const e = pool.get(c.id);
      if (!e) continue;
      const lt = t - c.start;
      if (lt >= 0 && lt < c.duration && (e.el.seeking || e.el.readyState < 2)) ready = false;
    }
    if (ready) return;
    await new Promise((r) => setTimeout(r, 30));
    syncMedia(t, false);
  }
}
