import client from './client'

export function getMedicalProducts() {
  return client.get('/medical-products/')
}

export function createMedicalProduct(payload) {
  return client.post('/medical-products/', payload)
}

export function updateMedicalProduct(id, payload) {
  return client.put(`/medical-products/${id}`, payload)
}
