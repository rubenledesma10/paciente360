import client from './client';

// El backend acepta multipart/form-data para poder mandar la imagen.
// Si no hay foto, igual va como FormData: simplifica y el backend lo lee igual.
function buildFormData(payload) {
  const formData = new FormData();
  formData.append('title', payload.title ?? '');
  formData.append('content', payload.content ?? '');
  formData.append('category', payload.category ?? '');
  if (payload.photo instanceof File) {
    formData.append('photo', payload.photo);
  }
  return formData;
}

// Content-Type en undefined para que el navegador arme el boundary del multipart.
// Si lo dejamos en application/json (default del client), el backend no puede parsearlo.
const multipartConfig = { headers: { 'Content-Type': undefined } };

export function getNews() {
  return client.get('/news_and_prevention/');
}

export function getNewsById(id) {
  return client.get(`/news_and_prevention/${id}`);
}

export function getNewsByCategory(category) {
  return client.get(`/news_and_prevention/category/${category}`);
}

export function createNews(payload) {
  return client.post(
    '/news_and_prevention/',
    buildFormData(payload),
    multipartConfig,
  );
}

export function updateNews(id, payload) {
  return client.put(
    `/news_and_prevention/${id}`,
    buildFormData(payload),
    multipartConfig,
  );
}

export function deleteNews(id) {
  return client.delete(`/news_and_prevention/${id}`);
}
