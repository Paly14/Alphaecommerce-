/* ===================================================================
   Alpha Ecommerce — lógica de la landing
   Lee CONFIG (config.js) y arma la página. No necesitás tocar esto.
   =================================================================== */

(function () {
  'use strict';

  /* --- Extrae el ID de un link de YouTube en cualquier formato --- */
  function youtubeId(url) {
    if (!url) return '';
    const s = String(url).trim();
    // Ya es solo un ID (11 caracteres típicos)
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    const patterns = [
      /[?&]v=([a-zA-Z0-9_-]{11})/,      // youtube.com/watch?v=ID
      /youtu\.be\/([a-zA-Z0-9_-]{11})/, // youtu.be/ID
      /embed\/([a-zA-Z0-9_-]{11})/,     // youtube.com/embed/ID
      /shorts\/([a-zA-Z0-9_-]{11})/,    // youtube.com/shorts/ID
      /live\/([a-zA-Z0-9_-]{11})/,      // youtube.com/live/ID
    ];
    for (const p of patterns) {
      const m = s.match(p);
      if (m) return m[1];
    }
    return '';
  }

  function ytIframe(url, title) {
    const id = youtubeId(url);
    if (!id) return null;
    const src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0';
    const ifr = document.createElement('iframe');
    ifr.src = src;
    ifr.title = title || 'Video';
    ifr.loading = 'lazy';
    ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    ifr.allowFullscreen = true;
    return ifr;
  }

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  /* --- Link de WhatsApp --- */
  function waLink() {
    const num = (CONFIG.whatsapp.numero || '').replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(CONFIG.whatsapp.mensaje || '');
    return 'https://wa.me/' + num + (msg ? '?text=' + msg : '');
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (typeof CONFIG === 'undefined') {
      console.error('No se encontró CONFIG. Revisá assets/js/config.js');
      return;
    }

    /* Marca y textos */
    document.title = CONFIG.marca + ' — ' + (CONFIG.eslogan || '');
    setText('brandName', CONFIG.marca);
    setText('heroEyebrow', CONFIG.marca);
    setText('heroTitle', CONFIG.titular);
    setText('heroSub', CONFIG.subtitular);
    setText('heroCta', CONFIG.textoBoton);
    setText('ctaFinal', CONFIG.textoBoton);
    setText('footerBrand', CONFIG.marca);
    setText('footerYear', '© ' + new Date().getFullYear());

    /* Links de WhatsApp */
    const wa = waLink();
    document.querySelectorAll('[data-wa]').forEach(function (a) {
      a.setAttribute('href', wa);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    });

    /* Video VSL */
    const vslWrap = document.getElementById('vslWrap');
    const ifr = ytIframe(CONFIG.videoVSL, 'Video principal ' + CONFIG.marca);
    if (ifr) {
      vslWrap.appendChild(ifr);
    } else {
      vslWrap.appendChild(
        el(
          'div',
          'video-placeholder',
          '<div class="play"></div><strong>Tu video llega pronto</strong><span>Pegá el link de YouTube en config.js → videoVSL</span>'
        )
      );
    }

    /* Beneficios */
    renderList('beneficiosGrid', CONFIG.beneficios, function (b) {
      const c = el('div', 'card');
      c.appendChild(el('div', 'beneficio__icono', esc(b.icono)));
      c.appendChild(el('h3', 'beneficio__titulo', esc(b.titulo)));
      c.appendChild(el('p', 'beneficio__texto', esc(b.texto)));
      return c;
    });

    /* Casos de éxito */
    renderList('casosGrid', CONFIG.casos, function (caso) {
      const c = el('article', 'caso');
      const vid = el('div', 'caso__video');
      const cifr = ytIframe(caso.video, caso.titulo);
      if (cifr) {
        vid.appendChild(cifr);
      } else {
        vid.appendChild(el('div', 'video-placeholder', '<span>Pegá el link de YouTube</span>'));
      }
      c.appendChild(vid);
      const body = el('div', 'caso__body');
      body.appendChild(el('h3', 'caso__titulo', esc(caso.titulo)));
      body.appendChild(el('p', 'caso__desc', esc(caso.descripcion)));
      if (caso.nombre) body.appendChild(el('div', 'caso__nombre', esc(caso.nombre)));
      c.appendChild(body);
      return c;
    });

    /* FAQ */
    const faqList = document.getElementById('faqList');
    if (faqList && Array.isArray(CONFIG.faq)) {
      CONFIG.faq.forEach(function (f) {
        const item = el('div', 'faq__item');
        const q = el('button', 'faq__q', esc(f.pregunta));
        q.setAttribute('type', 'button');
        const a = el('div', 'faq__a', '<p>' + esc(f.respuesta) + '</p>');
        q.addEventListener('click', function () {
          item.classList.toggle('open');
        });
        item.appendChild(q);
        item.appendChild(a);
        faqList.appendChild(item);
      });
    }
  });

  function setText(id, txt) {
    const n = document.getElementById(id);
    if (n && txt != null) n.textContent = txt;
  }

  function renderList(id, arr, builder) {
    const host = document.getElementById(id);
    if (!host || !Array.isArray(arr)) return;
    host.innerHTML = '';
    arr.forEach(function (item) {
      host.appendChild(builder(item));
    });
  }
})();
