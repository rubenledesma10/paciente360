export const CHECKLIST_RATINGS = ['Insatisfactorio', 'Requiere más práctica', 'Satisfactorio']

export const GUARD_PASS_CHECKLIST_SECTIONS = [
  {
    key: 'S',
    title: 'S — Situación (¿Cuál es el problema?)',
    items: [
      { n: 1, text: 'Identificó al paciente (nombre, habitación, diagnóstico).' },
      { n: 2, text: 'Describió el problema actual de forma concisa y clara.' },
      { n: 3, text: 'Mencionó la urgencia o necesidad de atención inmediata o mediata.' },
    ],
  },
  {
    key: 'B',
    title: 'B — Antecedentes (Información relevante)',
    items: [
      { n: 4, text: 'Comunicó los antecedentes clínicos importantes.' },
      { n: 5, text: 'Informó sobre la fecha de ingreso y el motivo de hospitalización.' },
      { n: 6, text: 'Mencionó los medicamentos actuales y tratamientos recientes.' },
      { n: 7, text: 'Se describió el estado de dolor, dieta y nivel de conciencia (si aplica).' },
    ],
  },
  {
    key: 'A',
    title: 'A — Evaluación (Lo que encontré/pienso)',
    items: [
      { n: 8, text: 'Reportó los signos vitales actuales (FC, FR, T°) y otros parámetros relevantes.' },
      { n: 9, text: 'Describió el estado general del paciente (neurológico, cardiovascular, respiratorio).' },
      { n: 10, text: 'Mencionó el estado de enfermería (intervenciones de enfermería, ej. balance hídrico, drenajes).' },
      { n: 11, text: 'Describió los resultados de pruebas recientes (si aplica).' },
    ],
  },
  {
    key: 'R',
    title: 'R — Recomendación (¿Qué necesito/sugiero?)',
    items: [
      { n: 12, text: 'Solicitó una evaluación médica o intervención específica.' },
      { n: 13, text: 'Indicó las acciones pendientes o que requieren seguimiento (ej. administración de medicación, monitoreo).' },
      { n: 14, text: 'Acordó el plan de cuidados para las próximas horas.' },
      { n: 15, text: 'Verificó la comprensión de la información por parte del receptor.' },
    ],
  },
  {
    key: 'GEN',
    title: 'Aspectos Generales',
    items: [
      { n: 16, text: 'Mantuvo comunicación fluida y respetuosa.' },
      { n: 17, text: 'Mantuvo la privacidad del paciente.' },
      { n: 18, text: 'Se aseguró de que el enfermero entrante tomó nota.' },
    ],
  },
]

export const GUARD_PASS_CHECKLIST_ITEMS = GUARD_PASS_CHECKLIST_SECTIONS.flatMap((s) => s.items)

export function emptyChecklistItems() {
  return GUARD_PASS_CHECKLIST_ITEMS.map((item) => ({ n: item.n, rating: null, observation: '' }))
}
