# ◆ Motion Studio — editor de video con motion graphics

Editor de video que funciona **en el navegador**, sin instalar nada y sin servidor.
Sirve para cualquier proyecto: reels, anuncios, YouTube, VSL o testimonios.
La carpeta `editor/` es independiente y se puede mover a su propio repositorio tal cual.

## Qué puede hacer

- **Línea de tiempo multipista**: video, imágenes, audio, textos y formas. Mover, recortar
  desde los bordes, cortar (`S`), duplicar, imán entre clips y zoom.
- **Motion graphics**:
  - Animaciones de entrada y salida: fade, deslizar, pop, zoom, desenfoque, giro, barridos,
    máquina de escribir y palabra por palabra.
  - **Keyframes** de posición, escala, rotación, opacidad y tamaño, con curvas de suavizado
    (suave, rebote, elástico…).
  - **Plantillas**: título impactante, zócalo (lower third), llamado a la acción que late,
    contador animado, barra de progreso, cita, etiqueta, transiciones flash y barrido.
  - **Efectos rápidos**: Ken Burns, zoom punch, sacudida, fundidos.
- **Textos**: 10 fuentes, borde, sombra, caja de fondo y contador numérico.
- **Subtítulos**: importá `.srt` o `.vtt` con 4 estilos (Reels, caja negra, palabra por
  palabra, clásico).
- **Formatos**: 16:9, 9:16 (Reels/TikTok/Shorts), 1:1 y 4:5. Al cambiar de formato, los
  elementos se reubican solos.
- **Filtros** de imagen (brillo, contraste, saturación, desenfoque), volumen y fades de audio.
- **Exportar** a MP4 (o WebM según el navegador) y guardar cuadros como PNG.
- **Autoguardado**: el proyecto y los archivos quedan guardados en el navegador.
  También podés descargar el proyecto como `.json`.

## Cómo usarlo

Abrilo con un servidor local (los módulos de JavaScript no cargan con doble clic):

```bash
cd editor
python3 -m http.server 8000
# abrí http://localhost:8000
```

Recomendado: **Chrome o Edge** de escritorio. Exportan MP4 H.264 y leen MP4, MOV (H.264) y WebM.

1. **Medios** → importá o arrastrá tus archivos. Doble clic, o arrastralos a la línea de tiempo.
2. **Motion** → elegí una plantilla. Se inserta en el playhead.
3. Seleccioná cualquier clip y editalo en el panel derecho. Para animar, mové el playhead,
   tocá ◆ y cambiá el valor en otro momento.
4. **Exportar video** → el render es en tiempo real (tarda lo que dura el video). No cambies
   de pestaña mientras exporta.

### Atajos

| Tecla | Acción |
|---|---|
| `Espacio` | Reproducir / pausar |
| `S` | Cortar en el playhead (clip seleccionado, o todos si no hay selección) |
| `Supr` | Borrar clip |
| `Ctrl+D` | Duplicar |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Deshacer / rehacer |
| `←` `→` | Cuadro a cuadro (`Shift`: 1 segundo) |
| `K` | Keyframe de posición |
| `Alt` + rueda sobre el video | Escalar el clip seleccionado |
| `Ctrl` + rueda en la línea de tiempo | Zoom |

## Formato del proyecto (para generar videos con Claude)

Un proyecto es un JSON (`Guardar` lo descarga, `Abrir` lo carga). Claude puede escribir uno
desde cero o modificarlo, por ejemplo: "armá un reel 9:16 con estos 5 textos animados".

```jsonc
{
  "name": "Mi reel", "format": "9:16", "width": 1080, "height": 1920, "fps": 30,
  "background": "#000000",
  "tracks": [{ "id": "t1", "type": "visual", "name": "Textos" }],   // la primera pista se dibuja arriba
  "clips": [{
    "id": "c1", "trackId": "t1", "type": "text",                  // video | image | audio | text | shape
    "start": 0, "duration": 3,                                     // segundos
    "x": 540, "y": 960, "scale": 1, "rotation": 0, "opacity": 1,   // x/y = centro del elemento
    "text": "HOLA", "font": "Anton", "size": 160, "weight": 400, "color": "#ffffff",
    "animIn": { "type": "pop", "duration": 0.5 },
    "animOut": { "type": "fade", "duration": 0.3 },
    "keyframes": { "rotation": [{ "t": 0, "v": -5 }, { "t": 3, "v": 5 }] }, // t relativo al clip
    "kfEase": "inOut"
  }]
}
```

Los campos que faltan toman valores por defecto al editar. Para videos, imágenes y audio,
`assetId` apunta a un archivo importado en el navegador. Si falta, el clip se ve en rojo.

Desde la consola del navegador también está `window.motionStudio`, con `loadProject`,
`insertTemplate`, `addSubtitles`, `play`, `seek` y `exportVideo`.

## Flujo recomendado con conectores

- **Descript**: transcribí y limpiá el video (muletillas, silencios), exportá la transcripción
  como **SRT** y cargala en la pestaña **Subtítulos**.
- **Google Drive**: guardá el material crudo y los videos exportados.
- **Canva**: logos, fondos y elementos de marca en PNG para usarlos como imágenes.

## Estructura

```
editor/
  index.html        interfaz
  css/editor.css    estilos
  js/main.js        arranque, vista previa, teclado, exportación y paneles
  js/state.js       modelo del proyecto, historial (deshacer) y pistas
  js/anim.js        curvas, keyframes y presets de animación
  js/render.js      dibujo de cada cuadro en el canvas
  js/media.js       importación, guardado (IndexedDB) y sincronización de video/audio
  js/timeline.js    línea de tiempo
  js/inspector.js   panel de propiedades
  js/templates.js   plantillas de motion graphics y efectos
  js/subtitles.js   importación de SRT/VTT
  js/export.js      exportación de video
```

## Límites actuales

- La exportación es en tiempo real y depende de que la pestaña esté visible.
- Los archivos importados viven en el navegador donde los cargaste. Para pasar un proyecto a
  otra computadora, llevá el `.json` y volvé a importar los archivos.
- Safari y Firefox funcionan para editar, pero la exportación da mejores resultados en Chrome.
