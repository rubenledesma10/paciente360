export function roleHome(rol) {
  if (rol === 'Nurse') return '/signos';
  if (rol === 'Patient') return '/noticias';
  return '/inicio';
}
