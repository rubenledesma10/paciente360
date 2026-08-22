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
import { getAttendedPatients } from '../api/appointments';
import {
  getFollowUps,
  createFollowUp,
  toggleFollowUpFinish,
  updateFollowUp,
} from '../api/followUps';
import { useAuth } from '../context/useAuth';
import MedicalHistoryDialog from '../components/MedicalHistoryDialog';
import { getPatientAge, getPatientDni } from '../utils/patientDisplay';

// Fecha de hoy en formato YYYY-MM-DD (para validar el mínimo del formulario)
const today = new Date().toISOString().split('T')[0];

// Validación: el próximo control no puede ser una fecha pasada
const schema = yup.object({
  id_patient: yup.number().typeError('Elegí un paciente').required(),
  observations: yup.string().required('Ingresá las observaciones'),
  next_check_up: yup
    .string()
    .nullable()
    .test(
      'no-pasado',
      'El próximo control no puede ser una fecha pasada',
      (value) => !value || value >= today,
    ),
});

// Traducción de los estados (inglés del backend -> español para el usuario)
const STATUS_LABELS = {
  active: 'Hoy',
  pending: 'Pendiente',
  scheduled: 'Programado',
  finished: 'Finalizado',
};

// Filtros: cada uno con su clave interna y su etiqueta visible
const FILTERS = [
  { key: 'activos', label: 'Activos' },
  { key: 'active', label: 'Hoy' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'scheduled', label: 'Programados' },
  { key: 'finished', label: 'Finalizados' },
  { key: 'todos', label: 'Todos' },
];

