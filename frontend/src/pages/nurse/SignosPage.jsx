import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import dayjs from 'dayjs'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { getPatients } from '../../api/patients'
import {
  getSignsAndSymptoms,
  createSignsAndSymptoms,
  updateSignsAndSymptoms,
  deleteSignsAndSymptoms,
} from '../../api/signsAndSymptoms'
import { formatDateTime } from '../../utils/dateFormat'
import { getPatientAge, getPatientDni } from '../../utils/patientDisplay'
import { paletteRaw } from '../../theme/theme'

const EDIT_WINDOW_MINUTES = 5

const schema = yup.object({
  id_patient: yup.number().typeError('Elegí un paciente').required(),
  temperature: yup
    .number()
    .typeError('Ingresá la temperatura')
    .required('Ingresá la temperatura'),
  blood_pressure: yup.string().required('Ingresá la presión arterial'),
  signs: yup.string().nullable(),
  symptoms: yup.string().required('Describí los síntomas'),
  observations: yup.string().nullable(),
  record_type: yup.string().required(),
})

export default function SignosPage() {
  const [rows, setRows] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [editingRow, setEditingRow] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [selectedDate, setSelectedDate] = useState(dayjs())

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { record_type: 'Rutina' },
  })

  const patientName = (id) => {
    const p = patients.find((x) => x.id_user === id)
    return p ? `${p.first_name} ${p.last_name}` : '—'
  }

  const isEditable = (row) =>
    dayjs().diff(dayjs(row.date_and_time), 'minute') < EDIT_WINDOW_MINUTES

  const visibleRows = rows.filter(
    (r) => !selectedDate || dayjs(r.date_and_time).isSame(selectedDate, 'day'),
  )

  const loadAll = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [signsRes, patientsRes] = await Promise.all([
        getSignsAndSymptoms(),
        getPatients(),
      ])
      setRows(signsRes.data)
      setPatients(patientsRes.data)
    } catch {
      setLoadError('No se pudo cargar la información. Reintentá más tarde.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false
    ;(async () => {
      setLoading(true)
      setLoadError('')
      try {
        const [signsRes, patientsRes] = await Promise.all([
          getSignsAndSymptoms(),
          getPatients(),
        ])
        if (!ignore) {
          setRows(signsRes.data)
          setPatients(patientsRes.data)
        }
      } catch {
        if (!ignore) {
          setLoadError('No se pudo cargar la información. Reintentá más tarde.')
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => {
      ignore = true
    }
  }, [])

  const openCreateDialog = () => {
    setFormError('')
    setEditingRow(null)
    reset({
      id_patient: '',
      temperature: '',
      blood_pressure: '',
      signs: '',
      symptoms: '',
      observations: '',
      record_type: 'Rutina',
    })
    setOpen(true)
  }

  const openEditDialog = (row) => {
    setFormError('')
    setEditingRow(row)
    reset({
      id_patient: row.id_patient,
      temperature: row.temperature,
      blood_pressure: row.blood_pressure,
      signs: row.signs || '',
      symptoms: row.symptoms || '',
      observations: row.observations || '',
      record_type: row.record_type,
    })
    setOpen(true)
  }

  const onSubmit = async (values) => {
    setFormError('')
    try {
      if (editingRow) {
        await updateSignsAndSymptoms(editingRow.id_signs_and_symptoms, {
          temperature: values.temperature,
          blood_pressure: values.blood_pressure,
          signs: values.signs,
          symptoms: values.symptoms,
          observations: values.observations,
          record_type: values.record_type,
        })
      } else {
        await createSignsAndSymptoms(values)
      }
      setOpen(false)
      loadAll()
    } catch (err) {
      setFormError(
        err.response?.data?.error || 'No se pudo guardar el registro.',
      )
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteSignsAndSymptoms(deleteTarget.id_signs_and_symptoms)
      setDeleteTarget(null)
      loadAll()
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'No se pudo eliminar el registro.')
    } finally {
      setDeleting(false)
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
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800} color={paletteRaw.azulD}>
            Signos y síntomas
          </Typography>
          <Typography variant="body2" color={paletteRaw.gray}>
            Registro clínico en tiempo real
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Registrar
        </Button>
      </Box>

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <DatePicker
          label="Día"
          value={selectedDate}
          onChange={(value) => setSelectedDate(value)}
          slotProps={{ textField: { size: 'small' } }}
        />
        <Button size="small" onClick={() => setSelectedDate(dayjs())}>
          Hoy
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Paciente</TableCell>
              <TableCell>DNI</TableCell>
              <TableCell>Edad</TableCell>
              <TableCell>Temp.</TableCell>
              <TableCell>Presión</TableCell>
              <TableCell>Síntomas</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Fecha/Hora</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((r) => {
              const patient = patients.find((p) => p.id_user === r.id_patient)
              const editable = isEditable(r)
              return (
                <TableRow key={r.id_signs_and_symptoms}>
                  <TableCell sx={{ fontWeight: 600 }}>{patientName(r.id_patient)}</TableCell>
                  <TableCell>{getPatientDni(patient)}</TableCell>
                  <TableCell>{getPatientAge(patient?.date_of_birth) ?? '—'}</TableCell>
                  <TableCell
                    sx={{ color: r.temperature >= 38 ? paletteRaw.danger : 'inherit', fontWeight: r.temperature >= 38 ? 700 : 400 }}
                  >
                    {r.temperature}°C
                  </TableCell>
                  <TableCell>{r.blood_pressure || '—'}</TableCell>
                  <TableCell>
                    {r.symptoms}
                    {r.observations && (
                      <Typography variant="caption" display="block" color={paletteRaw.gray}>
                        {r.observations}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={r.record_type}
                      color={r.record_type === 'Urgencia' ? 'error' : 'primary'}
                    />
                  </TableCell>
                  <TableCell sx={{ color: paletteRaw.gray, whiteSpace: 'nowrap' }}>
                    {formatDateTime(r.date_and_time)}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title={editable ? 'Editar' : 'Ya pasaron 5 minutos desde el registro'}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={!editable}
                          onClick={() => openEditDialog(r)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDeleteError('')
                        setDeleteTarget(r)
                      }}
                    >
                      <DeleteIcon fontSize="small" sx={{ color: paletteRaw.danger }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
            {!loading && visibleRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ color: paletteRaw.gray }}>
                  No hay registros para el día seleccionado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingRow ? 'Editar signos y síntomas' : 'Registrar signos y síntomas'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Controller
              name="id_patient"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Paciente"
                  disabled={!!editingRow}
                  error={!!errors.id_patient}
                  helperText={errors.id_patient?.message}
                >
                  {patients.map((p) => (
                    <MenuItem key={p.id_user} value={p.id_user}>
                      {p.first_name} {p.last_name} — DNI {getPatientDni(p)} — {getPatientAge(p.date_of_birth) ?? '—'} años
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Temperatura (°C)"
                type="number"
                fullWidth
                inputProps={{ step: '0.1' }}
                {...register('temperature')}
                error={!!errors.temperature}
                helperText={errors.temperature?.message}
              />
              <TextField
                label="Presión arterial"
                placeholder="120/80"
                fullWidth
                {...register('blood_pressure')}
                error={!!errors.blood_pressure}
                helperText={errors.blood_pressure?.message}
              />
            </Box>
            <TextField
              label="Signos clínicos"
              {...register('signs')}
            />
            <TextField
              label="Síntomas reportados"
              {...register('symptoms')}
              error={!!errors.symptoms}
              helperText={errors.symptoms?.message}
            />
            <TextField
              label="Observaciones"
              multiline
              minRows={2}
              {...register('observations')}
            />
            <Controller
              name="record_type"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Tipo">
                  <MenuItem value="Rutina">Rutina</MenuItem>
                  <MenuItem value="Urgencia">Urgencia</MenuItem>
                </TextField>
              )}
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

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Eliminar registro</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {deleteError && <Alert severity="error">{deleteError}</Alert>}
          <Typography variant="body2">
            ¿Seguro que querés eliminar este registro de signos y síntomas
            {deleteTarget ? ` de ${patientName(deleteTarget.id_patient)}` : ''}? Esta
            acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleting}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
