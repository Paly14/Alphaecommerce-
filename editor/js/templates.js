// Plantillas de motion graphics. Cada una devuelve clips listos para insertar
// en el tiempo actual; se adaptan al formato (16:9, 9:16, 1:1...).
import { store, makeClip, placeClip, checkpoint, changed, select, getClip, isFree, addTrack } from './state.js';
import { setKeyframe } from './anim.js';

const ACCENT = '#7c5cff';
const ACCENT2 = '#ff3d81';

function ctx() {
  const { width: W, height: H } = store.project;
  return { W, H, U: Math.min(W, H), t: store.time, vertical: H > W };
}

export const TEMPLATES = [
  {
    id: 'title',
    name: 'Título impactante',
    desc: 'Texto grande con pop',
    build: ({ W, H, U, t }) => [
      makeClip('text', {
        name: 'Título',
        start: t,
        duration: 3,
        text: 'TU TÍTULO AQUÍ',
        font: 'Anton',
        weight: 400,
        size: Math.round(U * 0.14),
        maxWidth: W * 0.9,
        shadow: { blur: 30, y: 8, opacity: 0.5 },
        animIn: { type: 'pop', duration: 0.6 },
        animOut: { type: 'fade', duration: 0.4 },
        y: H * 0.5,
      }),
    ],
  },
  {
    id: 'lowerthird',
    name: 'Zócalo (lower third)',
    desc: 'Nombre y cargo con barra',
    build: ({ W, H, U, t, vertical }) => {
      const bw = vertical ? W * 0.8 : W * 0.36;
      const bh = U * 0.13;
      const x = vertical ? W / 2 : W * 0.05 + bw / 2;
      const y = vertical ? H * 0.72 : H * 0.8;
      return [
        makeClip('shape', {
          name: 'Zócalo barra',
          start: t,
          duration: 5,
          x,
          y,
          w: bw,
          h: bh,
          radius: U * 0.015,
          fill: '#111118',
          animIn: { type: 'wipeRight', duration: 0.5 },
          animOut: { type: 'wipeLeft', duration: 0.4 },
        }),
        makeClip('shape', {
          name: 'Zócalo acento',
          start: t,
          duration: 5,
          x: x - bw / 2 + U * 0.006,
          y,
          w: U * 0.012,
          h: bh,
          fill: ACCENT,
          animIn: { type: 'fade', duration: 0.2 },
          animOut: { type: 'fade', duration: 0.3 },
        }),
        makeClip('text', {
          name: 'Zócalo nombre',
          start: t + 0.25,
          duration: 4.6,
          text: 'Nombre Apellido',
          size: Math.round(bh * 0.36),
          weight: 800,
          x,
          y: y - bh * 0.17,
          maxWidth: 0,
          animIn: { type: 'slideRight', duration: 0.45 },
          animOut: { type: 'fade', duration: 0.3 },
        }),
        makeClip('text', {
          name: 'Zócalo cargo',
          start: t + 0.4,
          duration: 4.45,
          text: 'Cargo / empresa',
          size: Math.round(bh * 0.24),
          weight: 500,
          color: '#b9b4ff',
          x,
          y: y + bh * 0.2,
          maxWidth: 0,
          animIn: { type: 'slideRight', duration: 0.45 },
          animOut: { type: 'fade', duration: 0.3 },
        }),
      ];
    },
  },
  {
    id: 'cta',
    name: 'Llamado a la acción',
    desc: 'Botón que late',
    build: ({ W, H, U, t }) => {
      const dur = 4;
      const text = makeClip('text', {
        name: 'CTA',
        start: t,
        duration: dur,
        text: '¡COMPRÁ AHORA!',
        font: 'Montserrat',
        weight: 900,
        size: Math.round(U * 0.06),
        maxWidth: 0,
        y: H * 0.78,
        box: { enabled: true, color: ACCENT2, padding: U * 0.03, radius: U * 0.05 },
        shadow: { blur: 24, y: 6, opacity: 0.4 },
        animIn: { type: 'pop', duration: 0.5 },
        animOut: { type: 'zoomOut', duration: 0.3 },
        kfEase: 'inOut',
      });
      for (let i = 0; i <= 6; i++) setKeyframe(text, 'scale', 0.5 + i * 0.5, i % 2 ? 1.08 : 1);
      return [text];
    },
  },
  {
    id: 'counter',
    name: 'Contador animado',
    desc: 'Número que sube',
    build: ({ W, H, U, t }) => [
      makeClip('text', {
        name: 'Contador',
        start: t,
        duration: 3.5,
        text: '0',
        font: 'Montserrat',
        weight: 900,
        size: Math.round(U * 0.16),
        maxWidth: 0,
        y: H * 0.46,
        counter: { enabled: true, from: 0, to: 10000, decimals: 0, prefix: '+', suffix: '', sep: true },
        animIn: { type: 'zoomIn', duration: 0.4 },
        animOut: { type: 'fade', duration: 0.3 },
      }),
      makeClip('text', {
        name: 'Contador etiqueta',
        start: t + 0.3,
        duration: 3.2,
        text: 'clientes felices',
        weight: 600,
        size: Math.round(U * 0.045),
        color: '#cfcfe6',
        y: H * 0.46 + U * 0.13,
        animIn: { type: 'slideUp', duration: 0.5 },
        animOut: { type: 'fade', duration: 0.3 },
      }),
    ],
  },
  {
    id: 'progress',
    name: 'Barra de progreso',
    desc: 'Se llena de izquierda a derecha',
    build: ({ W, H, U, t }) => {
      const w = W * 0.7;
      const h = U * 0.03;
      return [
        makeClip('shape', {
          name: 'Barra fondo',
          start: t,
          duration: 4,
          w,
          h,
          radius: h / 2,
          fill: '#2a2a3a',
          y: H * 0.6,
          animIn: { type: 'fade', duration: 0.3 },
          animOut: { type: 'fade', duration: 0.3 },
        }),
        makeClip('shape', {
          name: 'Barra relleno',
          start: t + 0.2,
          duration: 3.8,
          w,
          h,
          radius: h / 2,
          fill: ACCENT,
          y: H * 0.6,
          animIn: { type: 'wipeRight', duration: 2.5 },
          animOut: { type: 'fade', duration: 0.3 },
        }),
      ];
    },
  },
  {
    id: 'words',
    name: 'Palabra por palabra',
    desc: 'Estilo subtítulo dinámico',
    build: ({ W, H, U, t }) => [
      makeClip('text', {
        name: 'Frase dinámica',
        start: t,
        duration: 3.5,
        text: 'Cada palabra aparece con ritmo',
        weight: 900,
        size: Math.round(U * 0.075),
        uppercase: true,
        stroke: { color: '#000000', width: U * 0.006 },
        animIn: { type: 'words', duration: 1.4 },
        animOut: { type: 'fade', duration: 0.3 },
      }),
    ],
  },
  {
    id: 'typewriter',
    name: 'Máquina de escribir',
    desc: 'Letra por letra',
    build: ({ W, H, U, t }) => [
      makeClip('text', {
        name: 'Máquina de escribir',
        start: t,
        duration: 4,
        text: 'Escribiendo en vivo...',
        font: 'Roboto Mono',
        weight: 500,
        size: Math.round(U * 0.06),
        color: '#7dffb0',
        animIn: { type: 'typewriter', duration: 1.8 },
        animOut: { type: 'fade', duration: 0.3 },
      }),
    ],
  },
  {
    id: 'quote',
    name: 'Cita / testimonio',
    desc: 'Frase destacada con autor',
    build: ({ W, H, U, t }) => [
      makeClip('text', {
        name: 'Cita',
        start: t,
        duration: 5,
        text: '“Esto cambió por completo mis resultados”',
        font: 'Playfair Display',
        weight: 700,
        italic: true,
        size: Math.round(U * 0.065),
        maxWidth: W * 0.75,
        y: H * 0.45,
        animIn: { type: 'blur', duration: 0.8 },
        animOut: { type: 'fade', duration: 0.4 },
      }),
      makeClip('text', {
        name: 'Autor',
        start: t + 0.6,
        duration: 4.4,
        text: '— Nombre del cliente',
        weight: 600,
        size: Math.round(U * 0.035),
        color: '#b9b4ff',
        y: H * 0.45 + U * 0.16,
        animIn: { type: 'slideUp', duration: 0.5 },
        animOut: { type: 'fade', duration: 0.4 },
      }),
    ],
  },
  {
    id: 'badge',
    name: 'Etiqueta / sticker',
    desc: 'Texto con caja que gira',
    build: ({ W, H, U, t }) => [
      makeClip('text', {
        name: 'Etiqueta',
        start: t,
        duration: 3,
        text: '¡NUEVO!',
        weight: 900,
        size: Math.round(U * 0.05),
        maxWidth: 0,
        rotation: -8,
        x: W * 0.78,
        y: H * 0.2,
        box: { enabled: true, color: '#ffd23f', padding: U * 0.02, radius: U * 0.012 },
        color: '#111111',
        animIn: { type: 'rotate', duration: 0.5 },
        animOut: { type: 'pop', duration: 0.3 },
      }),
    ],
  },
  {
    id: 'flash',
    name: 'Transición flash',
    desc: 'Destello blanco',
    build: ({ W, H, t }) => {
      const c = makeClip('shape', {
        name: 'Flash',
        start: Math.max(0, t - 0.25),
        duration: 0.5,
        w: W,
        h: H,
        fill: '#ffffff',
        opacity: 0,
        kfEase: 'out',
      });
      setKeyframe(c, 'opacity', 0, 0);
      setKeyframe(c, 'opacity', 0.25, 1);
      setKeyframe(c, 'opacity', 0.5, 0);
      return [c];
    },
  },
  {
    id: 'swipe',
    name: 'Transición barrido',
    desc: 'Bloque de color que cruza',
    build: ({ W, H, t }) => {
      const c = makeClip('shape', {
        name: 'Barrido',
        start: Math.max(0, t - 0.4),
        duration: 0.8,
        w: W * 1.2,
        h: H,
        fill: ACCENT,
        kfEase: 'inOut',
      });
      setKeyframe(c, 'x', 0, -W * 0.6);
      setKeyframe(c, 'x', 0.8, W * 1.6);
      return [c];
    },
  },
  {
    id: 'bgcolor',
    name: 'Fondo de color',
    desc: 'Rectángulo a pantalla completa',
    build: ({ W, H, t }) => [
      makeClip('shape', { name: 'Fondo', start: t, duration: 5, w: W, h: H, fill: '#14121f' }),
    ],
  },
];

