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
