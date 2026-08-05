import client from './client'

export function getMedicalIndications() {
  return client.get('/medical-indications/')
}

export function createMedicalIndication(payload) {
  return client.post('/medical-indications/', payload)
}

export function updateMedicalIndication(id, payload) {
  return client.put(`/medical-indications/${id}`, payload)
}

export function deleteMedicalIndication(id) {
  return client.delete(`/medical-indications/${id}`)
}
