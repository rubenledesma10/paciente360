import { paletteRaw } from '../theme/theme'

const PAGE_WIDTH = 210
const HEADER_HEIGHT = 30

// Dibuja el encabezado institucional (marca + título del documento) en la página actual.
export function drawPdfHeader(doc, documentTitle) {
  doc.setFillColor(paletteRaw.azulD)
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F')
  doc.setFillColor(paletteRaw.celeste)
  doc.rect(0, HEADER_HEIGHT, PAGE_WIDTH, 1.2, 'F')

  // Isotipo: cruz de salud dentro de un círculo blanco.
  const cx = 22
  const cy = 15
  doc.setFillColor('#ffffff')
  doc.circle(cx, cy, 9, 'F')
  doc.setFillColor(paletteRaw.azul)
  doc.rect(cx - 1.8, cy - 5.5, 3.6, 11, 'F')
  doc.rect(cx - 5.5, cy - 1.8, 11, 3.6, 'F')

  doc.setTextColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Paciente 360', 37, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(paletteRaw.celesteL)
  doc.text('Sistema de Gestión de Pacientes', 37, 20)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor('#ffffff')
  doc.text(documentTitle, PAGE_WIDTH - 14, 14, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(paletteRaw.celesteL)
  doc.text(`Emitido el ${new Date().toLocaleString('es-AR')}`, PAGE_WIDTH - 14, 20, { align: 'right' })

  doc.setTextColor(paletteRaw.ink)
}

// Agrega el pie de página (leyenda + numeración) a todas las páginas ya generadas.
export function drawPdfFooter(doc) {
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    doc.setDrawColor(paletteRaw.celeste)
    doc.setLineWidth(0.3)
    doc.line(14, pageHeight - 16, PAGE_WIDTH - 14, pageHeight - 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(paletteRaw.gray)
    doc.text('Documento generado automáticamente por Paciente 360', 14, pageHeight - 11)
    doc.text(`Página ${i} de ${pageCount}`, PAGE_WIDTH - 14, pageHeight - 11, { align: 'right' })
  }
}

export const PDF_HEADER_HEIGHT = HEADER_HEIGHT
