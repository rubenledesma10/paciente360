import client from './client';

export function getNurses() {
  return client.get('/nurses/');
}
