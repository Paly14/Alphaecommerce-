/* =====================================================================
   ⚙️  CONFIGURACIÓN DEL FORMULARIO PRE-CALL — Alpha Ecommerce
   ---------------------------------------------------------------------
   ESTE ES EL ÚNICO ARCHIVO QUE NECESITÁS EDITAR.
   Cambiá sólo el texto entre comillas ' '.
   ===================================================================== */

const PRECALL_CONFIG = {

  /* ---------------------------------------------------------------
     1) LINK DE GOOGLE SHEETS  ← ⚠️ LO MÁS IMPORTANTE
     Pegá acá la URL que te da Google Apps Script cuando publicás
     el script (termina en /exec).
     El paso a paso está en: google-sheets/INSTRUCCIONES.md
     Mientras esté vacío, el formulario funciona pero NO guarda nada.

     Tu planilla de respuestas ya está creada acá:
     https://docs.google.com/spreadsheets/d/1MnHYbyOG8a3RTgQ6gdeZbioyOhmnGwTyD5StQPq9_EI/edit
     --------------------------------------------------------------- */
  sheetsURL: 'https://script.google.com/macros/s/AKfycbzVum04z2OzhFFyqUL8IJb2fWA4E2vcEZQWrHrCBRj-xT3kd_DLthhEkcMpGMp8Qi-Wvw/exec',

  /* ---------------------------------------------------------------
     2) COPIA DE RESPALDO EN NETLIFY (recomendado dejarlo en true)
     Cada respuesta queda TAMBIÉN guardada en Netlify → tu sitio →
     pestaña "Forms". Es una red de seguridad por si falla Google.
     --------------------------------------------------------------- */
  netlifyForms: true,

  /* ---------------------------------------------------------------
     3) TEXTOS DE LA PÁGINA
     --------------------------------------------------------------- */
  marca: 'Alpha Ecommerce',
  titulo: 'Antes de tu llamada',
  subtitulo:
    'Completá estas preguntas para que quien te atienda llegue a la llamada sabiendo tu situación. Son 2 minutos y hace que el tiempo rinda mucho más.',
  gracias:
    'Mandanos el mensaje que ya te dejamos escrito: te enviamos la Calculadora de Costos de Importación y armamos tu grupo con el closer que te va a atender en la llamada.',

  /* ---------------------------------------------------------------
     4) WHATSAPP DEL PASO FINAL
     Al enviar el formulario aparece un botón que abre este chat
     con el mensaje ya escrito. {nombre} se reemplaza por el nombre
     que la persona completó en el formulario.
     - numero: código de país + número, SIN espacios, SIN "+".
     --------------------------------------------------------------- */
  whatsapp: {
    numero: '5492944921937',
    mensaje: 'Hola! Soy {nombre}. Ya llené el formulario pre-call ✅ Quiero recibir la calculadora de costos.',
  },
};
