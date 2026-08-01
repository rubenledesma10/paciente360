import client from './client';

export function getNews() {
  return client.get('/news_and_prevention/');
}

export function getNewsById(id) {
  return client.get(`/news_and_prevention/${id}`);
}
