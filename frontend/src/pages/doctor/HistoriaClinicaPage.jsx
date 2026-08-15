import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import dayjs from 'dayjs'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { searchPatients } from '../../api/patients'
import { getMedicalHistory } from '../../api/medicalHistory'
import { createMedicalIndication, updateMedicalIndication } from '../../api/medicalIndications'
import { getAppointmentsByPatient } from '../../api/appointments'
import { useAuth } from '../../context/useAuth'
import { formatDateTime } from '../../utils/dateFormat'
import { formatPatientLabel, getPatientAge, getPatientDni } from '../../utils/patientDisplay'
import { paletteRaw } from '../../theme/theme'

const EDIT_WINDOW_MINUTES = 5

const TIPO_COLOR = {
  'Signos y Síntomas': 'warning',
  Seguimiento: 'info',
  'Indicación Médica': 'primary',
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const schema = yup.object({
  indication: yup.string().required('Ingresá la indicación'),
  treatment: yup.string().nullable(),
})

function EventDetail({ evento }) {
  const { detalle } = evento
  if (evento.tipo === 'Signos y Síntomas') {
    return (
      <Typography variant="body2" color={paletteRaw.ink}>
        Temp. {detalle.temperature}°C · Presión {detalle.blood_pressure || '—'}
        {detalle.symptoms && <> · Síntomas: {detalle.symptoms}</>}
        {detalle.observations && <> · {detalle.observations}</>}
      </Typography>
    )
  }
  if (evento.tipo === 'Seguimiento') {
    return (
      <Typography variant="body2" color={paletteRaw.ink}>
        {detalle.observations || 'Sin observaciones'}
        {detalle.next_check_up && <> · Próximo control: {detalle.next_check_up}</>}
      </Typography>
    )
  }
  return (
    <Typography variant="body2" color={paletteRaw.ink}>
      {detalle.indication}
      {detalle.treatment && <> · Tratamiento: {detalle.treatment}</>}
    </Typography>
  )
}

export default function HistoriaClinicaPage() {
  const { userId } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedPatientObj, setSelectedPatientObj] = useState(null)
  const [visitCount, setVisitCount] = useState(null)
  const [events, setEvents] = useState([])
  const [filterYear, setFilterYear] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterDay, setFilterDay] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [editingEvent, setEditingEvent] = useState(null)

  const selectedPatient = selectedPatientObj?.id_user || ''

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) })

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return undefined
    let ignore = false
    const timeoutId = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await searchPatients(trimmed)
        if (!ignore) setSearchResults(res.data)
      } catch {
        if (!ignore) setLoadError('No se pudo buscar pacientes.')
      } finally {
        if (!ignore) setSearchLoading(false)
      }
    }, 300)
    return () => {
      ignore = true
      clearTimeout(timeoutId)
    }
  }, [searchQuery])

  const handleSearchInputChange = (_, value) => {
    setSearchQuery(value)
    if (!value.trim()) setSearchResults([])
  }

  const loadHistory = async (patientId) => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await getMedicalHistory(patientId)
      setEvents(res.data)
    } catch {
      setLoadError('No se pudo cargar la historia clínica de este paciente.')
    } finally {
      setLoading(false)
    }
  }

  const loadVisitCount = async (patientId) => {
    setVisitCount(null)
    try {
      const res = await getAppointmentsByPatient(patientId)
      setVisitCount(res.data.filter((a) => a.status === 'Atendido').length)
    } catch {
      setVisitCount(null)
    }
  }

  const handleSelectPatient = (patient) => {
    setSelectedPatientObj(patient)
    setEvents([])
    setVisitCount(null)
    setFilterYear('')
    setFilterMonth('')
    setFilterDay('')
    if (patient) {
      loadHistory(patient.id_user)
      loadVisitCount(patient.id_user)
    }
  }

  const yearOptions = useMemo(() => {
    const years = new Set(
      events.filter((e) => e.fecha).map((e) => dayjs(e.fecha).year())
    )
    return [...years].sort((a, b) => b - a)
  }, [events])

  const filteredEvents = useMemo(() => {
    if (!filterYear && !filterMonth && !filterDay) return events
    return events.filter((evento) => {
      if (!evento.fecha) return false
      const d = dayjs(evento.fecha)
      if (filterYear && d.year() !== Number(filterYear)) return false
      if (filterMonth && d.month() + 1 !== Number(filterMonth)) return false
      if (filterDay && d.date() !== Number(filterDay)) return false
      return true
    })
  }, [events, filterYear, filterMonth, filterDay])

  const isEditable = (evento) =>
    evento.tipo === 'Indicación Médica' &&
    Number(evento.id_doctor) === Number(userId) &&
    dayjs().diff(dayjs(evento.fecha), 'minute') < EDIT_WINDOW_MINUTES

  const openCreateDialog = () => {
    setFormError('')
    setEditingEvent(null)
    reset({ indication: '', treatment: '' })
    setOpen(true)
  }

  const openEditDialog = (evento) => {
    setFormError('')
    setEditingEvent(evento)
    reset({
      indication: evento.detalle.indication,
      treatment: evento.detalle.treatment || '',
    })
    setOpen(true)
  }

  const onSubmit = async (values) => {
    setFormError('')
    try {
      if (editingEvent) {
        await updateMedicalIndication(editingEvent.id, {
          indication: values.indication,
          treatment: values.treatment,
        })
      } else {
        await createMedicalIndication({
          id_patient: selectedPatient,
          indication: values.indication,
          treatment: values.treatment,
        })
      }
      setOpen(false)
      loadHistory(selectedPatient)
    } catch (err) {
      setFormError(err.response?.data?.msg || 'No se pudo guardar la información.')
    }
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800} color={paletteRaw.azulD}>
            Historia clínica digital
          </Typography>
          <Typography variant="body2" color={paletteRaw.gray}>
            Historial completo y cronológico por paciente
          </Typography>
        </Box>
        {selectedPatient && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Nueva indicación
          </Button>
        )}
      </Box>

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      <Autocomplete
        options={searchResults}
        value={selectedPatientObj}
        inputValue={searchQuery}
        onInputChange={handleSearchInputChange}
        onChange={(_, value) => handleSelectPatient(value)}
        getOptionLabel={(p) => formatPatientLabel(p)}
        isOptionEqualToValue={(a, b) => a.id_user === b.id_user}
        loading={searchLoading}
        noOptionsText={searchQuery.trim() ? 'Sin resultados' : 'Escribí un nombre, apellido o DNI'}
        sx={{ mb: 3, minWidth: 320 }}
        renderInput={(params) => (
          <TextField {...params} label="Buscar paciente (nombre, apellido o DNI)" />
        )}
      />

      {selectedPatientObj && (
        <Card sx={{ p: 2.5, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={800} color={paletteRaw.azulD} sx={{ mb: 1 }}>
            Resumen del paciente
          </Typography>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color={paletteRaw.gray}>Nombre y apellido</Typography>
              <Typography variant="body2" fontWeight={600}>
                {selectedPatientObj.first_name} {selectedPatientObj.last_name}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color={paletteRaw.gray}>DNI</Typography>
              <Typography variant="body2" fontWeight={600}>{getPatientDni(selectedPatientObj)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color={paletteRaw.gray}>Edad</Typography>
              <Typography variant="body2" fontWeight={600}>
                {getPatientAge(selectedPatientObj.date_of_birth) ?? '—'} años
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color={paletteRaw.gray}>Veces que fue al médico</Typography>
              <Typography variant="body2" fontWeight={600}>
                {visitCount != null ? visitCount : '—'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color={paletteRaw.gray}>Email</Typography>
              <Typography variant="body2" fontWeight={600}>{selectedPatientObj.email || '—'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color={paletteRaw.gray}>Teléfono</Typography>
              <Typography variant="body2" fontWeight={600}>{selectedPatientObj.phone_number || '—'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color={paletteRaw.gray}>Dirección</Typography>
              <Typography variant="body2" fontWeight={600}>{selectedPatientObj.address || '—'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color={paletteRaw.gray}>Contacto de emergencia</Typography>
              <Typography variant="body2" fontWeight={600}>{selectedPatientObj.emergency_contact || '—'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color={paletteRaw.gray}>Género</Typography>
              <Typography variant="body2" fontWeight={600}>{selectedPatientObj.gender || '—'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color={paletteRaw.gray}>Obra social</Typography>
              <Typography variant="body2" fontWeight={600}>
                {selectedPatientObj.health_plan_name || '—'}
                {selectedPatientObj.health_plan_status ? ` (${selectedPatientObj.health_plan_status})` : ''}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color={paletteRaw.gray}>N° de socio</Typography>
              <Typography variant="body2" fontWeight={600}>{selectedPatientObj.member_number || '—'}</Typography>
            </Grid>
          </Grid>
        </Card>
      )}

      {selectedPatient && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            select
            label="Año"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {yearOptions.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Mes"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {MESES.map((mes, index) => (
              <MenuItem key={mes} value={index + 1}>
                {mes}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Día"
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <MenuItem key={day} value={day}>
                {day}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      )}

      {!selectedPatient && (
        <Typography color={paletteRaw.gray}>
          Elegí un paciente para ver su historia clínica.
        </Typography>
      )}

      {selectedPatient && !loading && events.length === 0 && (
        <Typography color={paletteRaw.gray}>
          Este paciente todavía no tiene registros en su historia clínica.
        </Typography>
      )}

      {selectedPatient && !loading && events.length > 0 && filteredEvents.length === 0 && (
        <Typography color={paletteRaw.gray}>
          No hay registros para el período seleccionado.
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filteredEvents.map((evento) => {
          const editable = isEditable(evento)
          return (
            <Card key={`${evento.tipo}-${evento.id}`} sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip size="small" label={evento.tipo} color={TIPO_COLOR[evento.tipo] || 'default'} />
                  <Typography variant="body2" color={paletteRaw.gray}>
                    {formatDateTime(evento.fecha)}
                  </Typography>
                </Box>
                {evento.tipo === 'Indicación Médica' && (
                  <Tooltip
                    title={
                      editable
                        ? 'Editar'
                        : 'Solo se puede editar dentro de los 5 minutos posteriores al registro'
                    }
                  >
                    <span>
                      <IconButton
                        size="small"
                        disabled={!editable}
                        onClick={() => openEditDialog(evento)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Box>
              <Box sx={{ mt: 1 }}>
                <EventDetail evento={evento} />
              </Box>
            </Card>
          )
        })}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingEvent ? 'Editar indicación médica' : 'Nueva indicación médica'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Indicación"
              multiline
              minRows={3}
              placeholder="Detalle de la indicación médica..."
              {...register('indication')}
              error={!!errors.indication}
              helperText={errors.indication?.message}
            />
            <TextField
              label="Tratamiento"
              multiline
              minRows={2}
              placeholder="Tratamiento asociado (opcional)..."
              {...register('treatment')}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Guardar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}
