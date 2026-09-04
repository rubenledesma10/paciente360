import client from './client';

// Explicacion en lenguaje simple de una noticia. El backend toma el texto
// de la base a partir del id: desde el front no se manda contenido.
export function simplifyNews(id) {
  return client.post(`/ai/news/${id}/simplify`);
}

// Conversacion sobre una noticia. history: [{ role: 'user'|'assistant', text }]
// El historial vive en el front y se manda completo en cada pregunta.
export function chatAboutNews(id, question, history = []) {
  return client.post(`/ai/news/${id}/chat`, { question, history });
}
