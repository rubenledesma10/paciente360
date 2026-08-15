import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import dayjs from 'dayjs'
import {
  Alert,
  Box,
  Button,
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
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getPatients } from '../../api/patients'
import {
  getMedicalIndications,
  createMedicalIndication,
  updateMedicalIndication,
  deleteMedicalIndication,
} from '../../api/medicalIndications'
import { formatDateTime } from '../../utils/dateFormat'
import { formatPatientLabel, getPatientAge, getPatientDni } from '../../utils/patientDisplay'
import { drawPdfHeader, drawPdfFooter, PDF_HEADER_HEIGHT } from '../../utils/pdfBranding'
import { paletteRaw } from '../../theme/theme'

const EDIT_WINDOW_MINUTES = 5

const schema = yup.object({
  id_patient: yup.number().typeError('Elegí un paciente').required(),
  indication: yup.string().required('Ingresá la indicación'),
  treatment: yup.string().nullable(),
})

export default function IndicacionesPage() {
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

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) })

  const patientName = (id) => {
    const p = patients.find((x) => x.id_user === id)
    return p ? `${p.first_name} ${p.last_name}` : '—'
  }

  const isEditable = (row) =>
    dayjs().diff(dayjs(row.created_at), 'minute') < EDIT_WINDOW_MINUTES

  const sortedRows = [...rows].sort(
    (a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf(),
  )

  const downloadIndicationPdf = (row) => {
    const patient = patients.find((p) => p.id_user === row.id_patient)
    if (!patient) return
    const doc = new jsPDF()
    const patientBoxTop = PDF_HEADER_HEIGHT + 10

    doc.setDrawColor(paletteRaw.celeste)
    doc.setFillColor(paletteRaw.celesteXL)
    doc.roundedRect(14, patientBoxTop, 182, 20, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(paletteRaw.azulD)
    doc.text(formatPatientLabel(patient), 20, patientBoxTop + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(paletteRaw.gray)
    doc.text(`Indicación del ${formatDateTime(row.created_at)}`, 20, patientBoxTop + 15)

    autoTable(doc, {
      startY: patientBoxTop + 26,
      margin: { top: PDF_HEADER_HEIGHT + 6 },
      head: [['Fecha', 'Indicación', 'Tratamiento']],
      body: [[formatDateTime(row.created_at), row.indication, row.treatment || '—']],
      headStyles: { fillColor: paletteRaw.azulD, textColor: '#ffffff' },
      styles: { textColor: paletteRaw.ink, lineColor: paletteRaw.celeste },
    })

    drawPdfHeader(doc, 'Indicaciones Médicas')
    drawPdfFooter(doc)
    const dateSuffix = dayjs(row.created_at).format('YYYY-MM-DD')
    doc.save(`indicacion_${patient.last_name}_${getPatientDni(patient)}_${dateSuffix}.pdf`)
  }

  const loadAll = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [indicationsRes, patientsRes] = await Promise.all([
        getMedicalIndications(),
        getPatients(),
      ])
      setRows(indicationsRes.data)
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
        const [indicationsRes, patientsRes] = await Promise.all([
          getMedicalIndications(),
          getPatients(),
        ])
        if (!ignore) {
          setRows(indicationsRes.data)
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
    reset({ id_patient: '', indication: '', treatment: '' })
    setOpen(true)
  }

  const openEditDialog = (row) => {
    setFormError('')
    setEditingRow(row)
    reset({
      id_patient: row.id_patient,
      indication: row.indication,
      treatment: row.treatment || '',
    })
    setOpen(true)
  }

  const onSubmit = async (values) => {
    setFormError('')
    try {
      if (editingRow) {
        await updateMedicalIndication(editingRow.id_medical_indication, {
          indication: values.indication,
          treatment: values.treatment,
        })
      } else {
        await createMedicalIndication({
          id_patient: values.id_patient,
          indication: values.indication,
          treatment: values.treatment,
        })
      }
      setOpen(false)
      loadAll()
    } catch (err) {
      setFormError(err.response?.data?.msg || 'No se pudo guardar la indicación.')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteMedicalIndication(deleteTarget.id_medical_indication)
      setDeleteTarget(null)
      loadAll()
    } catch (err) {
      setDeleteError(err.response?.data?.msg || 'No se pudo eliminar la indicación.')
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
            Indicaciones médicas
          </Typography>
          <Typography variant="body2" color={paletteRaw.gray}>
            Historial de indicaciones y tratamientos por paciente
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Nueva indicación
        </Button>
      </Box>

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Paciente</TableCell>
              <TableCell>DNI</TableCell>
              <TableCell>Edad</TableCell>
              <TableCell>Indicación</TableCell>
              <TableCell>Tratamiento</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell align="center">PDF</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRows.map((r) => {
              const editable = isEditable(r)
              const patient = patients.find((p) => p.id_user === r.id_patient)
              return (
                <TableRow key={r.id_medical_indication}>
                  <TableCell sx={{ fontWeight: 600 }}>{patientName(r.id_patient)}</TableCell>
                  <TableCell>{getPatientDni(patient)}</TableCell>
                  <TableCell>{getPatientAge(patient?.date_of_birth) ?? '—'}</TableCell>
                  <TableCell>{r.indication}</TableCell>
                  <TableCell>{r.treatment || '—'}</TableCell>
                  <TableCell sx={{ color: paletteRaw.gray, whiteSpace: 'nowrap' }}>
                    {formatDateTime(r.created_at)}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Descargar PDF">
                      <IconButton size="small" onClick={() => downloadIndicationPdf(r)}>
                        <PictureAsPdfIcon fontSize="small" sx={{ color: paletteRaw.azul }} />
                      </IconButton>
                    </Tooltip>
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
            {!loading && sortedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ color: paletteRaw.gray }}>
                  Todavía no hay indicaciones registradas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingRow ? 'Editar indicación médica' : 'Nueva indicación médica'}</DialogTitle>
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
                      {formatPatientLabel(p)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
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

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Eliminar indicación</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {deleteError && <Alert severity="error">{deleteError}</Alert>}
          <Typography variant="body2">
            ¿Seguro que querés eliminar esta indicación
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
