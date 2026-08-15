<<<<<<< HEAD
import client from './client'

export function getAppointmentsByPatient(patientId) {
  return client.get(`/appointments/patient/${patientId}`)
=======
import client from './client';

export function getAppointments() {
  return client.get('/appointments/');
}

export function getAppointmentsByPatient(patientId) {
  return client.get(`/appointments/patient/${patientId}`);
}

export function confirmAppointment(id) {
  return client.patch(`/appointments/${id}/confirm`);
>>>>>>> fa8bc9f489614fffffee19b8dccef2123f380400
}
