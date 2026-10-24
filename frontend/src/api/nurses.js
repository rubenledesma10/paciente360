import client from './client';

export function getNurses() {
  return client.get('/nurses/');
}

export function getNurse(id) {
  return client.get(`/nurses/${id}`);
}

export function createNurse(payload) {
  return client.post('/nurses/', payload);
}

export function updateNurse(id, payload) {
  return client.put(`/nurses/${id}`, payload);
}

// Baja logica: la cuenta deja de poder entrar pero se conservan
// los registros clinicos que el enfermero firmo.
export function toggleNurseStatus(id) {
  return client.patch(`/nurses/${id}/toggle`);
}

export function searchNurses(query) {
  return client.get('/nurses/search', { params: { query } });
}
