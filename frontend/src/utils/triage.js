// Escala Manchester de triage. Los valores deben coincidir con TRIAGE_LEVELS del backend.
export const TRIAGE_LEVELS = [
  { value: 'Rojo', description: 'Inmediato', color: '#d32f2f', textColor: '#fff' },
  { value: 'Naranja', description: 'Muy urgente', color: '#ef6c00', textColor: '#fff' },
  { value: 'Amarillo', description: 'Urgente', color: '#fbc02d', textColor: '#000' },
  { value: 'Verde', description: 'Poco urgente', color: '#388e3c', textColor: '#fff' },
  { value: 'Azul', description: 'No urgente', color: '#1976d2', textColor: '#fff' },
]

export const getTriageLevel = (value) => TRIAGE_LEVELS.find((t) => t.value === value) || null
