import client from './client';

export function getAdministratives() {
  return client.get('/administrative/');
}

export function createAdministrative(payload) {
  return client.post('/administrative/', payload);
}

export function updateAdministrative(id, payload) {
  return client.put(`/administrative/${id}`, payload);
}

export function toggleAdministrativeStatus(id) {
  return client.patch(`/administrative/${id}/toggle`);
}
