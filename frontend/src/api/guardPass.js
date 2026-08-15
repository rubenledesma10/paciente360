import client from './client';

export function getGuardPasses(date) {
  return client.get('/guard_pass/', { params: date ? { date } : {} });
}

export function createGuardPass(payload) {
  return client.post('/guard_pass/', payload);
}

export function updateGuardPass(id, payload) {
  return client.put(`/guard_pass/${id}`, payload);
}
