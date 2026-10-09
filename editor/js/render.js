// Dibuja un cuadro del proyecto en un canvas 2D.
import { store, clamp01 } from './state.js';
import { propAt, presetMods, EASES } from './anim.js';
import { elementFor, imageFor } from './media.js';

const measure = document.createElement('canvas').getContext('2d');

export function renderFrame(ctx, t, scale = 1) {
  const P = store.project;
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = P.background;
  ctx.fillRect(0, 0, P.width, P.height);
  for (const c of visibleClipsAt(t)) drawClip(ctx, c, t - c.start);
  ctx.restore();
}

// Clips visibles en el tiempo t, de abajo hacia arriba (orden de dibujo).
export function visibleClipsAt(t) {
  const P = store.project;
  const out = [];
  for (let i = P.tracks.length - 1; i >= 0; i--) {
    const tr = P.tracks[i];
    if (tr.type !== 'visual' || tr.hidden) continue;
    const clips = P.clips
      .filter((c) => c.trackId === tr.id && t >= c.start && t < c.start + c.duration)
      .sort((a, b) => a.start - b.start);
    out.push(...clips);
  }
  return out;
}

// Estado transformado del clip (keyframes + presets).
export function clipState(c, lt) {
  const P = store.project;
  const m = presetMods(c, lt, P.width, P.height);
  let opacity = propAt(c, 'opacity', lt) * m.opacity;
  if (c.type !== 'text') {
    opacity *= m.reveal;
    if (m.words != null) opacity *= m.words;
  }
  return {
    x: propAt(c, 'x', lt) + m.dx,
    y: propAt(c, 'y', lt) + m.dy,
    scale: propAt(c, 'scale', lt) * m.scale,
    rotation: propAt(c, 'rotation', lt) + m.rot,
    opacity: clamp01(opacity),
    m,
  };
}

function mediaSize(c, a) {
  const P = store.project;
  if (!a || !a.width) return null;
  let s = 1;
  if (c.fit === 'cover') s = Math.max(P.width / a.width, P.height / a.height);
  else if (c.fit === 'contain') s = Math.min(P.width / a.width, P.height / a.height);
  return { w: a.width * s, h: a.height * s };
}

// Tamaño del contenido sin transformar (centrado en el origen).
export function contentSize(c, lt) {
  switch (c.type) {
    case 'video':
    case 'image':
      return mediaSize(c, store.assets.get(c.assetId));
    case 'shape':
      return { w: Math.max(0, propAt(c, 'w', lt)), h: Math.max(0, propAt(c, 'h', lt)) };
    case 'text': {
      const L = layoutText(c, lt);
      const pad = c.box?.enabled ? c.box.padding : 0;
      return { w: L.w + pad * 2, h: L.h + pad * 2, layout: L };
    }
  }
  return null;
}

function drawClip(ctx, c, lt) {
  const s = clipState(c, lt);
  if (s.opacity <= 0.001 || s.scale === 0) return;
  const size = contentSize(c, lt);
  if (!size) return;
  ctx.save();
  ctx.globalAlpha = s.opacity;
  ctx.translate(s.x, s.y);
  ctx.rotate((s.rotation * Math.PI) / 180);
  ctx.scale(s.scale, s.scale);

  let filter = '';
  if (c.filters) {
    const f = c.filters;
    if (f.brightness !== 100) filter += `brightness(${f.brightness}%) `;
    if (f.contrast !== 100) filter += `contrast(${f.contrast}%) `;
    if (f.saturate !== 100) filter += `saturate(${f.saturate}%) `;
    if (f.blur > 0) filter += `blur(${f.blur}px) `;
  }
  if (s.m.blur > 0.1) filter += `blur(${s.m.blur.toFixed(1)}px)`;
  if (filter) ctx.filter = filter.trim();

  if (s.m.wipe) clipWipe(ctx, s.m.wipe, size);

  switch (c.type) {
    case 'video': {
      const el = elementFor(c)?.el;
      if (el && el.readyState >= 2) ctx.drawImage(el, -size.w / 2, -size.h / 2, size.w, size.h);
      break;
    }
    case 'image': {
      const img = imageFor(c.assetId);
      if (img) ctx.drawImage(img, -size.w / 2, -size.h / 2, size.w, size.h);
      break;
    }
    case 'shape':
      drawShape(ctx, c, size);
      break;
    case 'text':
      drawText(ctx, c, size.layout, s.m);
      break;
  }
  ctx.restore();
}

