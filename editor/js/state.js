// Estado central del editor: proyecto, selección, tiempo, historial y eventos.

export const uid = (p = 'c') => `${p}_${Math.random().toString(36).slice(2, 10)}`;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const clamp01 = (v) => clamp(v, 0, 1);

export const FORMATS = {
  '16:9': { width: 1920, height: 1080, label: '16:9 Horizontal (YouTube)' },
  '9:16': { width: 1080, height: 1920, label: '9:16 Vertical (Reels / TikTok / Shorts)' },
  '1:1': { width: 1080, height: 1080, label: '1:1 Cuadrado' },
  '4:5': { width: 1080, height: 1350, label: '4:5 Retrato (Feed)' },
};

export const MIN_CLIP = 1 / 30;

export function newProject(format = '16:9') {
  const f = FORMATS[format] || FORMATS['16:9'];
  return {
    version: 1,
    name: 'Proyecto sin título',
    format,
    width: f.width,
    height: f.height,
    fps: 30,
    background: '#000000',
    tracks: [
      { id: uid('t'), type: 'visual', name: 'Video 2', hidden: false, muted: false },
      { id: uid('t'), type: 'visual', name: 'Video 1', hidden: false, muted: false },
      { id: uid('t'), type: 'audio', name: 'Audio 1', hidden: false, muted: false },
    ],
    clips: [],
  };
}

export const store = {
  project: newProject(),
  assets: new Map(), // id -> { id, name, kind, url, duration, width, height, thumb }
  selection: null, // id del clip seleccionado
  time: 0,
  playing: false,
  zoom: 60, // píxeles por segundo en la línea de tiempo
  snapping: true,
};

// ---------- Eventos ----------
const listeners = {};
export function on(ev, fn) {
  (listeners[ev] ||= []).push(fn);
}
export function emit(ev, data) {
  for (const fn of listeners[ev] || []) fn(data);
}

// ---------- Historial (deshacer / rehacer) ----------
const past = [];
const future = [];
export function checkpoint() {
  past.push(JSON.stringify(store.project));
  if (past.length > 150) past.shift();
  future.length = 0;
}
export function undo() {
  if (!past.length) return;
  future.push(JSON.stringify(store.project));
  store.project = JSON.parse(past.pop());
  afterHistory();
}
export function redo() {
  if (!future.length) return;
  past.push(JSON.stringify(store.project));
  store.project = JSON.parse(future.pop());
  afterHistory();
}
export function resetHistory() {
  past.length = 0;
  future.length = 0;
}
function afterHistory() {
  if (store.selection && !getClip(store.selection)) store.selection = null;
  emit('project');
  emit('selection');
}

// ---------- Consultas ----------
export const getClip = (id) => store.project.clips.find((c) => c.id === id);
export const getTrack = (id) => store.project.tracks.find((t) => t.id === id);
export const trackTypeFor = (clipType) => (clipType === 'audio' ? 'audio' : 'visual');
export const isMedia = (c) => c.type === 'video' || c.type === 'audio' || c.type === 'image';

export function projectDuration() {
  let d = 0;
  for (const c of store.project.clips) d = Math.max(d, c.start + c.duration);
  return d;
}

export function setTime(t) {
  store.time = Math.max(0, t);
  emit('time');
}

export function select(id) {
  store.selection = id;
  emit('selection');
}

// Avisa que el proyecto cambió (redibuja timeline, inspector y vista previa).
export function changed(source) {
  emit('project', source);
}

// ---------- Fábrica de clips ----------
function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
export function deepMerge(target, src) {
  for (const k of Object.keys(src || {})) {
    if (isObj(src[k]) && isObj(target[k])) deepMerge(target[k], src[k]);
    else target[k] = src[k];
  }
  return target;
}

