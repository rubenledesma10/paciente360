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

export function downloadMedicalHistoryPdf({
  patientName,
  patientDni,
  patientAge,
  healthPlanName,
  memberNumber,
  events,
}) {
  const doc = new jsPDF()
  const patientBoxTop = PDF_HEADER_HEIGHT + 10

  doc.setDrawColor(paletteRaw.celeste)
  doc.setFillColor(paletteRaw.celesteXL)
  doc.roundedRect(14, patientBoxTop, 182, 20, 2, 2, 'FD')
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

  autoTable(doc, {
    startY: patientBoxTop + 26,
    margin: { top: PDF_HEADER_HEIGHT + 6 },
    head: [['Tipo', 'Fecha', 'Detalle']],
    body: events.map((evento) => [
      evento.tipo,
      evento.fecha ? formatDateTime(evento.fecha) : '—',
      buildEventDetailText(evento),
    ]),
    headStyles: { fillColor: paletteRaw.azulD, textColor: '#ffffff' },
    styles: { textColor: paletteRaw.ink, lineColor: paletteRaw.celeste },
    columnStyles: { 2: { cellWidth: 90 } },
  })

  drawPdfHeader(doc, 'Historia Clínica')
  drawPdfFooter(doc)

  const dateSuffix = dayjs().format('YYYY-MM-DD')
  const safeName = (patientName || 'paciente').replace(/\s+/g, '_')
  doc.save(`historia_clinica_${safeName}_${patientDni || ''}_${dateSuffix}.pdf`)
}
