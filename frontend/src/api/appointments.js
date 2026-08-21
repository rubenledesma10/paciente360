import client from './client';

// --- Consulta ---

export function getAppointments(params) {
  // params opcionales para la pantalla del administrativo:
  // { date: 'YYYY-MM-DD', id_doctor: 1, status: 'Reservado' }
  return client.get('/appointments/', { params });
}

export function getAppointmentsByPatient(patientId) {
  return client.get(`/appointments/patient/${patientId}`);
}

export function getAppointmentById(id) {
  return client.get(`/appointments/${id}`);
}

// --- Reserva ---

export function getSpecialties() {
  return client.get('/appointments/specialties');
}

export function getDoctorsBySpecialty(specialtyId) {
  return client.get(`/appointments/specialties/${specialtyId}/doctors`);
}

// Pacientes efectivamente atendidos en una fecha.
// Lo usa el enfermero para el desplegable de nuevo seguimiento.
export function getAttendedPatients(params) {
  // params: { date: 'YYYY-MM-DD', id_doctor: 1 } — ambos opcionales
  return client.get('/appointments/attended-patients', { params });
}

// Pacientes con turno hoy en estado En espera y/o Atendido.
// Lo usan Indicaciones médicas y Signos y síntomas para sus desplegables de alta.
export function getPatientsByStatus(params) {
  // params: { date: 'YYYY-MM-DD', id_doctor: 1, status: 'En espera,Atendido' } — todos opcionales
  return client.get('/appointments/patients-by-status', { params });
}

export function getAvailableSlots(doctorId, date) {
  return client.get('/appointments/available-slots', {
    params: { id_doctor: doctorId, date },
  });
}

// Reserva sin login. El backend valida la identidad con DNI + fecha de nacimiento
// si el DNI ya esta registrado.
export function createPublicAppointment(payload) {
  return client.post('/appointments/public', payload);
}

// Reserva del paciente logueado
export function createMyAppointment(payload) {
  return client.post('/appointments/me', payload);
}

// Alta por parte del administrativo. Con is_overbooking: true se saltea
// la validación de solapamiento del médico (sobreturno por urgencia).
export function createAppointmentAsAdmin(payload) {
  return client.post('/appointments/', payload);
}

// --- Acciones sobre un turno ---

export function confirmAppointment(id) {
  return client.patch(`/appointments/${id}/confirm`);
}

// Sirve para el paciente (hasta 8 hs antes) y para el administrativo
export function cancelAppointment(id) {
  return client.patch(`/appointments/${id}/cancel`);
}

export function rescheduleAppointment(id, payload) {
  return client.put(`/appointments/${id}/reschedule`, payload);
}

export function updateAppointment(id, payload) {
  return client.put(`/appointments/${id}`, payload);
}

export function updateAppointmentStatus(id, status) {
  return client.patch(`/appointments/${id}/status`, { status });
}

// Estados a los que puede pasar el turno segun su estado actual
export function getAllowedTransitions(id) {
  return client.get(`/appointments/${id}/transitions`);
}

export function deleteAppointment(id) {
  return client.delete(`/appointments/${id}`);
}
