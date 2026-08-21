import { paletteRaw } from '../theme/theme'
import logoUrl from '../assets/logo.png'

const PAGE_WIDTH = 210
const HEADER_HEIGHT = 30

// jsPDF.addImage necesita un data URL, no la URL de archivo que devuelve el import de
// Vite (logo.png pesa más que el límite de inlineo automático). Se busca una sola vez
// y se cachea la conversión para no repetirla en cada PDF.
let logoDataUrlPromise = null
function getLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        // Recorta el logo a círculo (con fondo blanco donde el PNG es transparente)
        // antes de pasarlo a addImage, que no soporta recortes por sí solo.
        const size = img.naturalWidth || 512
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.clip()
        ctx.drawImage(img, 0, 0, size, size)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = logoUrl
    })
  }
  return logoDataUrlPromise
}

// Dibuja el encabezado institucional (marca + título del documento) en la página actual.
export async function drawPdfHeader(doc, documentTitle) {
  doc.setFillColor(paletteRaw.azulD)
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F')
  doc.setFillColor(paletteRaw.celeste)
  doc.rect(0, HEADER_HEIGHT, PAGE_WIDTH, 1.2, 'F')

  const logoDataUrl = await getLogoDataUrl()
  doc.addImage(logoDataUrl, 'PNG', 13, 6, 18, 18)

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
