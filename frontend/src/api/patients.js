import client from './client';

export function getPatients() {
  return client.get('/patients/');
}

export function getPatient(id) {
  return client.get(`/patients/${id}`);
}

// Alta publica: la usa "Crear cuenta" del login y la reserva sin sesion.
export function createPatient(payload) {
  return client.post('/patients/', payload);
}
// Alta desde el panel de administracion. Es la version protegida: al pasar
// por un endpoint con JWT, la bitacora puede registrar quien creo al paciente.
export function createPatientPrivate(payload) {
  return client.post('/patients/private', payload);
}

export function updatePatient(id, payload) {
  return client.put(`/patients/${id}`, payload);
}

// Lo usa el enfermero desde Signos y síntomas: las alergias son el unico
// dato del paciente que puede editar sin pasar por el administrativo.
export function updatePatientAllergies(id, allergies) {
  return client.patch(`/patients/${id}/allergies`, { allergies });
}

// Baja logica: no se borra al paciente porque arrastraria por cascada
// sus turnos, seguimientos e historia clinica.
export function togglePatientStatus(id) {
  return client.patch(`/patients/${id}/toggle`);
}

export function searchPatients(query) {
  return client.get('/patients/search', { params: { query } });
}
