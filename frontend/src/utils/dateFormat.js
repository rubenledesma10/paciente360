import dayjs from 'dayjs'

export function formatDateTime(value) {
  if (!value) return '—'
  const d = dayjs(value)
  return d.isValid() ? d.format('DD/MM/YYYY HH:mm') : value
}

export function formatDate(value) {
  if (!value) return '—'
  const d = dayjs(value)
  return d.isValid() ? d.format('DD/MM/YYYY') : value
}

export function nowIso() {
  return dayjs().toISOString()
}
