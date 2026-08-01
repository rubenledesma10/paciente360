import ThermostatIcon from '@mui/icons-material/Thermostat';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HomeIcon from '@mui/icons-material/Home';
import NewspaperIcon from '@mui/icons-material/Newspaper'; // ← nuevo

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

// Menú del paciente ← nuevo
export const PATIENT_MENU = [
  {
    id: 'noticias',
    label: 'Noticias y prevención',
    icon: NewspaperIcon,
    path: '/noticias',
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
  if (rol === 'Patient') return PATIENT_MENU; // ← nuevo
  return DEFAULT_MENU;
}

export function routeTitle(rol, pathname) {
  const menu = menuForRole(rol);
  const found = menu.find((item) => pathname.startsWith(item.path));
  return found ? found.label : 'Paciente360º';
}
