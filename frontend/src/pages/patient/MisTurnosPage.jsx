import { useCallback, useEffect, useState } from 'react';
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
  DialogContentText,
  DialogTitle,
  Grid,
  Typography,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { useAuth } from '../../context/useAuth';
import {
  getAppointmentsByPatient,
  confirmAppointment,
  cancelAppointment,
} from '../../api/appointments';

// Estados del turno (AppointmentStatusEnum del backend)
const STATUS_ATTENDED = 'Atendido';
const STATUS_CANCELLED = 'Cancelado';
const STATUS_RESERVED = 'Reservado';
const STATUS_WAITING = 'En espera';

const isOpen = (status) =>
  status === STATUS_RESERVED || status === STATUS_WAITING;

// Parsea 'YYYY-MM-DD' como fecha local (el backend manda date.isoformat()).
// Sin esto, new Date() lo interpreta como UTC y en Argentina resta un día.
const parseDate = (value) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
};

const daysUntil = (value) => {
  const target = parseDate(value);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
};

const formatDate = (value) => {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('es-AR') : '—';
};

const FILTERS = [
  { key: 'proximos', label: 'Próximos' },
  { key: 'historial', label: 'Historial' },
  { key: 'todos', label: 'Todos' },
];

export default function MisTurnosPage() {
  const { userId } = useAuth();
  const [rows, setRows] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionOk, setActionOk] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('proximos');
  const [busyId, setBusyId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const loadAll = useCallback(async () => {
    if (!userId) return;
    setLoadError('');
    try {
      const res = await getAppointmentsByPatient(userId);
      setRows(res.data);
    } catch {
      setLoadError('No se pudieron cargar tus turnos. Reintentá más tarde.');
    }
  }, [userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const notifyChange = () => {
    window.dispatchEvent(new Event('appointments-changed'));
  };

  const readError = (err, fallback) =>
    err.response?.data?.msg || err.response?.data?.error || fallback;

  const handleConfirm = async (id) => {
    setActionError('');
    setActionOk('');
    setBusyId(id);
    try {
      await confirmAppointment(id);
      setActionOk('Confirmaste tu asistencia al turno.');
      await loadAll();
      notifyChange();
    } catch (err) {
      setActionError(readError(err, 'No se pudo confirmar la asistencia.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    const id = cancelTarget.id_medical_appointment;
    setActionError('');
    setActionOk('');
    setBusyId(id);
    try {
      await cancelAppointment(id);
      setActionOk('Turno cancelado.');
      setCancelTarget(null);
      await loadAll();
      notifyChange();
    } catch (err) {
      setActionError(readError(err, 'No se pudo cancelar el turno.'));
      setCancelTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  // Próximos = turnos vigentes de hoy en adelante.
  // Historial = atendidos, cancelados o con fecha pasada.
  const filteredRows = rows
    .filter((ap) => {
      if (selectedFilter === 'todos') return true;
      const d = daysUntil(ap.date);
      const upcoming = isOpen(ap.status) && d !== null && d >= 0;
      return selectedFilter === 'proximos' ? upcoming : !upcoming;
    })
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));

  // El backend ya decide quién puede confirmar: no repetimos la regla acá
  const toConfirmCount = rows.filter((ap) => ap.patient_can_confirm).length;

  const statusChip = (ap) => {
    if (ap.status === STATUS_ATTENDED)
      return { label: 'Atendido', color: 'success' };
    if (ap.status === STATUS_CANCELLED)
      return { label: 'Cancelado', color: 'error' };
    return ap.confirmed
      ? { label: 'Confirmado', color: 'success' }
      : { label: 'Sin confirmar', color: 'warning' };
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} color="#0E4C82">
          Mis turnos
        </Typography>
        <Typography variant="body2" color="#5b7387">
          Consultá, confirmá y cancelá tus turnos médicos
        </Typography>
      </Box>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {actionError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setActionError('')}
        >
          {actionError}
        </Alert>
      )}
      {actionOk && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setActionOk('')}
        >
          {actionOk}
        </Alert>
      )}
      {toConfirmCount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Tenés {toConfirmCount} turno(s) por confirmar
        </Alert>
      )}

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

      <Grid container spacing={2}>
        {filteredRows.map((ap) => {
          const d = daysUntil(ap.date);
          const doctorName = ap.doctor_name || '—';
          const open = isOpen(ap.status);
          const isToday = d === 0;
          const chip = statusChip(ap);
          const busy = busyId === ap.id_medical_appointment;

          return (
            <Grid key={ap.id_medical_appointment} size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 2.5, opacity: open ? 1 : 0.75 }}>
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
                      {doctorName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography fontWeight={700} color="#0E4C82">
                        {doctorName}
                      </Typography>
                      <Typography variant="caption" color="#5b7387">
                        {ap.reason || 'Consulta médica'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 0.5,
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {ap.is_overbooking && (
                      <Chip
                        size="small"
                        label="Sobreturno"
                        color="secondary"
                        variant="outlined"
                      />
                    )}
                    <Chip size="small" label={chip.label} color={chip.color} />
                  </Box>
                </Box>

                <Typography
                  variant="body2"
                  sx={{ mt: 2 }}
                  color="#1565A8"
                  fontWeight={700}
                >
                  {formatDate(ap.date)} a las {ap.hour}
                  {open && isToday && ' — es hoy'}
                </Typography>

                {open && (
                  <Typography
                    variant="caption"
                    sx={{ mt: 0.5, display: 'block' }}
                    color="#5b7387"
                  >
                    Estado del turno: {ap.status}
                  </Typography>
                )}

                <Box
                  sx={{
                    mt: 2,
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  {/* Las reglas de negocio viven en el backend: el front solo obedece */}
                  {ap.patient_can_confirm && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EventAvailableIcon />}
                      disabled={busy}
                      onClick={() => handleConfirm(ap.id_medical_appointment)}
                    >
                      Confirmar asistencia
                    </Button>
                  )}

                  {ap.patient_can_cancel && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<EventBusyIcon />}
                      disabled={busy}
                      onClick={() => setCancelTarget(ap)}
                    >
                      Cancelar turno
                    </Button>
                  )}

                  {open && !ap.patient_can_cancel && (
                    <Typography variant="caption" color="#5b7387">
                      Ya no se puede cancelar online. Comunicate con la clínica.
                    </Typography>
                  )}
                </Box>
              </Card>
            </Grid>
          );
        })}

        {filteredRows.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Typography color="#5b7387">
              No tenés turnos en esta categoría.
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* Confirmación antes de cancelar: es una acción que no se puede deshacer */}
      <Dialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Cancelar turno</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {cancelTarget && (
              <>
                ¿Seguro que querés cancelar el turno con{' '}
                {cancelTarget.doctor_name} del {formatDate(cancelTarget.date)} a
                las {cancelTarget.hour}? Esta acción no se puede deshacer: si
                después querés volver, vas a tener que sacar un turno nuevo.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelTarget(null)}>Volver</Button>
          <Button color="error" variant="contained" onClick={handleCancel}>
            Cancelar turno
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
