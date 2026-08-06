import client from './client'

export function getMedicalHistory(patientId) {
  return client.get(`/medical-history/${patientId}`)
}
