import client from './client'

export function getStockMovements() {
  return client.get('/stock-movements/')
}

export function createStockMovement(payload) {
  return client.post('/stock-movements/', payload)
}
