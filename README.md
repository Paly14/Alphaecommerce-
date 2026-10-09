# Alpha Ecommerce — Landing VSL

Landing page tipo **VSL** (Video Sales Letter) para Alpha Ecommerce:
un video principal, casos de éxito en video (YouTube) y botón de WhatsApp.

## ✏️ Cómo editarla (sin saber programar)

Todo se cambia en **un solo archivo**: [`assets/js/config.js`](assets/js/config.js)

1. **WhatsApp** → en `whatsapp.numero` poné tu número con código de país,
   sin `+`, sin `0` y sin espacios. Ej: `5491122334455`.
2. **Video principal (VSL)** → en `videoVSL` pegá el link de YouTube.
   Si aún no lo tenés, dejalo vacío (`''`) y aparece un cartel "Próximamente".
3. **Casos de éxito** → en la lista `casos`, cada bloque `{ ... }` es un video.
   - Para agregar: copiá un bloque, pegalo debajo (con una coma) y cambiá el link.
   - Para quitar: borrá su bloque.

Los links de YouTube funcionan en cualquier formato:
`youtube.com/watch?v=...`, `youtu.be/...`, `youtube.com/shorts/...`, etc.

## 👀 Verla en tu compu

Abrí `index.html` en el navegador (doble clic) o serví la carpeta:

```bash
python3 -m http.server 8000
# luego abrí http://localhost:8000
```

## 🌐 Publicarla gratis (GitHub Pages)

1. En GitHub → **Settings → Pages**.
2. En "Source" elegí la rama y la carpeta `/root`.
3. Guardá. En unos minutos tenés tu link público.

## 📁 Estructura

```
index.html            → estructura de la página
assets/css/styles.css → diseño
assets/js/config.js   → 👈 EDITÁS ACÁ (textos, WhatsApp, videos)
assets/js/app.js      → lógica (no hace falta tocar)
```
