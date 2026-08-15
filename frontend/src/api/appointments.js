import client from './client';

export function getAppointments() {
  return client.get('/appointments/');
}

export function getAppointmentsByPatient(patientId) {
  return client.get(`/appointments/patient/${patientId}`);
}

export function confirmAppointment(id) {
  return client.patch(`/appointments/${id}/confirm`);
<<<<<<< HEAD
}
=======
}

// --- Reserva de turno (HU-07) ---

export function getSpecialties() {
  return client.get('/appointments/specialties');
}

export function getDoctorsBySpecialty(specialtyId) {
  return client.get(`/appointments/specialties/${specialtyId}/doctors`);
}

export function getAvailableSlots(doctorId, date) {
  return client.get('/appointments/available-slots', {
    params: { id_doctor: doctorId, date },
  });
}

export function createMyAppointment(payload) {
  return client.post('/appointments/me', payload);
}

export function cancelAppointment(id) {
  return client.patch(`/appointments/${id}/cancel`);
}
>>>>>>> 8e80fc4ba4cb471b5a53b7a6d79d00376fa2b7f5
