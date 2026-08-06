import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import dayjs from 'dayjs'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { getNurses } from '../../api/nurses'
import { getGuardPasses, createGuardPass, updateGuardPass } from '../../api/guardPass'
import { useAuth } from '../../context/useAuth'
import { formatDateTime } from '../../utils/dateFormat'
import { paletteRaw } from '../../theme/theme'

const EDIT_WINDOW_MINUTES = 15

const schema = yup.object({
  rotation: yup.mixed().required('Elegí fecha y hora'),
  notes: yup.string().required('Ingresá las novedades'),
})

export default function GuardiaPage() {
  const { userId } = useAuth()
  const [rows, setRows] = useState([])
  const [nurses, setNurses] = useState([])
  const [loadError, setLoadError] = useState('')
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [editingRow, setEditingRow] = useState(null)

  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) })

  const nurseName = (id) => {
    const n = nurses.find((x) => x.id_user === id)
    return n ? `${n.first_name} ${n.last_name}` : '—'
  }

  const isEditable = (row) =>
    Number(row.id_nurse) === Number(userId) &&
    dayjs().diff(dayjs(row.rotation), 'minute') < EDIT_WINDOW_MINUTES

  const sortedRows = [...rows].sort(
    (a, b) => dayjs(b.rotation).valueOf() - dayjs(a.rotation).valueOf(),
  )

  const loadAll = async () => {
    setLoadError('')
    try {
      const [guardRes, nursesRes] = await Promise.all([getGuardPasses(), getNurses()])
      setRows(guardRes.data)
      setNurses(nursesRes.data)
    } catch {
      setLoadError('No se pudo cargar el historial de pases de guardia.')
    }
  }

  useEffect(() => {
    let ignore = false
    ;(async () => {
      setLoadError('')
      try {
        const [guardRes, nursesRes] = await Promise.all([getGuardPasses(), getNurses()])
        if (!ignore) {
          setRows(guardRes.data)
          setNurses(nursesRes.data)
        }
      } catch {
        if (!ignore) {
          setLoadError('No se pudo cargar el historial de pases de guardia.')
        }
      }
    })()
    return () => {
      ignore = true
    }
  }, [])

  const openDialog = () => {
    setFormError('')
    setEditingRow(null)
    reset({ rotation: dayjs(), notes: '' })
    setOpen(true)
  }

  const openEditDialog = (row) => {
    setFormError('')
    setEditingRow(row)
    reset({ rotation: dayjs(row.rotation), notes: row.notes || '' })
    setOpen(true)
  }

  const onSubmit = async (values) => {
    setFormError('')
    try {
      if (editingRow) {
        await updateGuardPass(editingRow.id_guard_pass, { notes: values.notes })
      } else {
        await createGuardPass({
          id_nurse: userId,
          rotation: dayjs(values.rotation).format('YYYY-MM-DD HH:mm:ss'),
          notes: values.notes,
        })
      }
      setOpen(false)
      loadAll()
    } catch (err) {
      setFormError(err.response?.data?.error || 'No se pudo registrar el pase de guardia.')
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
            Pase de guardia digital
          </Typography>
          <Typography variant="body2" color={paletteRaw.gray}>
            Comunicación entre turnos
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
          Nuevo pase
        </Button>
      </Box>

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      <Box sx={{ position: 'relative', pl: 3 }}>
        <Box
          sx={{
            position: 'absolute',
            left: 8,
            top: 8,
            bottom: 8,
            width: 2,
            background: '#D5E7F3',
          }}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sortedRows.map((g) => {
            const editable = isEditable(g)
            return (
              <Card key={g.id_guard_pass} sx={{ p: 2.5, position: 'relative' }}>
                <Box
                  sx={{
                    position: 'absolute',
                    left: -23,
                    top: 20,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: paletteRaw.celeste,
                    boxShadow: '0 0 0 3px #fff',
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight={700} color={paletteRaw.azulD}>
                    {formatDateTime(g.rotation)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip size="small" label={nurseName(g.id_nurse)} color="primary" />
                    <Tooltip
                      title={
                        editable
                          ? 'Editar'
                          : 'Solo se puede editar dentro de los 15 minutos posteriores al registro'
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          disabled={!editable}
                          onClick={() => openEditDialog(g)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ mt: 1 }} color={paletteRaw.ink}>
                  {g.notes}
                </Typography>
              </Card>
            )
          })}
          {sortedRows.length === 0 && (
            <Typography color={paletteRaw.gray}>Todavía no hay pases de guardia.</Typography>
          )}
        </Box>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingRow ? 'Editar pase de guardia' : 'Registrar pase de guardia'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Controller
              name="rotation"
              control={control}
              render={({ field }) => (
                <DateTimePicker
                  label="Rotación / turno"
                  value={field.value || null}
                  onChange={field.onChange}
                  disabled={!!editingRow}
                  slotProps={{
                    textField: {
                      error: !!errors.rotation,
                      helperText: errors.rotation?.message,
                    },
                  }}
                />
              )}
            />
            <TextField
              label="Datos relevantes"
              multiline
              minRows={4}
              placeholder="Estado de pacientes, pendientes, novedades..."
              {...register('notes')}
              error={!!errors.notes}
              helperText={errors.notes?.message}
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
