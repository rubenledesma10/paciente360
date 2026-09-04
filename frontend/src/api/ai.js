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

// Resumen clinico de un paciente para preparar la consulta. Solo medicos.
export function getPatientSummary(patientId) {
  return client.get(`/ai/patients/${patientId}/summary`);
}

// Chatbot de ayuda sobre el uso de la app. Funciona con y sin sesion;
// el backend adapta la respuesta al rol si hay token.
export function askAssistant(question, history = [], path = '') {
  return client.post('/ai/assistant', { question, history, path });
}

// Sugerencia de especialidad a partir de lo que cuenta la persona.
// Devuelve { urgente, mensaje, sugerencias: [{ id, nombre, motivo }] }
export function suggestSpecialty(description) {
  return client.post('/ai/specialty-suggest', { description });
}
