import client from './client';

// CRUD de superadministradores. Solo lo puede usar el Superadministrador.
export function getSuperadmins() {
  return client.get('/superadministrator/');
}

export function createSuperadmin(payload) {
  return client.post('/superadministrator/', payload);
}

export function updateSuperadmin(id, payload) {
  return client.put(`/superadministrator/${id}`, payload);
}

export function toggleSuperadminStatus(id) {
  return client.patch(`/superadministrator/${id}/toggle`);
}
