// URL base del endpoint de noticias en el backend
const API_URL = 'http://localhost:5000/api/news_and_prevention';

// Traemos todas las noticias del backend
export async function getAllNews() {
  const response = await fetch(`${API_URL}/`);
  if (!response.ok) {
    throw new Error('Error al traer las noticias');
  }
  return await response.json();
}
