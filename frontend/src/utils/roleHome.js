export function roleHome(rol) {
  if (rol === 'Nurse') return '/signos';
  if (rol === 'Patient') return '/mis-turnos';
  if (rol === 'Doctor') return '/indicaciones';
  if (rol === 'Administrative') return '/admin/noticias';
  return '/inicio';
}
