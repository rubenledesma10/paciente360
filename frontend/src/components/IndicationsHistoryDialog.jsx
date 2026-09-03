import { useEffect, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import dayjs from 'dayjs'
import { getMedicalIndicationsByPatient } from '../api/medicalIndications'
import { formatDateTime } from '../utils/dateFormat'
import { paletteRaw } from '../theme/theme'

const UNLINKED_KEY = 'sin-turno'

function groupByAppointment(rows) {
  const groups = new Map()
  rows.forEach((r) => {
    const key = r.id_medical_appointment ?? UNLINKED_KEY
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        appointmentDate: r.appointment_date || null,
        appointmentReason: r.appointment_reason || null,
        items: [],
      })
    }
    groups.get(key).items.push(r)
  })
  return Array.from(groups.values())
}

export default function IndicationsHistoryDialog({
  open,
  onClose,
  patientId,
  patientName,
  patientDni,
  patientAge,
}) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState('desc')

  useEffect(() => {
    if (!open || !patientId) return
    setError('')
    setLoading(true)
    getMedicalIndicationsByPatient(patientId)
      .then((res) => setRows(res.data))
      .catch(() => setError('No se pudo cargar el historial de indicaciones.'))
      .finally(() => setLoading(false))
  }, [open, patientId])

  const groupSortValue = (group) => {
    if (group.key === UNLINKED_KEY) return -Infinity
    return dayjs(group.appointmentDate).valueOf()
  }

  const groups = groupByAppointment(rows).sort((a, b) => {
    const diff = groupSortValue(a) - groupSortValue(b)
    return order === 'asc' ? diff : -diff
  })

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800} color={paletteRaw.azulD}>
            Historial de indicaciones
          </Typography>
          <Typography variant="caption" color={paletteRaw.gray}>
            {patientName}
            {patientDni && ` — DNI ${patientDni}`}
            {patientAge != null && ` — ${patientAge} años`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={order === 'desc' ? 'Más antigua primero' : 'Más reciente primero'}>
            <IconButton size="small" onClick={() => setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}>
              <SwapVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error">{error}</Alert>}
        {loading && <Typography color={paletteRaw.gray}>Cargando historial...</Typography>}
        {!loading && !error && groups.length === 0 && (
          <Typography color={paletteRaw.gray}>
            Este paciente todavía no tiene indicaciones registradas.
          </Typography>
        )}
        {!loading &&
          !error &&
          groups.map((group) => (
            <Accordion key={group.key} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={700} color={paletteRaw.azulD}>
                  {group.key === UNLINKED_KEY
                    ? 'Sin turno asociado'
                    : `Atención del ${dayjs(group.appointmentDate).format('DD/MM/YYYY')}${
                        group.appointmentReason ? ` — ${group.appointmentReason}` : ''
                      }`}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {group.items.map((r, index) => (
                  <Box key={r.id_medical_indication} sx={{ mb: index < group.items.length - 1 ? 2 : 0 }}>
                    <Typography variant="caption" color={paletteRaw.gray}>
                      {formatDateTime(r.created_at)} — {r.doctor_name || '—'}
                    </Typography>
                    <Typography variant="body2" color={paletteRaw.ink}>
                      {r.indication}
                    </Typography>
                    {r.treatment && (
                      <Typography variant="caption" color={paletteRaw.gray}>
                        Tratamiento: {r.treatment}
                      </Typography>
                    )}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
      </DialogContent>
    </Dialog>
  )
}
