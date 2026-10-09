// Motor de animación: curvas (easing), keyframes y presets de entrada/salida.
import { clamp01 } from './state.js';

export const EASES = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  elastic: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) + 1,
  bounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

export const EASE_LABELS = [
  ['inOut', 'Suave (entrada y salida)'],
  ['out', 'Desacelera'],
  ['in', 'Acelera'],
  ['linear', 'Lineal'],
  ['back', 'Rebote leve'],
  ['elastic', 'Elástico'],
  ['bounce', 'Rebote'],
];

// Propiedades que se pueden animar con keyframes.
export const ANIMATABLE = ['x', 'y', 'scale', 'rotation', 'opacity', 'w', 'h'];

// Tiempos de keyframe son relativos al inicio del clip.
export function propAt(clip, prop, lt) {
  const kfs = clip.keyframes?.[prop];
  if (!kfs || !kfs.length) return clip[prop];
  if (lt <= kfs[0].t) return kfs[0].v;
  const last = kfs[kfs.length - 1];
  if (lt >= last.t) return last.v;
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (lt >= a.t && lt <= b.t) {
      const p = (lt - a.t) / (b.t - a.t || 1);
      const e = (EASES[clip.kfEase] || EASES.inOut)(p);
      return a.v + (b.v - a.v) * e;
    }
  }
  return last.v;
}

const KF_EPS = 1 / 120;
export function keyframeAt(clip, prop, lt) {
  return (clip.keyframes?.[prop] || []).find((k) => Math.abs(k.t - lt) < KF_EPS);
}
export function setKeyframe(clip, prop, lt, v) {
  clip.keyframes ||= {};
  const list = (clip.keyframes[prop] ||= []);
  const existing = list.find((k) => Math.abs(k.t - lt) < KF_EPS);
  if (existing) existing.v = v;
  else list.push({ t: lt, v });
  list.sort((a, b) => a.t - b.t);
}
export function removeKeyframe(clip, prop, lt) {
  const list = clip.keyframes?.[prop];
  if (!list) return;
  clip.keyframes[prop] = list.filter((k) => Math.abs(k.t - lt) >= KF_EPS);
  if (!clip.keyframes[prop].length) delete clip.keyframes[prop];
}
export function hasKeyframes(clip, prop) {
  return !!clip.keyframes?.[prop]?.length;
}

// Asigna un valor: si la propiedad está animada, crea/actualiza el keyframe en el tiempo actual.
export function setAnimatable(clip, prop, lt, v) {
  if (hasKeyframes(clip, prop)) setKeyframe(clip, prop, Math.max(0, Math.min(clip.duration, lt)), v);
  else clip[prop] = v;
}

// ---------- Presets de entrada / salida ----------
export const ANIM_IN = [
  ['none', 'Ninguna'],
  ['fade', 'Aparecer (fade)'],
  ['slideUp', 'Deslizar hacia arriba'],
  ['slideDown', 'Deslizar hacia abajo'],
  ['slideLeft', 'Deslizar a la izquierda'],
  ['slideRight', 'Deslizar a la derecha'],
  ['pop', 'Pop con rebote'],
  ['zoomIn', 'Zoom in'],
  ['zoomOut', 'Zoom out'],
  ['blur', 'Desenfoque'],
  ['rotate', 'Giro'],
  ['wipeRight', 'Barrido →'],
  ['wipeLeft', 'Barrido ←'],
  ['wipeUp', 'Barrido ↑'],
  ['wipeDown', 'Barrido ↓'],
  ['typewriter', 'Máquina de escribir (texto)'],
  ['words', 'Palabra por palabra (texto)'],
];
export const ANIM_OUT = ANIM_IN.filter(([k]) => k !== 'typewriter' && k !== 'words');

function applyPreset(m, type, p, isIn, W, H) {
  // p: 0 = oculto, 1 = totalmente visible
  const e = EASES.out(p);
  const inv = 1 - e;
  const dirIn = isIn ? 1 : -1;
  switch (type) {
    case 'fade':
      m.opacity *= p;
      break;
    case 'slideUp':
      m.dy += dirIn * inv * H * 0.08;
      m.opacity *= p;
      break;
    case 'slideDown':
      m.dy -= dirIn * inv * H * 0.08;
      m.opacity *= p;
      break;
    case 'slideLeft':
      m.dx += dirIn * inv * W * 0.08;
      m.opacity *= p;
      break;
    case 'slideRight':
      m.dx -= dirIn * inv * W * 0.08;
      m.opacity *= p;
      break;
    case 'pop':
      m.scale *= isIn ? Math.max(0, EASES.back(p)) : e;
      m.opacity *= Math.min(1, p * 3);
      break;
    case 'zoomIn':
      m.scale *= isIn ? 0.6 + 0.4 * e : 1 + 0.4 * inv;
      m.opacity *= p;
      break;
    case 'zoomOut':
      m.scale *= isIn ? 1.4 - 0.4 * e : 0.6 + 0.4 * e;
      m.opacity *= p;
      break;
    case 'blur':
      m.blur += inv * 24;
      m.opacity *= p;
      break;
    case 'rotate':
      m.rot += inv * (isIn ? -90 : 90);
      m.scale *= 0.5 + 0.5 * e;
      m.opacity *= p;
      break;
    case 'wipeRight':
    case 'wipeLeft':
    case 'wipeUp':
    case 'wipeDown':
      m.wipe = { dir: type, p: EASES.inOut(p) };
      break;
    case 'typewriter':
      m.reveal = Math.min(m.reveal, p);
      break;
    case 'words':
      m.words = p;
      break;
  }
}

export function presetMods(clip, lt, W, H) {
  const m = { dx: 0, dy: 0, scale: 1, opacity: 1, blur: 0, rot: 0, wipe: null, reveal: 1, words: null };
  const dur = clip.duration;
  const ai = clip.animIn;
  const ao = clip.animOut;
  const di = ai && ai.type !== 'none' ? Math.min(ai.duration, dur) : 0;
  const dO = ao && ao.type !== 'none' ? Math.min(ao.duration, dur) : 0;
  if (di > 0 && lt < di) applyPreset(m, ai.type, clamp01(lt / di), true, W, H);
  if (dO > 0 && lt > dur - dO) applyPreset(m, ao.type, clamp01((dur - lt) / dO), false, W, H);
  return m;
}
