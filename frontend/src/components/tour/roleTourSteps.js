// Tutoriales del personal de la salita, uno por rol. Mismo formato que
// tourSteps.js (target = data-tour del elemento, route = pagina a la que ir).
//
// Van en un archivo aparte para no mezclarse con los tutoriales del paciente y
// de las paginas publicas.
//
// En celular el menu lateral esta escondido: por eso cada paso del menu tiene
// como alternativa el boton que lo abre ('menu-button').

import { PATIENT_TOUR_STEPS, patientTourKey } from './tourSteps';

// Pasos que se repiten en todos los roles
const profileStep = {
  target: ['profile-topbar', 'profile-sidebar', 'menu-button'],
  title: 'Tu perfil',
  body: 'Tocando tu nombre cargás tu foto y tus datos de contacto. Te recomendamos cambiar la contraseña: la inicial suele ser tu DNI.',
};

const replayStep = {
  target: 'tour-replay',
  title: 'Volvé a verlo cuando quieras',
  body: 'Este tutorial queda en este botón de ayuda.',
};

// ---------------------------------------------------------------------------
// Enfermero
// ---------------------------------------------------------------------------

export const NURSE_TOUR_STEPS = [
  {
    welcome: true,
    route: '/signos',
    title: '¡Bienvenido a Paciente360º!',
    body: 'Te muestro en un par de minutos las herramientas de enfermería: registro clínico, seguimiento, stock y pase de guardia.',
  },
  {
    target: ['nav-signos', 'menu-button'],
    route: '/signos',
    title: 'Signos y síntomas',
    body: 'Es el registro clínico de cada paciente que pasa por enfermería.',
  },
  {
    target: 'signos-new',
    route: '/signos',
    title: 'Registrar signos',
    body: 'Cargás temperatura, presión, síntomas, signos clínicos y el nivel de triage según la escala Manchester (de Rojo, inmediato, a Azul, no urgente).',
  },
  {
    target: 'signos-date',
    route: '/signos',
    title: 'Filtrá por día',
    body: 'Por defecto ves los registros de hoy. Elegí otra fecha para revisar días anteriores.',
  },
  {
    target: ['nav-seguimiento', 'menu-button'],
    route: '/seguimiento',
    title: 'Seguimiento del paciente',
    body: 'Después de que el médico atiende a alguien, cargás su evolución y la fecha del próximo control. Si un control se vence, te aparece como pendiente para reprogramarlo.',
  },
  {
    target: ['nav-stock', 'menu-button'],
    route: '/stock',
    title: 'Stock',
    body: 'Control de los insumos de la salita.',
  },
  {
    target: 'stock-tabs',
    route: '/stock',
    title: 'Inventario, movimientos y trazabilidad',
    body: 'En Inventario están los productos y su stock; en Movimientos, las entradas y salidas; y en Trazabilidad registrás qué insumo se usó con qué paciente.',
  },
  {
    target: 'stock-alerts',
    route: '/stock',
    title: 'Alertas',
    body: 'Te avisa de los productos con stock bajo y de los que están por vencer o ya vencieron.',
  },
  {
    target: ['nav-guardia', 'menu-button'],
    route: '/guardia',
    title: 'Pase de guardia',
    body: 'La comunicación entre turnos: lo que el turno siguiente tiene que saber.',
  },
  {
    target: 'guardia-actions',
    route: '/guardia',
    title: 'Nuevo pase',
    body: 'Cargás los datos relevantes del turno con el checklist SBAR-SAER. Durante los primeros 15 minutos lo podés corregir; después queda fijo.',
  },
  {
    target: ['nav-estadisticas', 'menu-button'],
    route: '/estadisticas',
    title: 'Estadísticas',
    body: 'Pacientes atendidos, ausentismo, enfermedades más frecuentes y consumo de insumos.',
  },
  {
    target: 'stats-range',
    route: '/estadisticas',
    title: 'Elegí el período',
    body: 'Cambiá las fechas para ver otro rango. Con el ícono de PDF descargás el reporte.',
  },
  {
    target: 'notifications',
    title: 'Avisos',
    body: 'La campanita te avisa de los seguimientos que tenés para hoy y de los que se vencieron.',
  },
  profileStep,
  replayStep,
];

// ---------------------------------------------------------------------------
// Medico
// ---------------------------------------------------------------------------

