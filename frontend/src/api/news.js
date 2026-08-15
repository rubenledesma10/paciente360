import client from './client';

export function getNews() {
  return client.get('/news_and_prevention/');
}

export function getNewsById(id) {
  return client.get(`/news_and_prevention/${id}`);
}

export function createNews(payload) {
  return client.post('/news_and_prevention/', payload);
}

export function updateNews(id, payload) {
  return client.put(`/news_and_prevention/${id}`, payload);
}

export function deleteNews(id) {
  return client.delete(`/news_and_prevention/${id}`);
}
