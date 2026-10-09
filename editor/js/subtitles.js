// Subtítulos: importar .srt / .vtt (por ejemplo exportados desde Descript) como clips de texto.
import { store, makeClip, addTrack, checkpoint, changed } from './state.js';

const TIME = /(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})\s*-->\s*(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/;

const toSec = (h, m, s, ms) => Number(h || 0) * 3600 + Number(m) * 60 + Number(s) + Number(ms.padEnd(3, '0')) / 1000;

export function parseSubtitles(text) {
  const cues = [];
  for (const block of text.replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = block.split('\n');
    const i = lines.findIndex((l) => TIME.test(l));
    if (i < 0) continue;
    const m = lines[i].match(TIME);
    const start = toSec(m[1], m[2], m[3], m[4]);
    const end = toSec(m[5], m[6], m[7], m[8]);
    const body = lines
      .slice(i + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (body && end > start) cues.push({ start, end, text: body });
  }
  return cues;
}

export const SUB_STYLES = {
  bold: { label: 'Reels (grande con borde)', anim: 'pop', upper: true },
  box: { label: 'Caja negra', anim: 'fade', upper: false },
  words: { label: 'Palabra por palabra', anim: 'words', upper: true },
  clean: { label: 'Clásico', anim: 'none', upper: false },
};

export function addSubtitles(cues, { style = 'bold', position = 0.8, size = 1 } = {}) {
  if (!cues.length) return 0;
  const { width: W, height: H } = store.project;
  const U = Math.min(W, H);
  const st = SUB_STYLES[style] || SUB_STYLES.bold;
  checkpoint();
  const track = addTrack('visual', 0);
  track.name = 'Subtítulos';
  for (const cue of cues) {
    const base = {
      name: cue.text.slice(0, 40),
      start: cue.start,
      duration: cue.end - cue.start,
      text: cue.text,
      y: H * position,
      maxWidth: W * 0.86,
      size: Math.round(U * 0.055 * size),
      weight: 800,
      uppercase: st.upper,
      animIn: { type: st.anim, duration: st.anim === 'words' ? Math.min(0.8, (cue.end - cue.start) * 0.7) : 0.15 },
    };
    if (style === 'bold' || style === 'words') base.stroke = { color: '#000000', width: Math.round(U * 0.006) };
    if (style === 'box') {
      base.weight = 600;
      base.box = { enabled: true, color: '#000000', opacity: 0.75, padding: Math.round(U * 0.015), radius: Math.round(U * 0.01) };
    }
    if (style === 'clean') {
      base.weight = 600;
      base.shadow = { color: '#000000', opacity: 0.9, blur: 8, y: 2 };
    }
    const c = makeClip('text', base);
    c.trackId = track.id;
    store.project.clips.push(c);
  }
  changed();
  return cues.length;
}
