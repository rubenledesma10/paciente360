// URL base del endpoint de seguimientos en el backend
const API_URL = 'http://localhost:5000/api/follow-ups';

// Trae todos los seguimientos
export async function getAllFollowUps() {
  const response = await fetch(`${API_URL}/`);
  if (!response.ok) {
    throw new Error('Error al traer los seguimientos');
  }
  return await response.json();
}

// Trae los seguimientos pendientes
export async function getPendingFollowUps(nurseId) {
  const url = nurseId
    ? `${API_URL}/pending?id_nurse=${nurseId}`
    : `${API_URL}/pending`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Error al traer los seguimientos pendientes');
  }
  return await response.json();
}

// Marca un seguimiento como finalizado (o lo reactiva)
export async function toggleFinishFollowUp(followUpId) {
  const response = await fetch(`${API_URL}/${followUpId}/finish`, {
    method: 'PATCH',
  });
  if (!response.ok) {
    throw new Error('Error al cambiar el estado del seguimiento');
  }
  return await response.json();
}

// Crea un nuevo seguimiento
export async function createFollowUp(data) {
  const response = await fetch(`${API_URL}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Error al crear el seguimiento');
  }
  return await response.json();
}