export const DOCTOR_TOUR_STEPS = [
  {
    welcome: true,
    route: '/agenda',
    title: '¡Bienvenido a Paciente360º!',
    body: 'Te muestro en un minuto cómo manejar tu agenda, las indicaciones y la historia clínica.',
  },
  {
    target: ['nav-agenda', 'menu-button'],
    route: '/agenda',
    title: 'Mis turnos',
    body: 'Tu agenda: los pacientes que tenés para atender.',
  },
  {
    target: 'agenda-filters',
    route: '/agenda',
    title: 'Elegí el día',
    body: 'Por defecto ves los turnos de hoy. A la derecha tenés cuántos quedan por atender y cuántos ya atendiste.',
  },
  {
    // Sin turnos la lista no ocupa lugar: se resaltan los filtros
    target: ['agenda-list', 'agenda-filters'],
    route: '/agenda',
    title: 'Cada turno',
    body: '«Preparar consulta» te arma un resumen de la historia del paciente para llegar con contexto. Cuando el paciente está En espera, «Cerrar consulta» lo da por atendido y te pide el tipo de enfermedad y el diagnóstico.',
  },
  {
    target: ['agenda-list', 'agenda-filters'],
    route: '/agenda',
    title: 'Diagnóstico',
    body: 'El diagnóstico y el tipo de enfermedad se pueden corregir durante los primeros 15 minutos. Los detalles los podés completar siempre.',
  },
  {
    target: ['nav-indicaciones', 'menu-button'],
    route: '/indicaciones',
    title: 'Indicaciones médicas',
    body: 'El historial de indicaciones y tratamientos que diste.',
  },
  {
    target: 'indications-new',
    route: '/indicaciones',
    title: 'Nueva indicación',
    body: 'Elegís el paciente y cargás la indicación y el tratamiento.',
  },
  {
    target: ['nav-historia-clinica', 'menu-button'],
    route: '/historia-clinica',
    title: 'Historia clínica',
    body: 'Todo lo que pasó con un paciente, en orden cronológico: turnos, diagnósticos, signos, indicaciones y seguimientos.',
  },
  {
    target: 'history-search',
    route: '/historia-clinica',
    title: 'Buscá al paciente',
    body: 'Escribí nombre, apellido o DNI. Después podés filtrar por año, mes o día y descargar la historia en PDF.',
  },
  {
    target: 'notifications',
    title: 'Avisos',
    body: 'La campanita te muestra los turnos que tenés hoy y los próximos.',
  },
  profileStep,
  replayStep,
];

// ---------------------------------------------------------------------------
// Administrativo
// ---------------------------------------------------------------------------

export const ADMINISTRATIVE_TOUR_STEPS = [
  {
    welcome: true,
    route: '/admin/turnos',
    title: '¡Bienvenido a Paciente360º!',
    body: 'Te muestro cómo gestionar los turnos de la salita y publicar noticias.',
  },
  {
    target: ['nav-admin-turnos', 'menu-button'],
    route: '/admin/turnos',
    title: 'Gestión de turnos',
    body: 'Todos los turnos de la salita, de todos los profesionales.',
  },
  {
    target: 'admin-appointments-new',
    route: '/admin/turnos',
    title: 'Nuevo turno',
    body: 'Buscás al paciente por DNI; si no está registrado, cargás sus datos ahí mismo. Si es una urgencia, marcá «sobreturno» y se agenda aunque el horario esté ocupado.',
  },
  {
    target: 'admin-appointments-filters',
    route: '/admin/turnos',
    title: 'Filtrá la lista',
    body: 'Por fecha, estado o profesional. En cada turno podés cambiar el estado o cancelarlo.',
  },
  {
    target: 'admin-appointments-filters',
    route: '/admin/turnos',
    title: 'Cuando llega el paciente',
    body: 'Pasá el turno de Reservado a En espera: así el médico sabe que ya está en la sala y puede atenderlo.',
  },
  {
    target: ['nav-admin-noticias', 'menu-button'],
    route: '/admin/noticias',
    title: 'Noticias y novedades',
    body: 'Lo que publiques acá lo ven los pacientes y cualquier persona en la página pública.',
  },
  {
    target: 'admin-news-new',
    route: '/admin/noticias',
    title: 'Nueva noticia',
    body: 'Cargás título, categoría, contenido y una foto. Los pacientes pueden pedir que se la expliquen más simple.',
  },
  profileStep,
  replayStep,
];

// ---------------------------------------------------------------------------
// Administrador y Superadministrador
// ---------------------------------------------------------------------------

