import client from './client'

export function getAppointmentsByPatient(patientId) {
  return client.get(`/appointments/patient/${patientId}`)
}
