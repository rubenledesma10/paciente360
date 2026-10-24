import client from './client';

export function getFollowUps() {
  return client.get('/follow-ups/');
}

export function createFollowUp(payload) {
  return client.post('/follow-ups/', payload);
}

export function toggleFollowUpFinish(id) {
  return client.patch(`/follow-ups/${id}/finish`);
}

export function updateFollowUp(id, payload) {
  return client.put(`/follow-ups/${id}`, payload);
}
