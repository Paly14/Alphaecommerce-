// Panel de propiedades del clip seleccionado (o del proyecto si no hay selección).
import {
  store,
  on,
  emit,
  getClip,
  checkpoint,
  changed,
  select,
  deleteClip,
  duplicateClip,
  projectDuration,
  FORMATS,
  clamp,
  MIN_CLIP,
} from './state.js';
import {
  propAt,
  setAnimatable,
  keyframeAt,
  setKeyframe,
  removeKeyframe,
  hasKeyframes,
  ANIM_IN,
  ANIM_OUT,
  EASE_LABELS,
} from './anim.js';
import { EFFECTS, applyEffect } from './templates.js';
import { clipLabel, formatTime } from './timeline.js';

export const FONTS = [
  'Montserrat',
  'Inter',
  'Poppins',
  'Anton',
  'Bebas Neue',
  'Oswald',
  'Playfair Display',
  'Roboto Mono',
  'Permanent Marker',
  'Lobster',
];

const TYPE_NAMES = { video: 'Video', image: 'Imagen', audio: 'Audio', text: 'Texto', shape: 'Forma' };

let root;
let fields = [];

export function initInspector(el) {
  root = el;
  on('selection', build);
  on('project', (src) => (src === 'inspector' ? refresh() : build()));
  on('assets', build);
  on('time', refresh);
  build();
}

// ---------- Construcción de campos ----------
function section(title, open = true) {
  const d = document.createElement('details');
  d.className = 'insp-section';
  d.open = open;
  d.innerHTML = `<summary>${title}</summary><div class="insp-fields"></div>`;
  root.appendChild(d);
  return d.querySelector('.insp-fields');
}

function field(parent, opt) {
  const row = document.createElement('label');
  row.className = `insp-row${opt.wide ? ' wide' : ''}`;
  row.innerHTML = `<span class="insp-label">${opt.label}</span>`;
  let input;
  if (opt.type === 'select') {
    input = document.createElement('select');
    for (const [v, l] of opt.options) input.add(new Option(l, v));
  } else if (opt.type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = 3;
  } else {
    input = document.createElement('input');
    input.type = opt.type || 'number';
    if (opt.min != null) input.min = opt.min;
    if (opt.max != null) input.max = opt.max;
    input.step = opt.step ?? (input.type === 'number' ? 'any' : '');
  }
  const ctrl = document.createElement('span');
  ctrl.className = 'insp-ctrl';
  ctrl.appendChild(input);
  row.appendChild(ctrl);

  const f = { input, opt, kfBtn: null };
  if (opt.kf) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kf-btn';
    b.title = 'Keyframe en el tiempo actual (clic derecho: quitar animación)';
    b.textContent = '◆';
    b.addEventListener('click', (e) => {
      e.preventDefault();
      opt.onKf();
    });
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      opt.onKfClear();
    });
    ctrl.appendChild(b);
    f.kfBtn = b;
  }

  let pending = false;
  input.addEventListener('focus', () => (pending = true));
  const apply = () => {
    let v;
    if (opt.type === 'checkbox') v = input.checked;
    else if (opt.type === 'number' || opt.type === 'range' || !opt.type) {
      v = parseFloat(input.value);
      if (Number.isNaN(v)) return;
    } else v = input.value;
    if (pending || opt.type === 'checkbox' || opt.type === 'select') {
      checkpoint();
      pending = false;
    }
    opt.set(opt.fromUI ? opt.fromUI(v) : v);
    changed(opt.rebuild ? undefined : 'inspector');
  };
  input.addEventListener(opt.type === 'select' || opt.type === 'checkbox' ? 'change' : 'input', apply);
  input.addEventListener('change', () => (pending = true));

  parent.appendChild(row);
  fields.push(f);
  setValue(f);
  return f;
}

function setValue(f) {
  const { input, opt } = f;
  if (document.activeElement === input && opt.type !== 'checkbox') return;
  let v = opt.get();
  if (opt.toUI) v = opt.toUI(v);
  if (opt.type === 'checkbox') input.checked = !!v;
  else if (typeof v === 'number') input.value = String(Math.round(v * 1000) / 1000);
  else input.value = v ?? '';
  if (f.kfBtn) f.kfBtn.className = `kf-btn ${opt.kfState()}`;
}

