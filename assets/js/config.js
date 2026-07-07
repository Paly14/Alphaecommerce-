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
      video: 'https://youtu.be/JHRBHT35et8',
      nombre: 'Alumno de Alpha Ecommerce',
      titulo: 'Jona Tedesco',
      descripcion: 'Escuchá en primera persona cómo le fue con Alpha Ecommerce.',
    },
    {
      video: 'https://youtu.be/Bvy1VXwr26g',
      nombre: 'Alumno de Alpha Ecommerce',
      titulo: 'Boris',
      descripcion: 'Su experiencia aplicando el sistema, en primera persona.',
    },
    {
      video: 'https://youtu.be/K9x11x2u6oM',
      nombre: 'Alumno de Alpha Ecommerce',
      titulo: 'Sara',
      descripcion: 'Otro resultado real de alguien que confió en el proceso.',
    },
  ],

  /* ---------------------------------------------------------------
     6) BENEFICIOS (los 3 pilares de tu oferta)
     --------------------------------------------------------------- */
  beneficios: [
    {
      icono: '✅',
      titulo: 'Productos testeados',
      texto: 'No vas a depender de la suerte o testear a ver si algo vende o no.',
    },
    {
      icono: '💰',
      titulo: '1000 USD en 45 días',
      texto: '85% de nuestros alumnos alcanzaron sus primeros 1000 USD con sus primeros productos.',
    },
    {
      icono: '📝',
      titulo: 'Sistema ABC',
      texto: 'Sistema diseñado y creado para que no te pierdas nunca con tu primer importación y venta.',
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
