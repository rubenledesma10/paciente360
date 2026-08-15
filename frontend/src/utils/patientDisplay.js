import dayjs from 'dayjs'

export function getPatientAge(dateOfBirth) {
  if (!dateOfBirth) return null
  return dayjs().diff(dayjs(dateOfBirth), 'year')
}

export function getPatientDni(patient) {
  return patient?.dni || '—'
}

export function formatPatientLabel(patient) {
  if (!patient) return '—'
  const age = getPatientAge(patient.date_of_birth)
  return `${patient.first_name} ${patient.last_name} — DNI ${getPatientDni(patient)}${
    age != null ? ` — ${age} años` : ''
  }`
}
