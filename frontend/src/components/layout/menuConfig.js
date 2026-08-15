import ThermostatIcon from '@mui/icons-material/Thermostat';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HomeIcon from '@mui/icons-material/Home';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import HistoryIcon from '@mui/icons-material/History';
import EventNoteIcon from '@mui/icons-material/EventNote';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';

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

// Menú del administrativo
export const ADMINISTRATIVE_MENU = [
  {
    id: 'admin-noticias',
    label: 'Noticias y novedades',
    icon: NewspaperIcon,
    path: '/admin/noticias',
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
};

export function menuForRole(rol) {
  if (rol === 'Nurse') return NURSE_MENU;
  if (rol === 'Patient') return PATIENT_MENU;
  if (rol === 'Doctor') return DOCTOR_MENU;
  if (rol === 'Administrative') return ADMINISTRATIVE_MENU;
  return DEFAULT_MENU;
}

export function routeTitle(rol, pathname) {
  const menu = menuForRole(rol);
  const found = menu.find((item) => pathname.startsWith(item.path));
  return found ? found.label : 'Paciente360º';
}
