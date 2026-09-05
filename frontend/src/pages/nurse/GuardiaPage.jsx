import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import dayjs from 'dayjs'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChecklistIcon from '@mui/icons-material/PlaylistAddCheck'
import { getNurses } from '../../api/nurses'
import {
  getGuardPasses,
  createGuardPass,
  updateGuardPass,
  createGuardPassChecklist,
  updateGuardPassChecklist,
} from '../../api/guardPass'
import { useAuth } from '../../context/useAuth'
import { formatDateTime } from '../../utils/dateFormat'
import { paletteRaw } from '../../theme/theme'
import {
  CHECKLIST_RATINGS,
  GUARD_PASS_CHECKLIST_SECTIONS,
  GUARD_PASS_CHECKLIST_ITEMS,
  emptyChecklistItems,
} from '../../utils/guardPassChecklist'

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
  const [selectedDate, setSelectedDate] = useState(null)
  const [checklistItems, setChecklistItems] = useState(emptyChecklistItems())
  const [checklistViewTarget, setChecklistViewTarget] = useState(null)

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

  const setChecklistItemField = (n, field, value) => {
    setChecklistItems((prev) =>
      prev.map((it) => (it.n === n ? { ...it, [field]: value } : it)),
    )
  }

  const checklistSummary = (checklist) => {
    if (!checklist) return null
    const counts = { Satisfactorio: 0, 'Requiere más práctica': 0, Insatisfactorio: 0 }
    checklist.items.forEach((it) => {
      if (it.rating && counts[it.rating] !== undefined) counts[it.rating] += 1
    })
    return counts
  }

  const isEditable = (row) =>
    Number(row.id_nurse) === Number(userId) &&
    dayjs().diff(dayjs(row.rotation), 'minute') < EDIT_WINDOW_MINUTES

  const sortedRows = [...rows].sort(
    (a, b) => dayjs(b.rotation).valueOf() - dayjs(a.rotation).valueOf(),
  )

  const loadAll = async (date = selectedDate) => {
    setLoadError('')
    try {
      const [guardRes, nursesRes] = await Promise.all([
        getGuardPasses(date ? date.format('YYYY-MM-DD') : undefined),
        getNurses(),
      ])
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
        const [guardRes, nursesRes] = await Promise.all([
          getGuardPasses(selectedDate ? selectedDate.format('YYYY-MM-DD') : undefined),
          getNurses(),
        ])
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
  }, [selectedDate])

  const openDialog = () => {
    setFormError('')
    setEditingRow(null)
    setChecklistItems(emptyChecklistItems())
    reset({ rotation: dayjs(), notes: '' })
    setOpen(true)
  }

  const openEditDialog = (row) => {
    setFormError('')
    setEditingRow(row)
    if (row.checklist) {
      setChecklistItems(
        GUARD_PASS_CHECKLIST_ITEMS.map((item) => {
          const existing = row.checklist.items.find((it) => it.n === item.n)
          return existing
            ? { n: item.n, rating: existing.rating, observation: existing.observation || '' }
            : { n: item.n, rating: null, observation: '' }
        }),
      )
    } else {
      setChecklistItems(emptyChecklistItems())
    }
    reset({ rotation: dayjs(row.rotation), notes: row.notes || '' })
    setOpen(true)
  }

  const onSubmit = async (values) => {
    setFormError('')
    const hasChecklistData = checklistItems.some((it) => it.rating || it.observation)
    try {
      let idGuardPass = editingRow?.id_guard_pass
      if (editingRow) {
        await updateGuardPass(editingRow.id_guard_pass, { notes: values.notes })
      } else {
        const res = await createGuardPass({
          id_nurse: userId,
          rotation: dayjs(values.rotation).format('YYYY-MM-DD HH:mm:ss'),
          notes: values.notes,
        })
        idGuardPass = res.data.id_guard_pass
      }
      if (hasChecklistData) {
        if (editingRow?.checklist) {
          await updateGuardPassChecklist(idGuardPass, checklistItems)
        } else {
          await createGuardPassChecklist(idGuardPass, checklistItems)
        }
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
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <DatePicker
            label="Fecha"
            value={selectedDate}
            onChange={(value) => setSelectedDate(value)}
            slotProps={{ textField: { size: 'small' } }}
          />
          <Button variant="outlined" onClick={() => setSelectedDate(dayjs())}>
            Hoy
          </Button>
          <Button variant="outlined" onClick={() => setSelectedDate(null)}>
            Ver todos
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
            Nuevo pase
          </Button>
        </Box>
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
                {g.checklist && (
                  <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<ChecklistIcon fontSize="small" />}
                      onClick={() => setChecklistViewTarget(g)}
                    >
                      Ver checklist SBAR-SAER
                    </Button>
                    <Chip
                      size="small"
                      variant="outlined"
                      color="success"
                      label={`${checklistSummary(g.checklist).Satisfactorio}/${GUARD_PASS_CHECKLIST_ITEMS.length} satisfactorio`}
                    />
                  </Box>
                )}
              </Card>
            )
          })}
          {sortedRows.length === 0 && (
            <Typography color={paletteRaw.gray}>
              {selectedDate
                ? `No hay pases de guardia registrados el ${selectedDate.format('DD/MM/YYYY')}.`
                : 'Todavía no hay pases de guardia.'}
            </Typography>
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

            <Accordion disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" fontWeight={700} color={paletteRaw.azulD}>
                  Checklist SBAR-SAER (opcional)
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {GUARD_PASS_CHECKLIST_SECTIONS.map((section) => (
                  <Box key={section.key}>
                    <Typography variant="subtitle2" color={paletteRaw.azulD} sx={{ mb: 1 }}>
                      {section.title}
                    </Typography>
                    {section.items.map((item) => {
                      const current = checklistItems.find((it) => it.n === item.n)
                      return (
                        <Box key={item.n} sx={{ mb: 1.5 }}>
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            {item.n}. {item.text}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <RadioGroup
                              row
                              value={current?.rating || ''}
                              onChange={(e) => setChecklistItemField(item.n, 'rating', e.target.value)}
                            >
                              {CHECKLIST_RATINGS.map((rating) => (
                                <FormControlLabel
                                  key={rating}
                                  value={rating}
                                  control={<Radio size="small" />}
                                  label={<Typography variant="caption">{rating}</Typography>}
                                />
                              ))}
                            </RadioGroup>
                            <TextField
                              size="small"
                              placeholder="Observación"
                              value={current?.observation || ''}
                              onChange={(e) => setChecklistItemField(item.n, 'observation', e.target.value)}
                              sx={{ flex: 1, minWidth: 180 }}
                            />
                          </Box>
                        </Box>
                      )
                    })}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Guardar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={!!checklistViewTarget}
        onClose={() => setChecklistViewTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Checklist SBAR-SAER</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {checklistViewTarget &&
            GUARD_PASS_CHECKLIST_SECTIONS.map((section) => (
              <Box key={section.key}>
                <Typography variant="subtitle2" color={paletteRaw.azulD} sx={{ mb: 1 }}>
                  {section.title}
                </Typography>
                {section.items.map((item) => {
                  const found = checklistViewTarget.checklist.items.find((it) => it.n === item.n)
                  return (
                    <Box key={item.n} sx={{ mb: 1.5 }}>
                      <Typography variant="body2">
                        {item.n}. {item.text}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          size="small"
                          label={found?.rating || 'Sin calificar'}
                          color={
                            found?.rating === 'Satisfactorio'
                              ? 'success'
                              : found?.rating === 'Requiere más práctica'
                                ? 'warning'
                                : found?.rating === 'Insatisfactorio'
                                  ? 'error'
                                  : 'default'
                          }
                        />
                        {found?.observation && (
                          <Typography variant="caption" color={paletteRaw.gray}>
                            Observación: {found.observation}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setChecklistViewTarget(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
