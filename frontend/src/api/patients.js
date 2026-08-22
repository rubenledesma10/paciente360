import client from './client'

export function getPatients() {
  return client.get('/patients/')
}

export function createPatient(payload) {
  return client.post('/patients/', payload)
}

export function searchPatients(query) {
  return client.get('/patients/search', { params: { query } })
}

export function updatePatientAllergies(id, allergies) {
  return client.patch(`/patients/${id}/allergies`, { allergies })
}
