import client from './client'

export function getGuardPasses() {
  return client.get('/guard_pass/')
}

export function createGuardPass(payload) {
  return client.post('/guard_pass/', payload)
}