// Comunes a los dos: el superadmin ve lo mismo, mas administradores y bitacora
const ADMIN_COMMON_STEPS = [
  {
    target: ['nav-admin-usuarios', 'menu-button'],
    route: '/admin/usuarios',
    title: 'Usuarios',
    body: 'Altas, ediciones y bajas de todas las cuentas del sistema.',
  },
  {
    target: 'users-tabs',
    route: '/admin/usuarios',
    title: 'Un tipo de usuario por pestaña',
    body: 'Pacientes, enfermeros, médicos y administrativos. Arriba tenés el buscador por nombre, DNI, email o matrícula.',
  },
  {
    target: 'users-new',
    route: '/admin/usuarios',
    title: 'Crear un usuario',
    body: 'El botón cambia según la pestaña en la que estés: «Nuevo paciente», «Nuevo médico», etc.',
  },
  {
    target: ['nav-admin-turnos', 'menu-button'],
    route: '/admin/turnos',
    title: 'Turnos',
    body: 'La gestión de turnos de toda la salita: crear, cambiar de estado, cancelar y agendar sobreturnos por urgencia.',
  },
  {
    target: ['nav-admin-noticias', 'menu-button'],
    route: '/admin/noticias',
    title: 'Noticias',
    body: 'Publicás y editás las noticias que ven los pacientes y la página pública.',
  },
  {
    target: ['nav-admin-stock', 'menu-button'],
    route: '/admin/stock',
    title: 'Stock',
    body: 'Podés gestionar productos y movimientos. El uso de insumos con cada paciente lo registra enfermería.',
  },
  {
    target: ['nav-admin-historia-clinica', 'menu-button'],
    route: '/admin/historia-clinica',
    title: 'Historia clínica',
    body: 'Consultás la historia de cualquier paciente.',
  },
  {
    target: ['nav-admin-guardia', 'menu-button'],
    route: '/admin/guardia',
    title: 'Pase de guardia',
    body: 'Ves los pases de todos los turnos, pero no los cargás.',
  },
  {
    title: 'Supervisás, no ejercés',
    body: 'Las acciones clínicas (signos, indicaciones, seguimientos, pases de guardia y trazabilidad) son de solo lectura para tu rol: las cargan enfermería y los médicos.',
  },
];

export const ADMINISTRATOR_TOUR_STEPS = [
  {
    welcome: true,
    route: '/admin/usuarios',
    title: '¡Bienvenido a Paciente360º!',
    body: 'Te muestro cómo administrar el sistema: usuarios, turnos, noticias y la supervisión del área clínica.',
  },
  ...ADMIN_COMMON_STEPS,
  profileStep,
  replayStep,
];

export const SUPERADMIN_TOUR_STEPS = [
  {
    welcome: true,
    route: '/admin/usuarios',
    title: '¡Bienvenido a Paciente360º!',
    body: 'Tenés acceso a todo el sistema. Te muestro cada sección.',
  },
  ...ADMIN_COMMON_STEPS.slice(0, 2),
  {
    target: 'users-tabs',
    route: '/admin/usuarios',
    title: 'Pestaña Administradores',
    body: 'Solo vos la ves: desde ahí das de alta y de baja a los administradores.',
  },
  ...ADMIN_COMMON_STEPS.slice(2),
  {
    target: ['nav-admin-bitacora', 'menu-button'],
    route: '/admin/bitacora',
    title: 'Bitácora',
    body: 'El registro de todo lo que pasa en el sistema: quién creó, modificó o borró qué, y cuándo.',
  },
  {
    target: 'bitacora-filters',
    route: '/admin/bitacora',
    title: 'Filtrá la bitácora',
    body: 'Por tabla y por tipo de acción, para encontrar rápido un cambio puntual.',
  },
  profileStep,
  replayStep,
];

// ---------------------------------------------------------------------------
// Que tutorial le toca a cada rol
// ---------------------------------------------------------------------------

const STEPS_BY_ROLE = {
  Nurse: NURSE_TOUR_STEPS,
  Doctor: DOCTOR_TOUR_STEPS,
  Administrative: ADMINISTRATIVE_TOUR_STEPS,
  Administrator: ADMINISTRATOR_TOUR_STEPS,
  Superadministrador: SUPERADMIN_TOUR_STEPS,
};

// Devuelve { key, steps } o null si el rol no tiene tutorial.
// La clave lleva el id del usuario: si dos personas usan la misma compu,
// cada una lo ve la primera vez que inicia sesion.
export function tourForRole(rol, userId) {
  if (userId == null) return null;
  if (rol === 'Patient') {
    return { key: patientTourKey(userId), steps: PATIENT_TOUR_STEPS };
  }
  const steps = STEPS_BY_ROLE[rol];
  return steps ? { key: `${rol.toLowerCase()}-${userId}`, steps } : null;
}