export function makeClip(type, props = {}) {
  const { width: W, height: H } = store.project;
  const base = {
    id: uid('c'),
    trackId: null,
    type,
    name: '',
    start: store.time,
    duration: 5,
    x: W / 2,
    y: H / 2,
    scale: 1,
    rotation: 0,
    opacity: 1,
    keyframes: {},
    kfEase: 'inOut',
    animIn: { type: 'none', duration: 0.5 },
    animOut: { type: 'none', duration: 0.5 },
  };
  const filters = { brightness: 100, contrast: 100, saturate: 100, blur: 0 };
  const byType = {
    video: { assetId: null, in: 0, volume: 1, fadeIn: 0, fadeOut: 0, fit: 'cover', filters },
    image: { assetId: null, fit: 'cover', filters },
    audio: { assetId: null, in: 0, volume: 1, fadeIn: 0, fadeOut: 0 },
    text: {
      text: 'Tu texto',
      font: 'Montserrat',
      size: Math.round(Math.min(W, H) * 0.08),
      weight: 800,
      italic: false,
      color: '#ffffff',
      align: 'center',
      lineHeight: 1.15,
      letterSpacing: 0,
      maxWidth: Math.round(W * 0.85),
      uppercase: false,
      stroke: { color: '#000000', width: 0 },
      shadow: { color: '#000000', opacity: 0.6, blur: 0, y: 0 },
      box: { enabled: false, color: '#000000', opacity: 1, padding: 24, radius: 16 },
      counter: { enabled: false, from: 0, to: 100, decimals: 0, prefix: '', suffix: '', sep: true },
    },
    shape: {
      shape: 'rect',
      w: Math.round(W * 0.3),
      h: Math.round(H * 0.15),
      fill: '#7c5cff',
      radius: 0,
      strokeColor: '#ffffff',
      strokeWidth: 0,
    },
  };
  return deepMerge({ ...base, ...structuredClone(byType[type]) }, props);
}

// ---------- Pistas ----------
export function addTrack(type, index) {
  const P = store.project;
  const n = P.tracks.filter((t) => t.type === type).length + 1;
  const tr = { id: uid('t'), type, name: `${type === 'audio' ? 'Audio' : 'Video'} ${n}`, hidden: false, muted: false };
  if (index == null) {
    // las pistas visuales van arriba de las de audio
    index = type === 'visual' ? 0 : P.tracks.length;
  }
  P.tracks.splice(index, 0, tr);
  return tr;
}

export function removeTrack(id) {
  const P = store.project;
  P.tracks = P.tracks.filter((t) => t.id !== id);
  P.clips = P.clips.filter((c) => c.trackId !== id);
  if (store.selection && !getClip(store.selection)) store.selection = null;
}

export function isFree(trackId, start, end, ignoreId) {
  return !store.project.clips.some(
    (c) => c.trackId === trackId && c.id !== ignoreId && c.start < end - 1e-6 && c.start + c.duration > start + 1e-6,
  );
}

// Ubica un clip en una pista libre (o crea una). Los textos/formas van arriba,
// los videos/imágenes buscan desde abajo.
export function placeClip(clip, preferredTrackId) {
  const P = store.project;
  const type = trackTypeFor(clip.type);
  const end = clip.start + clip.duration;
  const pref = preferredTrackId && getTrack(preferredTrackId);
  if (pref && pref.type === type && isFree(pref.id, clip.start, end, clip.id)) {
    clip.trackId = pref.id;
  } else {
    let candidates = P.tracks.filter((t) => t.type === type);
    if (clip.type === 'video' || clip.type === 'image') candidates = candidates.reverse();
    const free = candidates.find((t) => isFree(t.id, clip.start, end, clip.id));
    if (free) clip.trackId = free.id;
    else {
      let index;
      if (type === 'visual') {
        if (clip.type === 'video' || clip.type === 'image') {
          const firstAudio = P.tracks.findIndex((t) => t.type === 'audio');
          index = firstAudio < 0 ? P.tracks.length : firstAudio;
        } else index = 0;
      }
      clip.trackId = addTrack(type, index).id;
    }
  }
  if (!P.clips.includes(clip)) P.clips.push(clip);
  return clip;
}

// ---------- Operaciones sobre clips ----------
export function deleteClip(id) {
  store.project.clips = store.project.clips.filter((c) => c.id !== id);
  if (store.selection === id) store.selection = null;
}

export function duplicateClip(id) {
  const c = getClip(id);
  if (!c) return null;
  const copy = structuredClone(c);
  copy.id = uid('c');
  copy.start = c.start + c.duration;
  placeClip(copy, c.trackId);
  return copy;
}

export function shiftKeyframes(clip, delta) {
  for (const prop of Object.keys(clip.keyframes || {})) {
    clip.keyframes[prop] = clip.keyframes[prop].map((k) => ({ ...k, t: k.t + delta }));
  }
}