function clipWipe(ctx, { dir, p }, { w, h }) {
  const big = 1e5;
  const padW = w * 0.15;
  const padH = h * 0.3;
  const W = w + padW * 2;
  const H = h + padH * 2;
  ctx.beginPath();
  if (dir === 'wipeRight') ctx.rect(-W / 2, -big, W * p, big * 2);
  else if (dir === 'wipeLeft') ctx.rect(W / 2 - W * p, -big, W * p, big * 2);
  else if (dir === 'wipeUp') ctx.rect(-big, H / 2 - H * p, big * 2, H * p);
  else ctx.rect(-big, -H / 2, big * 2, H * p);
  ctx.clip();
}

function drawShape(ctx, c, { w, h }) {
  ctx.beginPath();
  if (c.shape === 'ellipse') ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  else ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(c.radius || 0, w / 2, h / 2));
  ctx.fillStyle = c.fill;
  ctx.fill();
  if (c.strokeWidth > 0) {
    ctx.lineWidth = c.strokeWidth;
    ctx.strokeStyle = c.strokeColor;
    ctx.stroke();
  }
}

// ---------- Texto ----------
function fontString(c) {
  return `${c.italic ? 'italic ' : ''}${c.weight} ${c.size}px "${c.font}", sans-serif`;
}

function formatNumber(v, decimals, sep) {
  const fixed = v.toFixed(decimals);
  if (!sep) return fixed;
  const [int, dec] = fixed.split('.');
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec ? `${withSep},${dec}` : withSep;
}

export function textValue(c, lt) {
  let s = c.text ?? '';
  const k = c.counter;
  if (k?.enabled) {
    const p = EASES.out(clamp01(lt / Math.max(0.01, c.duration * 0.8)));
    const v = Number(k.from) + (Number(k.to) - Number(k.from)) * p;
    s = `${k.prefix || ''}${formatNumber(v, Number(k.decimals) || 0, k.sep)}${k.suffix || ''}`;
  }
  return c.uppercase ? s.toUpperCase() : s;
}

