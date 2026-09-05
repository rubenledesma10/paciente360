export function roleHome(rol) {
  if (rol === 'Nurse') return '/signos';
  if (rol === 'Patient') return '/mis-turnos';
  if (rol === 'Doctor') return '/agenda';
  if (rol === 'Administrative') return '/admin/turnos';
  if (rol === 'Administrator') return '/admin/usuarios';
  if (rol === 'Superadministrador') return '/admin/usuarios';
  return '/inicio';
}
