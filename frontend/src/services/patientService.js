const API_URL = 'http://localhost:5000/api/patients';

// Trae todos los pacientes
export async function getAllPatients() {
  const response = await fetch(`${API_URL}/`);
  if (!response.ok) {
    throw new Error('Error al traer los pacientes');
  }
  return await response.json();
}
