import client from './client';

// CRUD de administradores. Solo lo puede usar el Superadministrador.
export function getAdministrators() {
  return client.get('/administrator/');
}

export function createAdministrator(payload) {
  return client.post('/administrator/', payload);
}

export function updateAdministrator(id, payload) {
  return client.put(`/administrator/${id}`, payload);
}

export function toggleAdministratorStatus(id) {
  return client.patch(`/administrator/${id}/toggle`);
}
