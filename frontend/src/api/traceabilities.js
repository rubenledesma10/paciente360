import client from './client'

export function getTraceabilities() {
  return client.get('/traceabilities/')
}

export function createTraceability(payload) {
  return client.post('/traceabilities/', payload)
}
