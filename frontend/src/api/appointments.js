import client from './client';

export function getAppointments() {
  return client.get('/appointments/');
}

export function getAppointmentsByPatient(patientId) {
  return client.get(`/appointments/patient/${patientId}`);
}

export function confirmAppointment(id) {
  return client.patch(`/appointments/${id}/confirm`);
}
