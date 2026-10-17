// Textos de cada tutorial. Cada target es el atributo data-tour del elemento
// a resaltar (o una lista, en orden de preferencia); si ninguno esta en
// pantalla, la tarjeta sale centrada. route lleva a otra pagina antes del paso.

export const PUBLIC_TOUR_KEY = 'public';

// Un tutorial por paciente: si en la misma compu entran dos personas, cada
// una lo ve la primera vez que inicia sesion
export const patientTourKey = (userId) => `patient-${userId}`;

// Pagina de login, sin sesion iniciada
export const PUBLIC_TOUR_STEPS = [
  {
    welcome: true,
    title: '¿Primera vez en Paciente360º?',
    body: 'Te muestro en pocos pasos cómo sacar un turno y cómo entrar al sistema.',
  },
  {
    target: 'book-no-account',
    title: 'Sacá un turno sin cuenta',
    body: 'Completá tus datos y elegí el turno. Al reservar se te crea una cuenta: tu usuario y tu contraseña son tu DNI.',
  },
  {
    target: 'register',
    title: 'O creá tu cuenta primero',
    body: 'Con una cuenta ves todos tus turnos en un solo lugar, los confirmás y los cancelás desde la app.',
  },
  {
    target: 'login-fields',
    title: 'Entrá con tu usuario',
    body: 'Si ya sacaste un turno o te anotaron en la salita, tu usuario y tu contraseña son tu DNI.',
  },
  {
    target: 'forgot',
    title: '¿No te acordás?',
    body: 'Tocá acá y te llega una contraseña nueva por mail.',
  },
  {
    target: 'news',
    title: 'Noticias de prevención',
    body: 'Información de salud confiable. Abrí cualquier noticia y pedí que te la expliquen más simple.',
  },
  {
    target: 'assistant',
    title: 'Asistente virtual',
    body: 'Si te perdés, preguntale cómo usar la app. Para consultas de salud, sacá un turno.',
  },
  {
    target: 'tour-replay',
    title: 'Volvé a verlo cuando quieras',
    body: 'Este tutorial queda siempre acá, debajo del título.',
  },
];

// Paciente con sesion iniciada. En celular el menu esta escondido: por eso
// los pasos del menu tienen como alternativa el boton que lo abre.
export const PATIENT_TOUR_STEPS = [
  {
    welcome: true,
    route: '/sacar-turno',
    title: '¡Bienvenido a Paciente360º!',
    body: 'Te muestro en un minuto dónde está cada cosa para que manejes tus turnos.',
  },
  {
    target: ['nav-sacar-turno', 'menu-button'],
    route: '/sacar-turno',
    title: 'Sacar turno',
    body: 'Desde acá pedís un turno nuevo: elegís especialidad, profesional, día y horario.',
  },
  {
    target: 'specialty-help',
    route: '/sacar-turno',
    title: '¿No sabés a qué especialidad ir?',
    body: 'Contá en pocas palabras qué te pasa y te orientamos. No es un diagnóstico: si tenés dudas, Clínica médica te evalúa.',
  },
  {
    target: ['nav-mis-turnos', 'menu-button'],
    route: '/mis-turnos',
    title: 'Mis turnos',
    body: 'Acá ves tus próximos turnos y el historial de los que ya pasaron.',
  },
  {
    target: 'appointments-list',
    route: '/mis-turnos',
    title: 'Confirmar o cancelar',
    body: 'Cada turno tiene sus botones. Desde 3 días antes podés confirmar que vas (es opcional), y podés cancelarlo mientras siga vigente.',
  },
  {
    target: ['nav-noticias', 'menu-button'],
    title: 'Noticias y prevención',
    body: 'Información de salud confiable. En cada noticia podés pedir que te la expliquen más simple.',
  },
  {
    target: 'notifications',
    title: 'Avisos',
    body: 'La campanita te avisa cuando tenés turnos por confirmar o próximos.',
  },
  {
    target: ['profile-topbar', 'profile-sidebar', 'menu-button'],
    title: 'Tu perfil',
    body: 'Tocando tu nombre actualizás teléfono, email, obra social y contacto de emergencia. Te recomendamos cambiar la contraseña: al principio es tu DNI.',
  },
  {
    target: 'tour-replay',
    title: 'Volvé a verlo cuando quieras',
    body: 'Este tutorial queda en este botón de ayuda.',
  },
];

// Sacar turno sin cuenta (/turnos). Los pasos de profesional, horario y
// confirmacion aparecen recien al ir completando, por eso se explican con
// texto en vez de resaltarlos.
export const BOOKING_TOUR_KEY = 'public-booking';

export const BOOKING_TOUR_STEPS = [
  {
    welcome: true,
    title: '¿Cómo saco un turno sin cuenta?',
    body: 'Son pocos pasos y no necesitás registrarte. Te muestro cada uno.',
  },
  {
    target: 'booking-personal-data',
    title: 'Tus datos',
    body: 'Completá DNI, fecha de nacimiento, nombre, apellido y email. Si ya sos paciente, el DNI y la fecha de nacimiento tienen que coincidir con los registrados.',
  },
  {
    target: 'specialty-help',
    title: '¿No sabés a qué especialidad ir?',
    body: 'Contá en pocas palabras qué te pasa y te orientamos. No es un diagnóstico: si tenés dudas, Clínica médica te evalúa.',
  },
  {
    target: 'booking-specialty',
    title: 'Elegí la especialidad',
    body: 'Después aparecen los profesionales disponibles, el día y los horarios libres. Los horarios tachados ya están ocupados.',
  },
  {
    title: 'Al reservar, se crea tu cuenta',
    body: 'Tu usuario y tu contraseña son tu DNI. Con eso entrás para ver, confirmar o cancelar el turno.',
  },
  {
    target: 'booking-tour-replay',
    title: 'Volvé a verlo cuando quieras',
    body: 'Este tutorial queda acá, debajo del título.',
  },
];

// Listado de noticias (/noticias)
export const NEWS_TOUR_KEY = 'news';

export const NEWS_TOUR_STEPS = [
  {
    welcome: true,
    title: 'Noticias y prevención',
    body: 'Información de salud que publica el equipo de la salita. Te muestro cómo aprovecharla.',
  },
  {
    target: 'news-filters',
    title: 'Filtrá por tema',
    body: 'Tocá una categoría para ver solo esas noticias.',
  },
  {
    target: 'news-first',
    title: 'Abrí una noticia',
    body: 'Adentro tenés «Explicámelo simple», que la resume en palabras claras, y «Tengo dudas sobre este tema», para hacer preguntas sobre lo que leíste.',
  },
  {
    target: 'news-tour-replay',
    title: 'Volvé a verlo cuando quieras',
    body: 'Este tutorial queda acá, debajo del título.',
  },
];
