import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  Typography,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { PieChart } from '@mui/x-charts/PieChart'
import { BarChart } from '@mui/x-charts/BarChart'
import { LineChart } from '@mui/x-charts/LineChart'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'
import {
  getAttendedPatientsCount,
  getDiseaseReport,
  getSupplyConsumptionReport,
  getAbsenteeismReport,
  getLowStockProducts,
  getAttendedTrend,
  getExpiringProducts,
} from '../../api/stats'
import { drawPdfHeader, drawPdfFooter, PDF_HEADER_HEIGHT } from '../../utils/pdfBranding'
import { formatDate } from '../../utils/dateFormat'
import { paletteRaw } from '../../theme/theme'

const CHART_COLORS = [
  paletteRaw.azul,
  paletteRaw.celeste,
  paletteRaw.ok,
  paletteRaw.warn,
  paletteRaw.danger,
  paletteRaw.azulD,
  paletteRaw.celesteL,
]

function KpiCard({ label, value }) {
  return (
    <Paper sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="body2" color={paletteRaw.gray}>
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={800} color={paletteRaw.azulD}>
        {value}
      </Typography>
    </Paper>
  )
}

export default function EstadisticasPage() {
  const [dateFrom, setDateFrom] = useState(dayjs().subtract(29, 'day'))
  const [dateTo, setDateTo] = useState(dayjs())
  const [attendedTotal, setAttendedTotal] = useState(0)
  const [diseases, setDiseases] = useState([])
  const [supplyConsumption, setSupplyConsumption] = useState([])
  const [absenteeism, setAbsenteeism] = useState(null)
  const [lowStock, setLowStock] = useState([])
  const [trend, setTrend] = useState([])
  const [expiringProducts, setExpiringProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadReports = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const params = {
        date_from: dateFrom.format('YYYY-MM-DD'),
        date_to: dateTo.format('YYYY-MM-DD'),
      }
      const [attendedRes, diseasesRes, supplyRes, absenteeismRes, lowStockRes, trendRes, expiringRes] =
        await Promise.all([
          getAttendedPatientsCount(params),
          getDiseaseReport(params),
          getSupplyConsumptionReport(params),
          getAbsenteeismReport(params),
          getLowStockProducts(),
          getAttendedTrend(params),
          getExpiringProducts(),
        ])
      setAttendedTotal(attendedRes.data.total)
      setDiseases(diseasesRes.data)
      setSupplyConsumption(supplyRes.data)
      setAbsenteeism(absenteeismRes.data)
      setLowStock(lowStockRes.data)
      setTrend(trendRes.data)
      setExpiringProducts(expiringRes.data)
    } catch {
      setLoadError('No se pudieron cargar las estadísticas. Reintentá más tarde.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const diseasesData = diseases.map((d, index) => ({
    id: index,
    value: d.count,
    label: d.label,
  }))

  const supplyLabels = supplyConsumption.map((s) => s.type_product)
  const supplyValues = supplyConsumption.map((s) => s.total_quantity)

  const trendDates = trend.map((t) => dayjs(t.date).format('DD/MM'))
  const trendValues = trend.map((t) => t.count)

  const downloadStatsPdf = async () => {
    const doc = new jsPDF()
    const top = PDF_HEADER_HEIGHT + 10

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(paletteRaw.azulD)
    doc.text(
      `Período: ${dateFrom.format('DD/MM/YYYY')} — ${dateTo.format('DD/MM/YYYY')}`,
      14,
      top,
    )
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Pacientes atendidos: ${attendedTotal}`, 14, top + 7)
    doc.text(`Ausentismo: ${absenteeism ? absenteeism.absenteeism_rate : 0}%`, 14, top + 13)

    autoTable(doc, {
      startY: top + 20,
      margin: { top: PDF_HEADER_HEIGHT + 6 },
      head: [['Enfermedad', 'Cantidad']],
      body: diseases.map((d) => [d.label, d.count]),
      headStyles: { fillColor: paletteRaw.azulD, textColor: '#ffffff' },
    })

    autoTable(doc, {
      margin: { top: PDF_HEADER_HEIGHT + 6 },
      head: [['Categoría de insumo', 'Cantidad consumida']],
      body: supplyConsumption.map((s) => [s.type_product, s.total_quantity]),
      headStyles: { fillColor: paletteRaw.azulD, textColor: '#ffffff' },
    })

    autoTable(doc, {
      margin: { top: PDF_HEADER_HEIGHT + 6 },
      head: [['Insumo con stock bajo', 'Stock actual', 'Stock mínimo']],
      body: lowStock.map((p) => [p.name_product, p.current_stock, p.minimum_stock_level]),
      headStyles: { fillColor: paletteRaw.azulD, textColor: '#ffffff' },
    })

    autoTable(doc, {
      margin: { top: PDF_HEADER_HEIGHT + 6 },
      head: [['Insumo por vencer/vencido', 'Vencimiento', 'Estado']],
      body: expiringProducts.map((p) => [
        p.name_product,
        formatDate(p.expiration_date),
        p.vencido ? 'Vencido' : 'Por vencer',
      ]),
      headStyles: { fillColor: paletteRaw.azulD, textColor: '#ffffff' },
    })

    await drawPdfHeader(doc, 'Reporte de Estadísticas')
    drawPdfFooter(doc)
    doc.save(`estadisticas_${dateFrom.format('YYYY-MM-DD')}_${dateTo.format('YYYY-MM-DD')}.pdf`)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color={paletteRaw.azulD}>
            Estadísticas
          </Typography>
          <Typography variant="body2" color={paletteRaw.gray}>
            Reportes clínicos y de insumos por período
          </Typography>
        </Box>
        <Tooltip title="Descargar reporte en PDF">
          <span>
            <IconButton onClick={downloadStatsPdf} disabled={loading || !!loadError}>
              <PictureAsPdfIcon sx={{ color: paletteRaw.azul }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
        <DatePicker
          label="Desde"
          value={dateFrom}
          onChange={(value) => value && setDateFrom(value)}
          slotProps={{ textField: { size: 'small' } }}
        />
        <DatePicker
          label="Hasta"
          value={dateTo}
          onChange={(value) => value && setDateTo(value)}
          slotProps={{ textField: { size: 'small' } }}
        />
        <Button variant="contained" size="small" onClick={loadReports} disabled={loading}>
          Aplicar
        </Button>
      </Box>

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}
      {loading && <Typography color={paletteRaw.gray}>Cargando estadísticas...</Typography>}

      {!loading && !loadError && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <KpiCard label="Pacientes atendidos en el período" value={attendedTotal} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <KpiCard
                label="Ausentismo (turnos cancelados)"
                value={absenteeism ? `${absenteeism.absenteeism_rate}%` : '—'}
              />
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} color={paletteRaw.azulD} sx={{ mb: 1 }}>
              Pacientes atendidos por día
            </Typography>
            {trendValues.length === 0 || trendValues.every((v) => v === 0) ? (
              <Typography color={paletteRaw.gray}>Sin datos en el período seleccionado.</Typography>
            ) : (
              <LineChart
                xAxis={[{ scaleType: 'point', data: trendDates }]}
                series={[{ data: trendValues, label: 'Pacientes atendidos', color: paletteRaw.azul }]}
                height={260}
              />
            )}
          </Paper>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} color={paletteRaw.azulD} sx={{ mb: 1 }}>
                  Enfermedades por período
                </Typography>
                {diseasesData.length === 0 ? (
                  <Typography color={paletteRaw.gray}>Sin datos en el período seleccionado.</Typography>
                ) : (
                  <PieChart
                    series={[{ data: diseasesData, innerRadius: 40 }]}
                    colors={CHART_COLORS}
                    height={300}
                  />
                )}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} color={paletteRaw.azulD} sx={{ mb: 1 }}>
                  Consumo de insumos por período
                </Typography>
                {supplyLabels.length === 0 ? (
                  <Typography color={paletteRaw.gray}>Sin datos en el período seleccionado.</Typography>
                ) : (
                  <BarChart
                    xAxis={[{ scaleType: 'band', data: supplyLabels }]}
                    series={[{ data: supplyValues, label: 'Cantidad', color: paletteRaw.azul }]}
                    height={300}
                  />
                )}
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} color={paletteRaw.azulD} sx={{ mb: 1 }}>
              Insumos con stock bajo
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell>Categoría</TableCell>
                    <TableCell align="right">Stock actual</TableCell>
                    <TableCell align="right">Stock mínimo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lowStock.map((p) => (
                    <TableRow key={p.id_product}>
                      <TableCell>{p.name_product}</TableCell>
                      <TableCell>{p.type_product || '—'}</TableCell>
                      <TableCell align="right" sx={{ color: paletteRaw.danger, fontWeight: 600 }}>
                        {p.current_stock}
                      </TableCell>
                      <TableCell align="right">{p.minimum_stock_level}</TableCell>
                    </TableRow>
                  ))}
                  {lowStock.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ color: paletteRaw.gray }}>
                        No hay insumos con stock bajo en este momento.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} color={paletteRaw.azulD} sx={{ mb: 1 }}>
              Insumos por vencer / vencidos
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell>Vencimiento</TableCell>
                    <TableCell align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expiringProducts.map((p) => (
                    <TableRow key={p.id_product}>
                      <TableCell>{p.name_product}</TableCell>
                      <TableCell>{formatDate(p.expiration_date)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={p.vencido ? 'Vencido' : 'Por vencer'}
                          color={p.vencido ? 'error' : 'warning'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {expiringProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ color: paletteRaw.gray }}>
                        No hay insumos por vencer ni vencidos en este momento.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  )
}
