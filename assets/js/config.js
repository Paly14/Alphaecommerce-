/* =====================================================================
   ⚙️  CONFIGURACIÓN DE LA LANDING — Alpha Ecommerce
   ---------------------------------------------------------------------
   ESTE ES EL ÚNICO ARCHIVO QUE NECESITÁS EDITAR.
   No hace falta saber programar: cambiá el texto entre comillas ' '.
   ===================================================================== */

const CONFIG = {

  /* ---------------------------------------------------------------
     1) MARCA
     --------------------------------------------------------------- */
  marca: 'Alpha Ecommerce',
  eslogan: 'Escalá tu tienda online a ventas reales',

  /* ---------------------------------------------------------------
     2) WHATSAPP (el botón de acción abre este chat)
     - numero: código de país + número, SIN espacios, SIN "+" ni "0".
       Ej. Argentina: 5491122334455  |  México: 5215512345678
     - mensaje: texto que aparece ya escrito cuando abre el chat.
     --------------------------------------------------------------- */
  whatsapp: {
    numero: '5492944921937',
    mensaje: 'Hola! Vi la web de Alpha Ecommerce y quiero más información 🚀',
  },

  /* ---------------------------------------------------------------
     3) VIDEO VSL PRINCIPAL (el video que estás por armar)
     Pegá el link de YouTube tal cual lo copiás del navegador.
     Funciona con cualquiera de estos formatos:
       https://www.youtube.com/watch?v=XXXXXXXXX
       https://youtu.be/XXXXXXXXX
     Si todavía no lo tenés, dejalo vacío ('') y aparece un cartel
     de "Próximamente".
     --------------------------------------------------------------- */
  videoVSL: '',

  /* ---------------------------------------------------------------
     4) TITULARES DE LA PORTADA (arriba del video)
     --------------------------------------------------------------- */
  titular: 'Convertí tu idea en una tienda online que vende todos los días',
  subtitular:
    'Te mostramos el sistema exacto que usamos para lanzar y escalar ecommerce rentables — sin adivinar, sin perder plata en publicidad que no convierte.',

  /* ---------------------------------------------------------------
     5) CASOS DE ÉXITO (videos de YouTube)
     Para AGREGAR un caso: copiá un bloque { ... } completo,
     pegalo debajo y cambiá los datos. Separá cada bloque con una coma.
     Para QUITAR un caso: borrá su bloque { ... }.
     --------------------------------------------------------------- */
  casos: [
    {
      video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // link de YouTube
      nombre: 'Nombre del cliente',                          // quién habla
      titulo: 'De 0 a $10.000 en ventas en 60 días',         // resultado
      descripcion: 'Contá en una frase qué logró este cliente con Alpha Ecommerce.',
    },
    {
      video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      nombre: 'Nombre del cliente',
      titulo: 'Duplicó sus ventas en 3 meses',
      descripcion: 'Otro testimonio real de alguien que aplicó el sistema.',
    },
    {
      video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      nombre: 'Nombre del cliente',
      titulo: 'Su primera venta a la semana',
      descripcion: 'Un caso más para dar prueba social a los que dudan.',
    },
  ],

  /* ---------------------------------------------------------------
     6) BENEFICIOS (los 3 pilares de tu oferta)
     --------------------------------------------------------------- */
  beneficios: [
    {
      icono: '🚀',
      titulo: 'Lanzamiento rápido',
      texto: 'Tu tienda lista y vendiendo en tiempo récord, con todo configurado.',
    },
    {
      icono: '🎯',
      titulo: 'Publicidad que convierte',
      texto: 'Campañas pensadas para vender, no para gastar. Cada peso trabaja.',
    },
    {
      icono: '📈',
      titulo: 'Escala sostenible',
      texto: 'Un sistema para crecer mes a mes sin depender de la suerte.',
    },
  ],

  /* ---------------------------------------------------------------
     7) TEXTO DEL BOTÓN DE ACCIÓN
     --------------------------------------------------------------- */
  textoBoton: 'Quiero empezar ahora',

  /* ---------------------------------------------------------------
     8) PREGUNTAS FRECUENTES
     --------------------------------------------------------------- */
  faq: [
    {
      pregunta: '¿Necesito experiencia previa en ecommerce?',
      respuesta: 'No. Te acompañamos paso a paso desde cero, sin importar tu punto de partida.',
    },
    {
      pregunta: '¿Cuánto tiempo tardo en ver resultados?',
      respuesta: 'Depende de tu compromiso, pero muchos de nuestros clientes ven sus primeras ventas en las primeras semanas.',
    },
    {
      pregunta: '¿Cómo empiezo?',
      respuesta: 'Hacé clic en el botón de WhatsApp, escribinos y te contamos todo sin compromiso.',
    },
  ],
};
