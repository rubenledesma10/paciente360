import client from './client'

export function getSignsAndSymptoms() {
  return client.get('/signs_and_symptoms/')
}

export function createSignsAndSymptoms(payload) {
  return client.post('/signs_and_symptoms/', payload)
}

export function updateSignsAndSymptoms(id, payload) {
  return client.put(`/signs_and_symptoms/${id}`, payload)
}

export function deleteSignsAndSymptoms(id) {
  return client.delete(`/signs_and_symptoms/${id}`)
}