export default function Seguimiento() {
  const { userId } = useAuth();
  const [rows, setRows] = useState([]);
  // Dos listas distintas y a proposito:
  // - patients: todos, para poder mostrar DNI y edad en seguimientos viejos
  // - attendedPatients: solo los atendidos HOY, unicos habilitados para un
  //   seguimiento nuevo (no tiene sentido seguir a quien no paso por consulta)
  const [patients, setPatients] = useState([]);
  const [attendedPatients, setAttendedPatients] = useState([]);
  const [loadingAttended, setLoadingAttended] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('activos');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPatient, setHistoryPatient] = useState({
    id: null,
    name: '',
    dni: null,
    age: null,
    allergies: null,
  });

  // Estados para el diálogo de reprogramar
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) });

  const patientName = (id) => {
    const p = patients.find((x) => x.id_user === id);
    return p ? `${p.first_name} ${p.last_name}` : '—';
  };

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

  // Avisa a la campana (y a quien escuche) que los seguimientos cambiaron
  const notifyChange = () => {
    window.dispatchEvent(new Event('followups-changed'));
  };

  // Se recarga al abrir el dialogo: si un medico acaba de atender a alguien,
  // ese paciente tiene que aparecer sin necesidad de refrescar la pagina.
  const loadAttendedPatients = async () => {
    setLoadingAttended(true);
    try {
      const res = await getAttendedPatients();
      setAttendedPatients(res.data);
    } catch {
      setAttendedPatients([]);
    } finally {
      setLoadingAttended(false);
    }
  };

  const openDialog = () => {
    setFormError('');
    reset({ id_patient: '', observations: '', next_check_up: '' });
    loadAttendedPatients();
    setOpen(true);
  };

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
      notifyChange();
    } catch (err) {
      setFormError(
        err.response?.data?.error ||
          err.response?.data?.msg ||
          'No se pudo guardar el seguimiento.',
      );
    }
  };

  const toggle = async (id) => {
    try {
      await toggleFollowUpFinish(id);
      loadAll();
      notifyChange();
    } catch {
      setLoadError('No se pudo actualizar el estado del seguimiento.');
    }
  };

  const openHistory = (patientId, name) => {
    const patient = patients.find((p) => p.id_user === patientId);
    setHistoryPatient({
      id: patientId,
      name,
      dni: patient ? getPatientDni(patient) : null,
      age: patient ? getPatientAge(patient.date_of_birth) : null,
      allergies: patient?.allergies || null,
    });
    setHistoryOpen(true);
  };

  const openReschedule = (followUp) => {
    setRescheduleTarget(followUp);
    setRescheduleDate(followUp.next_check_up || '');
    setRescheduleError('');
    setRescheduleOpen(true);
  };

  const handleReschedule = async () => {
    setRescheduleError('');
    if (rescheduleDate && rescheduleDate < today) {
      setRescheduleError('El próximo control no puede ser una fecha pasada.');
      return;
    }
    try {
      await updateFollowUp(rescheduleTarget.id_follow_up, {
        next_check_up: rescheduleDate || null,
      });
      setRescheduleOpen(false);
      loadAll();
      notifyChange();
    } catch (err) {
      setRescheduleError(
        err.response?.data?.msg || 'No se pudo reprogramar el seguimiento.',
      );
    }
  };

  // Filtra: solo MIS seguimientos, y después según el filtro seleccionado
  const filteredRows = rows.filter((fu) => {
    if (fu.id_nurse !== userId) return false; // solo los que atiendo yo
    if (selectedFilter === 'todos') return true;
    if (selectedFilter === 'activos') {
      return fu.status !== 'finished';
    }
    return fu.status === selectedFilter;
  });

  // Cuenta mis pendientes (vencidos) para la alerta
  const pendingCount = rows.filter(
    (fu) => fu.id_nurse === userId && fu.status === 'pending',
  ).length;

  // Color del chip según estado
  const statusColor = (status) => {
    if (status === 'pending') return 'error';
    if (status === 'active') return 'warning';
    if (status === 'scheduled') return 'info';
    return 'default';
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
            key={f.key}
            label={f.label}
            onClick={() => setSelectedFilter(f.key)}
            color={selectedFilter === f.key ? 'primary' : 'default'}
            variant={selectedFilter === f.key ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Box>

      {/* Lista de seguimientos */}
      <Grid container spacing={2}>
        {filteredRows.map((fu) => {
          const name = fu.patient_name || patientName(fu.id_patient);
          const patient = patients.find((p) => p.id_user === fu.id_patient);
          const patientAge = patient
            ? getPatientAge(patient.date_of_birth)
            : null;
          const statusLabel = STATUS_LABELS[fu.status] || fu.status;
          const isMine = fu.id_nurse === userId;
          // Finalizar = alta médica: solo tiene sentido en seguimientos vigentes,
          // donde el enfermero efectivamente vio al paciente.
          const canFinish =
            isMine && (fu.status === 'active' || fu.status === 'scheduled');
          // Reprogramar = solo cuando el control ya venció y hay que darle nueva fecha.
          const canReschedule = isMine && fu.status === 'pending';
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
                      <Typography
                        variant="caption"
                        color="#5b7387"
                        display="block"
                      >
                        DNI {patient ? getPatientDni(patient) : '—'}
                        {patientAge != null && ` — ${patientAge} años`}
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
                    label={statusLabel}
                    color={statusColor(fu.status)}
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

                <Typography
                  variant="caption"
                  sx={{ mt: 0.5, display: 'block' }}
                  color="#5b7387"
                >
                  Atendido por: {fu.nurse_name || '—'}
                  {isMine && ' (vos)'}
                </Typography>

                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {canFinish && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => toggle(fu.id_follow_up)}
                    >
                      Marcar finalizado
                    </Button>
                  )}
                  {canReschedule && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="info"
                      onClick={() => openReschedule(fu)}
                    >
                      Reprogramar
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => openHistory(fu.id_patient, name)}
                  >
                    Ver historia clínica
                  </Button>
                </Box>
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
            {!loadingAttended && attendedPatients.length === 0 && (
              <Alert severity="info">
                Todavía no hay pacientes atendidos hoy. El seguimiento se carga
                después de que el médico atienda al paciente.
              </Alert>
            )}
            <Controller
              name="id_patient"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Paciente"
                  disabled={attendedPatients.length === 0}
                  error={!!errors.id_patient}
                  helperText={
                    errors.id_patient?.message || 'Solo pacientes atendidos hoy'
                  }
                >
                  {attendedPatients.map((p) => (
                    <MenuItem key={p.id_user} value={p.id_user}>
                      {p.first_name} {p.last_name} — DNI {getPatientDni(p)} —{' '}
                      {getPatientAge(p.date_of_birth) ?? '—'} años
                      {p.attended_by ? ` — atendido por ${p.attended_by}` : ''}
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
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: today },
              }}
              {...register('next_check_up')}
              error={!!errors.next_check_up}
              helperText={errors.next_check_up?.message}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting || attendedPatients.length === 0}
            >
              Guardar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Diálogo de reprogramar */}
      <Dialog
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Reprogramar seguimiento</DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {rescheduleTarget && (
            <Typography variant="body2" color="#5b7387">
              Paciente: {rescheduleTarget.patient_name}
            </Typography>
          )}
          {rescheduleError && <Alert severity="error">{rescheduleError}</Alert>}
          <TextField
            label="Nueva fecha de control"
            type="date"
            value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: today },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRescheduleOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleReschedule}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de historia clínica */}
      <MedicalHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        patientId={historyPatient.id}
        patientName={historyPatient.name}
        patientDni={historyPatient.dni}
        patientAge={historyPatient.age}
        patientAllergies={historyPatient.allergies}
      />
    </Box>
  );
}
