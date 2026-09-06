import ThermostatIcon from '@mui/icons-material/Thermostat';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HomeIcon from '@mui/icons-material/Home';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import HistoryIcon from '@mui/icons-material/History';
import EventNoteIcon from '@mui/icons-material/EventNote';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import ListAltIcon from '@mui/icons-material/ListAlt';

export const NURSE_MENU = [
  {
    id: 'signos',
    label: 'Signos y síntomas',
    icon: ThermostatIcon,
    path: '/signos',
  },
  {
    id: 'seguimiento',
    label: 'Seguimiento',
    icon: MonitorHeartIcon,
    path: '/seguimiento',
  },
  { id: 'stock', label: 'Stock', icon: Inventory2Icon, path: '/stock' },
  {
    id: 'guardia',
    label: 'Pase de guardia',
    icon: AssignmentIcon,
    path: '/guardia',
  },
  {
    id: 'estadisticas',
    label: 'Estadísticas',
    icon: BarChartIcon,
    path: '/estadisticas',
  },
];

export const PATIENT_MENU = [
  {
    id: 'sacar-turno',
    label: 'Sacar turno',
    icon: EventAvailableIcon,
    path: '/sacar-turno',
  },
  {
    id: 'mis-turnos',
    label: 'Mis turnos',
    icon: EventNoteIcon,
    path: '/mis-turnos',
  },
  {
    id: 'noticias',
    label: 'Noticias y prevención',
    icon: NewspaperIcon,
    path: '/noticias',
  },
];

export const DOCTOR_MENU = [
  { id: 'agenda', label: 'Mis turnos', icon: EventNoteIcon, path: '/agenda' },
  {
    id: 'indicaciones',
    label: 'Indicaciones médicas',
    icon: AssignmentIcon,
    path: '/indicaciones',
  },
  {
    id: 'historia-clinica',
    label: 'Historia clínica',
    icon: HistoryIcon,
    path: '/historia-clinica',
  },
];

// Administrativo: operatoria de la salita
export const ADMINISTRATIVE_MENU = [
  {
    id: 'admin-turnos',
    label: 'Gestión de turnos',
    icon: EventNoteIcon,
    path: '/admin/turnos',
  },
  {
    id: 'admin-noticias',
    label: 'Noticias y novedades',
    icon: NewspaperIcon,
    path: '/admin/noticias',
  },
];

// Administrador: gestion completa del sistema
export const ADMINISTRATOR_MENU = [
  {
    id: 'admin-usuarios',
    label: 'Usuarios',
    icon: PeopleIcon,
    path: '/admin/usuarios',
  },
  {
    id: 'admin-turnos',
    label: 'Turnos',
    icon: EventNoteIcon,
    path: '/admin/turnos',
  },
  {
    id: 'admin-noticias',
    label: 'Noticias',
    icon: NewspaperIcon,
    path: '/admin/noticias',
  },
  {
    id: 'admin-stock',
    label: 'Stock',
    icon: Inventory2Icon,
    path: '/admin/stock',
  },
  {
    id: 'admin-historia',
    label: 'Historia clínica',
    icon: HistoryIcon,
    path: '/admin/historia-clinica',
  },
  {
    id: 'admin-guardia',
    label: 'Pase de guardia',
    icon: AssignmentIcon,
    path: '/admin/guardia',
  },
];

// Superadministrador: todo lo del administrador, mas administradores y bitacora
// Los administradores ya no tienen pantalla propia: son una pestaña mas
// dentro de Usuarios, visible solo para el superadmin.
export const SUPERADMIN_MENU = [
  ...ADMINISTRATOR_MENU,
  {
    id: 'admin-bitacora',
    label: 'Bitácora',
    icon: ListAltIcon,
    path: '/admin/bitacora',
  },
];

export const DEFAULT_MENU = [
  { id: 'inicio', label: 'Inicio', icon: HomeIcon, path: '/inicio' },
];

export const ROLE_LABELS = {
  Nurse: 'Enfermero',
  Doctor: 'Médico',
  Patient: 'Paciente',
  Administrative: 'Administrativo',
  Administrator: 'Administrador',
  Superadministrador: 'Superadministrador',
};

export function menuForRole(rol) {
  if (rol === 'Nurse') return NURSE_MENU;
  if (rol === 'Patient') return PATIENT_MENU;
  if (rol === 'Doctor') return DOCTOR_MENU;
  if (rol === 'Administrative') return ADMINISTRATIVE_MENU;
  if (rol === 'Administrator') return ADMINISTRATOR_MENU;
  if (rol === 'Superadministrador') return SUPERADMIN_MENU;
  return DEFAULT_MENU;
}

export function routeTitle(rol, pathname) {
  const menu = menuForRole(rol);
  // Se busca la coincidencia mas larga: /admin/historia-clinica no debe
  // caer en /admin/... de otro item por ser prefijo
  const found = [...menu]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => pathname.startsWith(item.path));
  return found ? found.label : 'Paciente360º';
}
