import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'
import { paletteRaw } from '../theme/theme'
import { formatDate, formatDateTime } from './dateFormat'
import { drawPdfHeader, drawPdfFooter, PDF_HEADER_HEIGHT } from './pdfBranding'

function buildEventDetailText(evento) {
  const d = evento.detalle
  if (evento.tipo === 'Signos y Síntomas') {
    const parts = [`Temp: ${d.temperature ?? '—'}°C · Presión: ${d.blood_pressure || '—'}`]
    if (d.signs) parts.push(`Signos: ${d.signs}`)
    if (d.symptoms) parts.push(`Síntomas: ${d.symptoms}`)
    if (d.observations) parts.push(`Observación: ${d.observations}`)
    return parts.join('\n')
  }
  if (evento.tipo === 'Seguimiento') {
    const parts = [d.observations || 'Sin observaciones']
    if (d.next_check_up) parts.push(`Próximo control: ${formatDate(d.next_check_up)}`)
    return parts.join('\n')
  }
  const parts = [d.indication]
  if (d.treatment) parts.push(`Tratamiento: ${d.treatment}`)
  return parts.join('\n')
}

function getAttendedByName(evento) {
  if (evento.doctor_name) return `Médico: ${evento.doctor_name}`
  if (evento.nurse_name) return `Enfermero/a: ${evento.nurse_name}`
  return '—'
}

export async function downloadMedicalHistoryPdf({
  patientName,
  patientDni,
  patientAge,
  healthPlanName,
  memberNumber,
  allergies,
  events,
}) {
  const doc = new jsPDF()
  const patientBoxTop = PDF_HEADER_HEIGHT + 10
  const boxHeight = allergies ? 27 : 20

  doc.setDrawColor(paletteRaw.celeste)
  doc.setFillColor(paletteRaw.celesteXL)
  doc.roundedRect(14, patientBoxTop, 182, boxHeight, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(paletteRaw.azulD)
  doc.text(patientName, 20, patientBoxTop + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(paletteRaw.gray)
  const obraSocial = healthPlanName
    ? `Obra social: ${healthPlanName}${memberNumber ? ` (N° afiliado: ${memberNumber})` : ''}`
    : null
  const subtitle = [
    patientDni && `DNI ${patientDni}`,
    patientAge != null && `${patientAge} años`,
    obraSocial,
  ]
    .filter(Boolean)
    .join(' — ')
  doc.text(subtitle || ' ', 20, patientBoxTop + 15)
  if (allergies) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(paletteRaw.danger)
    doc.text(`Alergias: ${allergies}`, 20, patientBoxTop + 22)
  }

  autoTable(doc, {
    startY: patientBoxTop + boxHeight + 6,
    margin: { top: PDF_HEADER_HEIGHT + 6 },
    head: [['Tipo', 'Fecha', 'Detalle', 'Atendido por']],
    body: events.map((evento) => [
      evento.tipo,
      evento.fecha ? formatDateTime(evento.fecha) : '—',
      buildEventDetailText(evento),
      getAttendedByName(evento),
    ]),
    headStyles: { fillColor: paletteRaw.azulD, textColor: '#ffffff' },
    styles: { textColor: paletteRaw.ink, lineColor: paletteRaw.celeste },
    columnStyles: { 2: { cellWidth: 74 }, 3: { cellWidth: 38 } },
  })

  await drawPdfHeader(doc, 'Historia Clínica')
  drawPdfFooter(doc)

  const dateSuffix = dayjs().format('YYYY-MM-DD')
  const safeName = (patientName || 'paciente').replace(/\s+/g, '_')
  doc.save(`historia_clinica_${safeName}_${patientDni || ''}_${dateSuffix}.pdf`)
}
