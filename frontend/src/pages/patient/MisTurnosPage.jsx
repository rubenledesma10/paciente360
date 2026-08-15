import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Grid,
  Typography,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useAuth } from '../../context/useAuth';
import {
  getAppointmentsByPatient,
  confirmAppointment,
} from '../../api/appointments';

// Estados del turno (AppointmentStatusEnum del backend)
const STATUS_RESERVED = 'Reservado';
const STATUS_WAITING = 'En espera';
const STATUS_ATTENDED = 'Atendido';
const STATUS_CANCELLED = 'Cancelado';

// Un turno sigue "en juego" mientras no fue atendido ni cancelado
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

// Días entre hoy y la fecha del turno (0 = hoy, negativo = ya pasó)
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
  const [selectedFilter, setSelectedFilter] = useState('proximos');
  const [confirmingId, setConfirmingId] = useState(null);

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

  // Avisa a la campana que los turnos cambiaron
  const notifyChange = () => {
    window.dispatchEvent(new Event('appointments-changed'));
  };

  const handleConfirm = async (id) => {
    setActionError('');
    setConfirmingId(id);
    try {
      await confirmAppointment(id);
      await loadAll();
      notifyChange();
    } catch (err) {
      setActionError(
        err.response?.data?.error ||
          err.response?.data?.msg ||
          'No se pudo confirmar la asistencia.',
      );
    } finally {
      setConfirmingId(null);
    }
  };

  // Próximos = turnos vigentes (reservados / en espera) de hoy en adelante.
  // Historial = todo lo demás: atendidos, cancelados o con fecha pasada.
  const filteredRows = rows
    .filter((ap) => {
      if (selectedFilter === 'todos') return true;
      const d = daysUntil(ap.date);
      const upcoming = isOpen(ap.status) && d !== null && d >= 0;
      return selectedFilter === 'proximos' ? upcoming : !upcoming;
    })
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));

  // Turnos vigentes sin confirmar, para el aviso de arriba
  const toConfirmCount = rows.filter((ap) => {
    const d = daysUntil(ap.date);
    return isOpen(ap.status) && !ap.confirmed && d !== null && d > 0;
  }).length;

  // El chip de arriba a la derecha: si el turno ya se cerró muestra su estado,
  // si sigue vigente muestra si está confirmado o no.
  const statusChip = (ap) => {
    if (ap.status === STATUS_ATTENDED) {
      return { label: 'Atendido', color: 'success' };
    }
    if (ap.status === STATUS_CANCELLED) {
      return { label: 'Cancelado', color: 'error' };
    }
    return ap.confirmed
      ? { label: 'Confirmado', color: 'success' }
      : { label: 'Sin confirmar', color: 'warning' };
  };

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} color="#0E4C82">
          Mis turnos
        </Typography>
        <Typography variant="body2" color="#5b7387">
          Consultá y confirmá tus turnos médicos
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
      {toConfirmCount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Tenés {toConfirmCount} turno(s) sin confirmar
        </Alert>
      )}

      {/* Filtros */}
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

      {/* Lista de turnos */}
      <Grid container spacing={2}>
        {filteredRows.map((ap) => {
          const d = daysUntil(ap.date);
          const doctorName = ap.doctor_name || '—';
          const open = isOpen(ap.status);
          const isToday = d === 0;
          const isPast = d !== null && d < 0;
          // El backend no permite confirmar el mismo día del turno ni después
          const canConfirm = open && !ap.confirmed && d !== null && d > 0;
          const chip = statusChip(ap);

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
                  <Chip size="small" label={chip.label} color={chip.color} />
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

                {/* El estado en texto solo aporta en los turnos vigentes:
                    en los cerrados ya lo dice el chip */}
                {open && (
                  <Typography
                    variant="caption"
                    sx={{ mt: 0.5, display: 'block' }}
                    color="#5b7387"
                  >
                    Estado del turno: {ap.status}
                  </Typography>
                )}

                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {canConfirm && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EventAvailableIcon />}
                      disabled={confirmingId === ap.id_medical_appointment}
                      onClick={() => handleConfirm(ap.id_medical_appointment)}
                    >
                      Confirmar asistencia
                    </Button>
                  )}
                  {open && !ap.confirmed && isToday && (
                    <Typography variant="caption" color="#5b7387">
                      Ya no se puede confirmar: el turno es hoy.
                    </Typography>
                  )}
                  {open && !ap.confirmed && isPast && (
                    <Typography variant="caption" color="#5b7387">
                      El turno ya pasó sin confirmar.
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
    </Box>
  );
}