export function layoutText(c, lt) {
  measure.font = fontString(c);
  measure.letterSpacing = `${c.letterSpacing || 0}px`;
  const space = measure.measureText(' ').width;
  const lines = [];
  for (const para of textValue(c, lt).split('\n')) {
    const words = para.split(/ +/).filter(Boolean);
    let cur = [];
    let curW = 0;
    for (const text of words) {
      const w = measure.measureText(text).width;
      const add = cur.length ? space + w : w;
      if (c.maxWidth > 0 && cur.length && curW + add > c.maxWidth) {
        lines.push({ words: cur, w: curW });
        cur = [{ text, w }];
        curW = w;
      } else {
        cur.push({ text, w });
        curW += add;
      }
    }
    lines.push({ words: cur, w: curW });
  }
  const lineH = c.size * c.lineHeight;
  return {
    lines,
    lineH,
    space,
    w: Math.max(1, ...lines.map((l) => l.w)),
    h: Math.max(lineH, lines.length * lineH),
  };
}

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function drawText(ctx, c, L, m) {
  if (c.box?.enabled) {
    const p = c.box.padding;
    ctx.save();
    ctx.globalAlpha *= c.box.opacity ?? 1;
    ctx.fillStyle = c.box.color;
    ctx.beginPath();
    ctx.roundRect(-L.w / 2 - p, -L.h / 2 - p, L.w + p * 2, L.h + p * 2, c.box.radius);
    ctx.fill();
    ctx.restore();
  }
  ctx.font = fontString(c);
  ctx.letterSpacing = `${c.letterSpacing || 0}px`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const sh = c.shadow;
  const hasShadow = sh && (sh.blur > 0 || sh.y !== 0);
  const hasStroke = c.stroke?.width > 0;

  const totalChars = L.lines.reduce((n, l) => n + l.words.reduce((a, w) => a + w.text.length + 1, 0), 0);
  let charsLeft = m.reveal < 1 ? Math.floor(totalChars * m.reveal) : Infinity;
  const totalWords = L.lines.reduce((n, l) => n + l.words.length, 0) || 1;
  let k = 0;

  const paint = (str, x, y) => {
    if (hasShadow) {
      ctx.shadowColor = hexA(sh.color, sh.opacity ?? 0.6);
      ctx.shadowBlur = sh.blur;
      ctx.shadowOffsetY = sh.y;
    }
    if (hasStroke) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = c.stroke.width * 2;
      ctx.strokeStyle = c.stroke.color;
      ctx.strokeText(str, x, y);
      ctx.shadowColor = 'transparent';
    }
    ctx.fillStyle = c.color;
    ctx.fillText(str, x, y);
    ctx.shadowColor = 'transparent';
  };

  L.lines.forEach((line, i) => {
    const y = -L.h / 2 + L.lineH * (i + 0.5);
    let x = c.align === 'left' ? -L.w / 2 : c.align === 'right' ? L.w / 2 - line.w : -line.w / 2;
    for (const word of line.words) {
      if (charsLeft <= 0) return;
      let str = word.text;
      if (charsLeft < str.length) str = str.slice(0, charsLeft);
      charsLeft -= word.text.length + 1;
      if (m.words != null) {
        const wp = clamp01(m.words * totalWords * 1.15 - k);
        if (wp > 0) {
          ctx.save();
          ctx.globalAlpha *= Math.min(1, wp * 2);
          ctx.translate(x + word.w / 2, y);
          const sc = Math.max(0, 0.6 + 0.4 * EASES.back(wp));
          ctx.scale(sc, sc);
          paint(str, -word.w / 2, 0);
          ctx.restore();
        }
      } else {
        paint(str, x, y);
      }
      k++;
      x += word.w + L.space;
    }
  });
}

// ---------- Selección y detección de clics en la vista previa ----------
export function drawSelection(ctx, c, t, viewScale) {
  const lt = t - c.start;
  if (lt < 0 || lt >= c.duration || c.type === 'audio') return;
  const size = contentSize(c, lt);
  if (!size) return;
  const s = clipState(c, lt);
  ctx.save();
  ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);
  ctx.translate(s.x, s.y);
  ctx.rotate((s.rotation * Math.PI) / 180);
  const sc = s.scale || 0.0001;
  ctx.scale(sc, sc);
  ctx.lineWidth = 1.5 / (viewScale * Math.abs(sc));
  ctx.setLineDash([6 / (viewScale * Math.abs(sc)), 4 / (viewScale * Math.abs(sc))]);
  ctx.strokeStyle = '#8b7bff';
  ctx.strokeRect(-size.w / 2, -size.h / 2, size.w, size.h);
  ctx.restore();
}

export function hitTest(px, py, t) {
  const clips = visibleClipsAt(t).reverse(); // de arriba hacia abajo
  for (const c of clips) {
    const lt = t - c.start;
    const size = contentSize(c, lt);
    if (!size) continue;
    const s = clipState(c, lt);
    if (s.opacity <= 0.01) continue;
    const r = (-s.rotation * Math.PI) / 180;
    const dx = px - s.x;
    const dy = py - s.y;
    const lx = (dx * Math.cos(r) - dy * Math.sin(r)) / (s.scale || 1);
    const ly = (dx * Math.sin(r) + dy * Math.cos(r)) / (s.scale || 1);
    if (Math.abs(lx) <= size.w / 2 && Math.abs(ly) <= size.h / 2) return c;
  }
  return null;
}
