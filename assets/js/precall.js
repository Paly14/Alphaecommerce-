/* =====================================================================
   Formulario Pre-Call — lógica (no hace falta tocar este archivo)
   Pasos, validación y envío a Google Sheets (Apps Script).
   ===================================================================== */
(function () {
  'use strict';

  var CFG = (typeof PRECALL_CONFIG !== 'undefined' && PRECALL_CONFIG) || {};
  var form = document.getElementById('pcForm');
  var steps = Array.prototype.slice.call(form.querySelectorAll('.pc-step'));
  var bar = document.getElementById('pcBar');
  var stepNow = document.getElementById('pcStepNow');
  var stepTotal = document.getElementById('pcStepTotal');
  var btnPrev = document.getElementById('pcPrev');
  var btnNext = document.getElementById('pcNext');
  var btnSend = document.getElementById('pcSend');
  var errorBox = document.getElementById('pcError');
  var thanks = document.getElementById('pcThanks');
  var current = 0;

  /* ---------- Textos desde la config ---------- */
  function texto(id, valor) {
    var el = document.getElementById(id);
    if (el && valor) el.textContent = valor;
  }
  texto('pcBrand', CFG.marca);
  texto('pcTitle', CFG.titulo);
  texto('pcSub', CFG.subtitulo);
  texto('pcThanksSub', CFG.gracias);
  if (CFG.marca) document.title = 'Formulario Pre-Call — ' + CFG.marca;

  /* ---------- Navegación entre pasos ---------- */
  stepTotal.textContent = String(steps.length);

  function mostrar(i) {
    steps.forEach(function (s, n) { s.classList.toggle('is-active', n === i); });
    current = i;
    stepNow.textContent = String(i + 1);
    bar.style.width = ((i + 1) / steps.length) * 100 + '%';
    btnPrev.hidden = i === 0;
    btnNext.hidden = i === steps.length - 1;
    btnSend.hidden = i !== steps.length - 1;
    errorBox.hidden = true;
    if (!primerRender) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  btnNext.addEventListener('click', function () {
    if (validar(steps[current])) mostrar(current + 1);
  });
  btnPrev.addEventListener('click', function () { mostrar(current - 1); });

  /* ---------- Campos que aparecen según la respuesta ---------- */
  form.addEventListener('change', function (e) {
    var input = e.target;
    if (!input.dataset || !input.dataset.toggle) return;
    var destino = document.getElementById(input.dataset.toggle);
    if (!destino) return;
    var visible = input.type === 'checkbox' ? input.checked : input.value === 'Sí';
    destino.hidden = !visible;
    if (!visible) {
      destino.querySelectorAll('input, textarea').forEach(function (c) { c.value = ''; });
    }
  });

  /* ---------- Slider de compromiso ---------- */
  var range = document.getElementById('pcRange');
  var rangeOut = document.getElementById('pcRangeOut');
  if (range && rangeOut) {
    range.addEventListener('input', function () { rangeOut.textContent = range.value; });
  }

  /* ---------- Validación ---------- */
  function marcarError(el, mensaje) {
    errorBox.textContent = mensaje;
    errorBox.hidden = false;
    if (el) {
      el.classList.add('pc-invalid');
      el.addEventListener('input', function quitar() {
        el.classList.remove('pc-invalid');
        el.removeEventListener('input', quitar);
      });
      if (el.focus) el.focus({ preventScroll: false });
    }
  }

  function validar(paso) {
    errorBox.hidden = true;

    // Texto, email, número y textarea obligatorios
    var campos = paso.querySelectorAll('input[required], textarea[required]');
    for (var i = 0; i < campos.length; i++) {
      var c = campos[i];
      if (c.type === 'radio' || c.type === 'checkbox') continue;
      if (c.closest('[hidden]')) continue;
      if (!c.value.trim()) { marcarError(c, 'Completá este campo para seguir.'); return false; }
      if (c.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.value.trim())) {
        marcarError(c, 'Revisá el correo: parece que falta algo.'); return false;
      }
      if (c.type === 'tel' && c.value.replace(/\D/g, '').length < 8) {
        marcarError(c, 'Escribí tu WhatsApp con código de país.'); return false;
      }
    }

    // Grupos de radios obligatorios
    var radios = {};
    paso.querySelectorAll('input[type="radio"]').forEach(function (r) { radios[r.name] = true; });
    for (var nombre in radios) {
      var grupo = paso.querySelectorAll('input[name="' + nombre + '"]');
      var requerido = Array.prototype.some.call(grupo, function (r) { return r.required; });
      var elegido = Array.prototype.some.call(grupo, function (r) { return r.checked; });
      if (requerido && !elegido) { marcarError(grupo[0], 'Elegí una opción para seguir.'); return false; }
    }

    // "¿Qué pasó?" es obligatorio si respondió que sí intentó emprender
    var quePaso = paso.querySelector('#quePaso');
    if (quePaso && !quePaso.hidden) {
      var ta = quePaso.querySelector('textarea');
      if (!ta.value.trim()) { marcarError(ta, 'Contanos brevemente qué pasó.'); return false; }
    }

    // Al menos un freno marcado
    var frenos = paso.querySelectorAll('input[name="Que te frena"]');
    if (frenos.length) {
      var alguno = Array.prototype.some.call(frenos, function (f) { return f.checked; });
      if (!alguno) { marcarError(frenos[0], 'Marcá al menos una opción.'); return false; }
    }

    // Compromiso de asistencia
    var compromiso = paso.querySelector('input[name="Compromiso de asistencia"]');
    if (compromiso && !compromiso.checked) {
      marcarError(compromiso, 'Necesitamos tu confirmación para agendar la llamada.');
      return false;
    }
    return true;
  }

  /* ---------- Armar las respuestas ---------- */
  function respuestas() {
    var datos = {};
    var fd = new FormData(form);
    fd.forEach(function (valor, clave) {
      if (typeof valor !== 'string') return;
      datos[clave] = datos[clave] ? datos[clave] + ', ' + valor : valor;
    });
    datos['Origen'] = window.location.href;
    return datos;
  }

  /* ---------- Copia de respaldo en Netlify (Formularios) ---------- */
  function copiaNetlify(datos) {
    if (CFG.netlifyForms === false) return Promise.resolve();
    var cuerpo = new URLSearchParams({ 'form-name': 'precall' });
    Object.keys(datos).forEach(function (clave) { cuerpo.append(clave, datos[clave]); });
    return fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: cuerpo.toString(),
    }).catch(function () { /* fuera de Netlify simplemente no aplica */ });
  }

  /* ---------- Envío a Google Sheets ---------- */
  function enviar(datos) {
    if (!CFG.sheetsURL) {
      console.warn('[pre-call] Falta cargar sheetsURL en assets/js/precall-config.js');
      return Promise.resolve();
    }
    // text/plain evita el "preflight" de CORS que Apps Script no responde.
    return fetch(CFG.sheetsURL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(datos),
    }).catch(function () {
      // Si el navegador bloquea la respuesta, reintentamos "a ciegas":
      // el dato igual llega a la planilla.
      return fetch(CFG.sheetsURL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(datos),
      });
    });
  }

  /* ---------- Botón de WhatsApp de la pantalla final ---------- */
  function linkWhatsApp(nombreCompleto) {
    var wa = CFG.whatsapp || {};
    var boton = document.getElementById('pcWhatsApp');
    if (!boton || !wa.numero) return;
    var nombre = (nombreCompleto || '').trim();
    var mensaje = (wa.mensaje || '').replace('{nombre}', nombre || 'yo');
    boton.href = 'https://wa.me/' + String(wa.numero).replace(/\D/g, '') +
      '?text=' + encodeURIComponent(mensaje);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validar(steps[current])) return;

    btnSend.disabled = true;
    btnSend.textContent = 'Enviando…';

    var datos = respuestas();
    linkWhatsApp(datos['Nombre y apellido']);
    copiaNetlify(datos);
    enviar(datos)
      .catch(function (err) { console.error('[pre-call]', err); })
      .then(function () {
        form.hidden = true;
        document.querySelector('.pc-progress').hidden = true;
        document.querySelector('.pc-progress__label').hidden = true;
        thanks.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  });

  var primerRender = true;
  mostrar(0);
  primerRender = false;
})();
