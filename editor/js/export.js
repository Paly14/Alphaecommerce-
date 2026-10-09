// Exporta el proyecto a un archivo de video (MP4 si el navegador lo permite, si no WebM).
// Se renderiza en tiempo real: el audio se mezcla con Web Audio y el video sale del canvas.
import { store, projectDuration, emit } from './state.js';
import { renderFrame } from './render.js';
import { ensureAudio, syncMedia, waitReady, pauseAll } from './media.js';

const MIMES = [
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return MIMES.find((m) => MediaRecorder.isTypeSupported(m)) || '';
}

export async function exportVideo({ bitrate = 12_000_000, onProgress, signal } = {}) {
  const P = store.project;
  const dur = projectDuration();
  if (dur <= 0) throw new Error('El proyecto está vacío: agregá al menos un clip.');
  const mimeType = pickMime();
  if (mimeType === null) throw new Error('Este navegador no permite grabar video. Usá Chrome o Edge.');

  const canvas = document.createElement('canvas');
  canvas.width = P.width;
  canvas.height = P.height;
  const ctx = canvas.getContext('2d');

  const a = ensureAudio();
  // durante la exportación el audio no suena por los parlantes, solo se graba
  try {
    a.master.disconnect(a.ctx.destination);
  } catch {
    /* ya desconectado */
  }

  store.exporting = true;
  const wasTime = store.time;
  let stream;
  try {
    await waitReady(0);
    renderFrame(ctx, 0);
    stream = canvas.captureStream(P.fps);
    for (const tr of a.dest.stream.getAudioTracks()) stream.addTrack(tr);

    const rec = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: bitrate,
      audioBitsPerSecond: 192_000,
    });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise((r) => (rec.onstop = r));
    rec.start(250);

    const t0 = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        if (signal?.aborted) return resolve();
        const t = (performance.now() - t0) / 1000;
        if (t >= dur) return resolve();
        syncMedia(t, true);
        renderFrame(ctx, t);
        store.time = t;
        emit('time');
        onProgress?.(t / dur, canvas);
        requestAnimationFrame(tick);
      };
      tick();
    });
    rec.stop();
    await stopped;
    if (signal?.aborted) return null;
    const type = (rec.mimeType || mimeType || 'video/webm').split(';')[0];
    return { blob: new Blob(chunks, { type }), ext: type.includes('mp4') ? 'mp4' : 'webm' };
  } finally {
    stream?.getVideoTracks().forEach((t) => t.stop());
    pauseAll();
    a.master.connect(a.ctx.destination);
    store.exporting = false;
    store.time = wasTime;
    emit('time');
    emit('frame');
  }
}

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function safeName(s) {
  return (s || 'video').replace(/[\\/:*?"<>|]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'video';
}
