import client from './client'

export function getAttendedPatientsCount(params) {
  return client.get('/stats/attended-patients-count', { params })
}

export function getDiseaseReport(params) {
  return client.get('/stats/diseases', { params })
}

export function getSupplyConsumptionReport(params) {
  return client.get('/stats/supply-consumption', { params })
}

export function getAbsenteeismReport(params) {
  return client.get('/stats/absenteeism', { params })
}

export function getLowStockProducts() {
  return client.get('/stats/low-stock')
}

export function getAttendedTrend(params) {
  return client.get('/stats/attended-trend', { params })
}

export function getExpiringProducts() {
  return client.get('/stats/expiring-products')
}