// Efectos que se aplican sobre el clip seleccionado.
export const EFFECTS = [
  {
    id: 'kenburns',
    name: 'Ken Burns',
    desc: 'Zoom lento + desplazamiento',
    apply: (c) => {
      const { width: W } = store.project;
      delete c.keyframes.scale;
      delete c.keyframes.x;
      setKeyframe(c, 'scale', 0, c.scale);
      setKeyframe(c, 'scale', c.duration, c.scale * 1.15);
      setKeyframe(c, 'x', 0, c.x);
      setKeyframe(c, 'x', c.duration, c.x - W * 0.03);
      c.kfEase = 'linear';
    },
  },
  {
    id: 'punch',
    name: 'Zoom punch',
    desc: 'Acercamiento rápido en el playhead',
    apply: (c) => {
      const lt = Math.max(0, Math.min(c.duration, store.time - c.start));
      const base = c.scale;
      setKeyframe(c, 'scale', Math.max(0, lt - 0.01), base);
      setKeyframe(c, 'scale', Math.min(c.duration, lt + 0.15), base * 1.2);
      setKeyframe(c, 'scale', Math.min(c.duration, lt + 1.2), base * 1.2);
      setKeyframe(c, 'scale', Math.min(c.duration, lt + 1.5), base);
      c.kfEase = 'out';
    },
  },
  {
    id: 'shake',
    name: 'Sacudida',
    desc: 'Temblor corto en el playhead',
    apply: (c) => {
      const lt = Math.max(0, Math.min(c.duration, store.time - c.start));
      const U = Math.min(store.project.width, store.project.height) * 0.012;
      const offs = [0, U, -U, U * 0.7, -U * 0.7, U * 0.3, 0];
      offs.forEach((o, i) => setKeyframe(c, 'x', Math.min(c.duration, lt + i * 0.05), c.x + o));
      c.kfEase = 'linear';
    },
  },
  {
    id: 'fadeinout',
    name: 'Fundido entrada/salida',
    desc: 'Fade al comienzo y al final',
    apply: (c) => {
      c.animIn = { type: 'fade', duration: 0.5 };
      c.animOut = { type: 'fade', duration: 0.5 };
      if (c.type === 'video' || c.type === 'audio') {
        c.fadeIn = 0.5;
        c.fadeOut = 0.5;
      }
    },
  },
];

export function insertTemplate(id) {
  const tpl = TEMPLATES.find((x) => x.id === id);
  if (!tpl) return;
  checkpoint();
  const P = store.project;
  const clips = tpl.build(ctx());
  // cada elemento de la plantilla va en una pista por encima del anterior
  let prev = null;
  for (const c of clips) {
    c.name ||= tpl.name;
    if (!prev) placeClip(c);
    else {
      const prevIdx = P.tracks.findIndex((t) => t.id === prev.trackId);
      const free = P.tracks
        .slice(0, prevIdx)
        .reverse()
        .find((t) => t.type === 'visual' && isFree(t.id, c.start, c.start + c.duration));
      c.trackId = free ? free.id : addTrack('visual', prevIdx).id;
      P.clips.push(c);
    }
    prev = c;
  }
  changed();
  select(prev.id);
}

export function applyEffect(id, clipId) {
  const fx = EFFECTS.find((x) => x.id === id);
  const c = getClip(clipId);
  if (!fx || !c) return false;
  checkpoint();
  fx.apply(c);
  changed();
  return true;
}
