import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getPatients } from '../api/patients';
import {
  getFollowUps,
  createFollowUp,
  toggleFollowUpFinish,
} from '../api/followUps';
import { useAuth } from '../context/useAuth';

// Validación del formulario
const schema = yup.object({
  id_patient: yup.number().typeError('Elegí un paciente').required(),
  observations: yup.string().required('Ingresá las observaciones'),
  next_check_up: yup.string().nullable(),
});

const FILTERS = ['Activos', 'Pendiente', 'Programado', 'Finalizado', 'Todos'];

export default function Seguimiento() {
  const { userId } = useAuth();
  const [rows, setRows] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Activos');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) });

  // Busca el nombre del paciente por id (por si el backend no lo trae)
  const patientName = (id) => {
    const p = patients.find((x) => x.id_user === id);
    return p ? `${p.first_name} ${p.last_name}` : '—';
  };

  // Trae seguimientos y pacientes
  const loadAll = async () => {
    setLoadError('');
    try {
      const [followUpsRes, patientsRes] = await Promise.all([
        getFollowUps(),
        getPatients(),
      ]);
      setRows(followUpsRes.data);
      setPatients(patientsRes.data);
    } catch {
      setLoadError('No se pudo cargar la información. Reintentá más tarde.');
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openDialog = () => {
    setFormError('');
    reset({ id_patient: '', observations: '', next_check_up: '' });
    setOpen(true);
  };

  // Crea un seguimiento
  const onSubmit = async (values) => {
    setFormError('');
    try {
      await createFollowUp({
        id_patient: values.id_patient,
        id_nurse: userId,
        observations: values.observations,
        next_check_up: values.next_check_up || null,
        finish: false,
      });
      setOpen(false);
      loadAll();
    } catch (err) {
      setFormError(
        err.response?.data?.error ||
          err.response?.data?.msg ||
          'No se pudo guardar el seguimiento.',
      );
    }
  };

  // Marca finalizado / reabre
  const toggle = async (id) => {
    try {
      await toggleFollowUpFinish(id);
      loadAll();
    } catch {
      setLoadError('No se pudo actualizar el estado del seguimiento.');
    }
  };

  // Estado calculado de cada seguimiento (por si el backend no manda 'status')
  const getStatus = (fu) => {
    if (fu.status) return fu.status; // si el backend ya lo trae, lo usamos
    if (fu.finish) return 'Finalizado';
    if (fu.next_check_up && new Date(fu.next_check_up) <= new Date())
      return 'Pendiente';
    return 'Programado';
  };

  // Filtra según el filtro seleccionado
  const filteredRows = rows.filter((fu) => {
    const status = getStatus(fu);
    if (selectedFilter === 'Todos') return true;
    if (selectedFilter === 'Activos') {
      return status === 'Pendiente' || status === 'Programado';
    }
    return status === selectedFilter;
  });

  // Cuenta pendientes para la alerta
  const pendingCount = rows.filter(
    (fu) => getStatus(fu) === 'Pendiente',
  ).length;

  // Color del chip según estado
  const statusColor = (status) => {
    if (status === 'Pendiente') return 'error';
    if (status === 'Programado') return 'info';
    return 'default'; // Finalizado
  };

  return (
    <Box>
      {/* Encabezado */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800} color="#0E4C82">
            Seguimiento del paciente
          </Typography>
          <Typography variant="body2" color="#5b7387">
            Evolución y recordatorios
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openDialog}
        >
          Nuevo
        </Button>
      </Box>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {pendingCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Tenés {pendingCount} paciente(s) con seguimiento pendiente
        </Alert>
      )}

      {/* Filtros por estado */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <Chip
            key={f}
            label={f}
            onClick={() => setSelectedFilter(f)}
            color={selectedFilter === f ? 'primary' : 'default'}
            variant={selectedFilter === f ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Box>

      {/* Lista de seguimientos */}
      <Grid container spacing={2}>
        {filteredRows.map((fu) => {
          const status = getStatus(fu);
          const name = fu.patient_name || patientName(fu.id_patient);
          return (
            <Grid key={fu.id_follow_up} size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 2.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      sx={{
                        bgcolor: '#29ABE2',
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    >
                      {name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography fontWeight={700} color="#0E4C82">
                        {name}
                      </Typography>
                      <Typography variant="caption" color="#5b7387">
                        {fu.date_time
                          ? new Date(fu.date_time).toLocaleString('es-AR')
                          : ''}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    size="small"
                    label={status}
                    color={statusColor(status)}
                  />
                </Box>

                <Typography variant="body2" sx={{ mt: 2 }} color="#34495e">
                  {fu.observations}
                </Typography>

                {fu.next_check_up && (
                  <Typography
                    variant="caption"
                    sx={{ mt: 1, display: 'block' }}
                    color="#1565A8"
                    fontWeight={700}
                  >
                    Próximo control:{' '}
                    {new Date(fu.next_check_up).toLocaleDateString('es-AR')}
                  </Typography>
                )}

                {status !== 'Finalizado' && (
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ mt: 2 }}
                    onClick={() => toggle(fu.id_follow_up)}
                  >
                    Marcar finalizado
                  </Button>
                )}
              </Card>
            </Grid>
          );
        })}
        {filteredRows.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Typography color="#5b7387">
              No hay seguimientos en esta categoría.
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* Diálogo de nuevo seguimiento */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Nuevo seguimiento</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
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
                  error={!!errors.id_patient}
                  helperText={errors.id_patient?.message}
                >
                  {patients.map((p) => (
                    <MenuItem key={p.id_user} value={p.id_user}>
                      {p.first_name} {p.last_name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Observaciones"
              multiline
              minRows={2}
              {...register('observations')}
              error={!!errors.observations}
              helperText={errors.observations?.message}
            />
            <TextField
              label="Próximo control"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              {...register('next_check_up')}
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
  );
}