function refresh() {
  for (const f of fields) setValue(f);
  const timeEl = root?.querySelector('[data-insp="time"]');
  if (timeEl) timeEl.textContent = formatTime(store.time);
}

function buttons(parent, list) {
  const wrap = document.createElement('div');
  wrap.className = 'insp-buttons';
  for (const [label, fn, cls] of list) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn small ${cls || ''}`;
    b.textContent = label;
    b.addEventListener('click', fn);
    wrap.appendChild(b);
  }
  parent.appendChild(wrap);
}

// ---------- Construcción del panel ----------
function build() {
  if (!root) return;
  root.innerHTML = '';
  fields = [];
  const c = store.selection && getClip(store.selection);
  if (c) buildClip(c);
  else buildProject();
}

function buildProject() {
  const P = store.project;
  root.insertAdjacentHTML(
    'beforeend',
    `<div class="insp-title"><span class="chip">Proyecto</span><small>Seleccioná un clip para editarlo</small></div>`,
  );
  const s = section('Proyecto');
  field(s, { label: 'Nombre', type: 'text', wide: true, get: () => P.name, set: (v) => ((P.name = v), emit('name')) });
  field(s, {
    label: 'Formato',
    type: 'select',
    wide: true,
    options: Object.entries(FORMATS).map(([k, f]) => [k, `${f.label} · ${f.width}×${f.height}`]),
    get: () => P.format,
    set: (v) => changeFormat(v),
    rebuild: true,
  });
  field(s, { label: 'Fondo', type: 'color', get: () => P.background, set: (v) => (P.background = v) });
  field(s, {
    label: 'FPS',
    type: 'select',
    options: [24, 25, 30, 60].map((n) => [String(n), `${n} fps`]),
    get: () => String(P.fps),
    set: (v) => (P.fps = Number(v)),
  });
  s.insertAdjacentHTML(
    'beforeend',
    `<p class="insp-note">Duración: <b>${formatTime(projectDuration())}</b> · ${P.clips.length} clips · ${P.tracks.length} pistas</p>`,
  );

  const k = section('Atajos de teclado', false);
  k.innerHTML = `<ul class="shortcuts">
    <li><kbd>Espacio</kbd> Reproducir / pausar</li>
    <li><kbd>S</kbd> Cortar clip en el playhead</li>
    <li><kbd>Supr</kbd> Borrar clip</li>
    <li><kbd>Ctrl</kbd>+<kbd>D</kbd> Duplicar</li>
    <li><kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> Deshacer / rehacer</li>
    <li><kbd>←</kbd> <kbd>→</kbd> Cuadro anterior / siguiente (con <kbd>Shift</kbd>: 1 s)</li>
    <li><kbd>Inicio</kbd> / <kbd>Fin</kbd> Ir al principio / final</li>
    <li><kbd>K</kbd> Keyframe de posición en el playhead</li>
    <li><kbd>Ctrl</kbd>+rueda en la línea de tiempo: zoom</li>
  </ul>`;
}

function changeFormat(fmt) {
  const P = store.project;
  const f = FORMATS[fmt];
  const sx = f.width / P.width;
  const sy = f.height / P.height;
  for (const c of P.clips) {
    c.x *= sx;
    c.y *= sy;
    for (const kf of c.keyframes?.x || []) kf.v *= sx;
    for (const kf of c.keyframes?.y || []) kf.v *= sy;
  }
  P.format = fmt;
  P.width = f.width;
  P.height = f.height;
  emit('format');
}

function buildClip(c) {
  const lt = () => clamp(store.time - c.start, 0, c.duration);
  const visual = c.type !== 'audio';

  root.insertAdjacentHTML(
    'beforeend',
    `<div class="insp-title"><span class="chip type-${c.type}">${TYPE_NAMES[c.type]}</span>
      <small>Tiempo: <b data-insp="time">${formatTime(store.time)}</b></small></div>`,
  );
  const head = section('Clip');
  field(head, {
    label: 'Nombre',
    type: 'text',
    wide: true,
    get: () => c.name || clipLabel(c),
    set: (v) => (c.name = v),
  });
  buttons(head, [
    ['Duplicar', () => dupe(c)],
    ['Cortar en playhead', () => emit('split')],
    ['Eliminar', () => remove(c), 'danger'],
  ]);

  // Tiempo
  const t = section('Tiempo');
  field(t, { label: 'Inicio (s)', min: 0, step: 0.01, get: () => c.start, set: (v) => (c.start = Math.max(0, v)) });
  field(t, {
    label: 'Duración (s)',
    min: MIN_CLIP,
    step: 0.01,
    get: () => c.duration,
    set: (v) => {
      const a = store.assets.get(c.assetId);
      const max = a && c.in != null ? a.duration - c.in : Infinity;
      c.duration = clamp(v, MIN_CLIP, max);
    },
  });
  if (c.in != null) {
    field(t, {
      label: 'Recorte inicial (s)',
      min: 0,
      step: 0.01,
      get: () => c.in,
      set: (v) => {
        const a = store.assets.get(c.assetId);
        c.in = clamp(v, 0, (a?.duration ?? Infinity) - MIN_CLIP);
        if (a) c.duration = Math.min(c.duration, a.duration - c.in);
      },
    });
  }

  // Transformación (animable)
  if (visual) {
    const tr = section('Transformación y keyframes');
    const kfField = (label, prop, extra = {}) =>
      field(tr, {
        label,
        step: extra.step ?? 1,
        kf: true,
        get: () => propAt(c, prop, lt()),
        set: (v) => setAnimatable(c, prop, lt(), v),
        kfState: () => (keyframeAt(c, prop, lt()) ? 'on' : hasKeyframes(c, prop) ? 'has' : ''),
        onKf: () => {
          checkpoint();
          if (keyframeAt(c, prop, lt())) removeKeyframe(c, prop, lt());
          else setKeyframe(c, prop, lt(), propAt(c, prop, lt()));
          changed();
        },
        onKfClear: () => {
          if (!hasKeyframes(c, prop)) return;
          checkpoint();
          c[prop] = propAt(c, prop, lt());
          delete c.keyframes[prop];
          changed();
        },
        ...extra,
      });
    kfField('Posición X', 'x');
    kfField('Posición Y', 'y');
    kfField('Escala %', 'scale', { toUI: (v) => v * 100, fromUI: (v) => v / 100 });
    kfField('Rotación °', 'rotation');
    kfField('Opacidad %', 'opacity', {
      min: 0,
      max: 100,
      toUI: (v) => v * 100,
      fromUI: (v) => clamp(v / 100, 0, 1),
    });
    if (c.type === 'shape') {
      kfField('Ancho', 'w', { min: 0 });
      kfField('Alto', 'h', { min: 0 });
    }
    field(tr, {
      label: 'Curva',
      type: 'select',
      options: EASE_LABELS,
      get: () => c.kfEase || 'inOut',
      set: (v) => (c.kfEase = v),
    });
    buttons(tr, [
      [
        'Centrar',
        () => {
          checkpoint();
          setAnimatable(c, 'x', lt(), store.project.width / 2);
          setAnimatable(c, 'y', lt(), store.project.height / 2);
          changed();
        },
      ],
      [
        'Quitar todos los keyframes',
        () => {
          checkpoint();
          for (const p of Object.keys(c.keyframes || {})) c[p] = propAt(c, p, lt());
          c.keyframes = {};
          changed();
        },
      ],
    ]);
    tr.insertAdjacentHTML(
      'beforeend',
      `<p class="insp-note">◆ agrega un keyframe en el tiempo actual. Con keyframes activos, cambiar un valor crea o actualiza el keyframe. Clic derecho en ◆ quita la animación de esa propiedad.</p>`,
    );
  }

  if (c.type === 'text') buildText(c);
  if (c.type === 'shape') buildShape(c);

  if (c.type === 'video' || c.type === 'image') {
    const m = section('Imagen');
    field(m, {
      label: 'Ajuste',
      type: 'select',
      options: [
        ['cover', 'Llenar (recorta)'],
        ['contain', 'Encajar (sin recorte)'],
        ['none', 'Tamaño original'],
      ],
      get: () => c.fit,
      set: (v) => (c.fit = v),
    });
    const f = c.filters;
    field(m, { label: 'Brillo %', type: 'range', min: 0, max: 200, get: () => f.brightness, set: (v) => (f.brightness = v) });
    field(m, { label: 'Contraste %', type: 'range', min: 0, max: 200, get: () => f.contrast, set: (v) => (f.contrast = v) });
    field(m, { label: 'Saturación %', type: 'range', min: 0, max: 300, get: () => f.saturate, set: (v) => (f.saturate = v) });
    field(m, { label: 'Desenfoque', type: 'range', min: 0, max: 40, get: () => f.blur, set: (v) => (f.blur = v) });
  }

  if (c.type === 'video' || c.type === 'audio') {
    const a = section('Audio');
    field(a, {
      label: 'Volumen %',
      type: 'range',
      min: 0,
      max: 200,
      get: () => c.volume * 100,
      set: (v) => (c.volume = v / 100),
    });
    field(a, { label: 'Fade in (s)', min: 0, step: 0.1, get: () => c.fadeIn, set: (v) => (c.fadeIn = Math.max(0, v)) });
    field(a, { label: 'Fade out (s)', min: 0, step: 0.1, get: () => c.fadeOut, set: (v) => (c.fadeOut = Math.max(0, v)) });
  }

  if (visual) {
    const an = section('Animación de entrada / salida');
    field(an, {
      label: 'Entrada',
      type: 'select',
      options: ANIM_IN,
      get: () => c.animIn.type,
      set: (v) => (c.animIn.type = v),
    });
    field(an, {
      label: 'Duración (s)',
      min: 0.05,
      step: 0.05,
      get: () => c.animIn.duration,
      set: (v) => (c.animIn.duration = Math.max(0.05, v)),
    });
    field(an, {
      label: 'Salida',
      type: 'select',
      options: ANIM_OUT,
      get: () => c.animOut.type,
      set: (v) => (c.animOut.type = v),
    });
    field(an, {
      label: 'Duración (s)',
      min: 0.05,
      step: 0.05,
      get: () => c.animOut.duration,
      set: (v) => (c.animOut.duration = Math.max(0.05, v)),
    });
  }

  const fx = section('Efectos rápidos', visual);
  const available = EFFECTS.filter((e) => visual || e.id === 'fadeinout');
  buttons(
    fx,
    available.map((e) => [e.name, () => applyEffect(e.id, c.id)]),
  );
}

function buildText(c) {
  const s = section('Texto');
  field(s, { label: 'Texto', type: 'textarea', wide: true, get: () => c.text, set: (v) => (c.text = v) });
  field(s, {
    label: 'Fuente',
    type: 'select',
    options: FONTS.map((f) => [f, f]),
    get: () => c.font,
    set: (v) => {
      c.font = v;
      loadFont(c);
    },
  });
  field(s, { label: 'Tamaño', min: 4, get: () => c.size, set: (v) => (c.size = Math.max(4, v)) });
  field(s, {
    label: 'Peso',
    type: 'select',
    options: [300, 400, 500, 600, 700, 800, 900].map((w) => [String(w), String(w)]),
    get: () => String(c.weight),
    set: (v) => {
      c.weight = Number(v);
      loadFont(c);
    },
  });
  field(s, { label: 'Color', type: 'color', get: () => c.color, set: (v) => (c.color = v) });
  field(s, {
    label: 'Alineación',
    type: 'select',
    options: [
      ['left', 'Izquierda'],
      ['center', 'Centro'],
      ['right', 'Derecha'],
    ],
    get: () => c.align,
    set: (v) => (c.align = v),
  });
  field(s, { label: 'Cursiva', type: 'checkbox', get: () => c.italic, set: (v) => ((c.italic = v), loadFont(c)) });
  field(s, { label: 'MAYÚSCULAS', type: 'checkbox', get: () => c.uppercase, set: (v) => (c.uppercase = v) });
  field(s, { label: 'Ancho máx. (0 = libre)', min: 0, get: () => c.maxWidth, set: (v) => (c.maxWidth = Math.max(0, v)) });
  field(s, { label: 'Interlineado', min: 0.5, step: 0.05, get: () => c.lineHeight, set: (v) => (c.lineHeight = v) });
  field(s, { label: 'Espaciado letras', step: 0.5, get: () => c.letterSpacing, set: (v) => (c.letterSpacing = v) });

  const st = section('Borde y sombra', false);
  field(st, { label: 'Borde color', type: 'color', get: () => c.stroke.color, set: (v) => (c.stroke.color = v) });
  field(st, { label: 'Borde grosor', min: 0, get: () => c.stroke.width, set: (v) => (c.stroke.width = Math.max(0, v)) });
  field(st, { label: 'Sombra color', type: 'color', get: () => c.shadow.color, set: (v) => (c.shadow.color = v) });
  field(st, {
    label: 'Sombra opacidad %',
    type: 'range',
    min: 0,
    max: 100,
    get: () => (c.shadow.opacity ?? 0.6) * 100,
    set: (v) => (c.shadow.opacity = v / 100),
  });
  field(st, { label: 'Sombra difusión', min: 0, get: () => c.shadow.blur, set: (v) => (c.shadow.blur = Math.max(0, v)) });
  field(st, { label: 'Sombra desplaz. Y', get: () => c.shadow.y, set: (v) => (c.shadow.y = v) });

  const bx = section('Caja de fondo', c.box.enabled);
  field(bx, { label: 'Activar', type: 'checkbox', get: () => c.box.enabled, set: (v) => (c.box.enabled = v) });
  field(bx, { label: 'Color', type: 'color', get: () => c.box.color, set: (v) => (c.box.color = v) });
  field(bx, {
    label: 'Opacidad %',
    type: 'range',
    min: 0,
    max: 100,
    get: () => (c.box.opacity ?? 1) * 100,
    set: (v) => (c.box.opacity = v / 100),
  });
  field(bx, { label: 'Margen interno', min: 0, get: () => c.box.padding, set: (v) => (c.box.padding = Math.max(0, v)) });
  field(bx, { label: 'Redondeo', min: 0, get: () => c.box.radius, set: (v) => (c.box.radius = Math.max(0, v)) });

  const k = c.counter;
  const ct = section('Contador animado', k.enabled);
  field(ct, { label: 'Activar', type: 'checkbox', get: () => k.enabled, set: (v) => (k.enabled = v) });
  field(ct, { label: 'Desde', get: () => k.from, set: (v) => (k.from = v) });
  field(ct, { label: 'Hasta', get: () => k.to, set: (v) => (k.to = v) });
  field(ct, { label: 'Decimales', min: 0, max: 4, step: 1, get: () => k.decimals, set: (v) => (k.decimals = clamp(Math.round(v), 0, 4)) });
  field(ct, { label: 'Prefijo', type: 'text', get: () => k.prefix, set: (v) => (k.prefix = v) });
  field(ct, { label: 'Sufijo', type: 'text', get: () => k.suffix, set: (v) => (k.suffix = v) });
  field(ct, { label: 'Separador de miles', type: 'checkbox', get: () => k.sep, set: (v) => (k.sep = v) });
}

function buildShape(c) {
  const s = section('Forma');
  field(s, {
    label: 'Tipo',
    type: 'select',
    options: [
      ['rect', 'Rectángulo'],
      ['ellipse', 'Elipse / círculo'],
    ],
    get: () => c.shape,
    set: (v) => (c.shape = v),
  });
  field(s, {
    label: 'Relleno',
    type: 'color',
    get: () => (c.fill === 'transparent' ? '#000000' : c.fill),
    set: (v) => (c.fill = v),
  });
  field(s, {
    label: 'Sin relleno',
    type: 'checkbox',
    get: () => c.fill === 'transparent',
    set: (v) => (c.fill = v ? 'transparent' : '#7c5cff'),
    rebuild: true,
  });
  field(s, { label: 'Redondeo', min: 0, get: () => c.radius, set: (v) => (c.radius = Math.max(0, v)) });
  field(s, { label: 'Borde color', type: 'color', get: () => c.strokeColor, set: (v) => (c.strokeColor = v) });
  field(s, { label: 'Borde grosor', min: 0, get: () => c.strokeWidth, set: (v) => (c.strokeWidth = Math.max(0, v)) });
}

export function loadFont(c) {
  document.fonts
    .load(`${c.italic ? 'italic ' : ''}${c.weight} 40px "${c.font}"`)
    .then(() => emit('frame'))
    .catch(() => {});
}

function dupe(c) {
  checkpoint();
  const copy = duplicateClip(c.id);
  changed();
  if (copy) select(copy.id);
}

function remove(c) {
  checkpoint();
  deleteClip(c.id);
  changed();
  emit('selection');
}
