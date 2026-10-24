import client from './client';

export function getDoctors() {
  return client.get('/doctors/');
}

export function createDoctor(payload) {
  return client.post('/doctors/', payload);
}

export function updateDoctor(id, payload) {
  return client.put(`/doctors/${id}`, payload);
}

// Baja logica: la cuenta se desactiva, no se borra, para conservar los
// turnos, diagnosticos e indicaciones que el medico firmo.
export function toggleDoctorStatus(id) {
  return client.patch(`/doctors/${id}/toggle`);
}
