import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
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

// Minúsculas y sin tildes, para que la búsqueda no distinga "Gómez" de "gomez"
const normalizeText = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

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
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');
  // Día elegido en el calendario (null = sin filtro por día)
  const [selectedDate, setSelectedDate] = useState(null);
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
    .filter((ap) => {
      if (!selectedDate) return true;
      const d = parseDate(ap.date);
      return d !== null && dayjs(d).isSame(selectedDate, 'day');
    })
    .filter((ap) => {
      const term = normalizeText(search.trim());
      if (!term) return true;
      return [ap.doctor_name, ap.reason, ap.status].some((field) =>
        normalizeText(field).includes(term),
      );
    })
    .sort((a, b) => {
      const byDate = parseDate(a.date) - parseDate(b.date);
      const byHour = String(a.hour ?? '').localeCompare(String(b.hour ?? ''));
      const diff =
        sortKey === 'hour' ? byHour || byDate : byDate || byHour;
      return sortOrder === 'asc' ? diff : -diff;
    });

  // Click en un encabezado: si ya ordena por esa columna invierte el sentido,
  // si no, pasa a ordenar por ella en ascendente.
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Sin cartel de "turnos por confirmar": confirmar es opcional, el paciente
  // puede presentarse igual. El boton alcanza como invitacion.

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

      <Box
        sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <TextField
          size="small"
          label="Buscar por médico, motivo o estado"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
        />
        <DatePicker
          label="Fecha"
          value={selectedDate}
          onChange={(value) => setSelectedDate(value)}
          slotProps={{ textField: { size: 'small' }, field: { clearable: true } }}
        />
        {(selectedDate || search.trim()) && (
          <Button
            size="small"
            onClick={() => {
              setSelectedDate(null);
              setSearch('');
            }}
          >
            Limpiar
          </Button>
        )}
      </Box>

      {/* data-tour: el tutorial resalta la lista para explicar confirmar y cancelar */}
      <TableContainer component={Paper} data-tour="appointments-list">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">Médico</TableCell>
              <TableCell align="center">Motivo</TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortKey === 'date'}
                  direction={sortKey === 'date' ? sortOrder : 'asc'}
                  onClick={() => toggleSort('date')}
                >
                  Fecha
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={sortKey === 'hour'}
                  direction={sortKey === 'hour' ? sortOrder : 'asc'}
                  onClick={() => toggleSort('hour')}
                >
                  Hora
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.map((ap) => {
              const d = daysUntil(ap.date);
              const open = isOpen(ap.status);
              const isToday = d === 0;
              const chip = statusChip(ap);
              const busy = busyId === ap.id_medical_appointment;

              return (
                <TableRow
                  key={ap.id_medical_appointment}
                  sx={{ opacity: open ? 1 : 0.75 }}
                >
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    {ap.doctor_name || '—'}
                  </TableCell>
                  <TableCell align="center">
                    {ap.reason || 'Consulta médica'}
                  </TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    {formatDate(ap.date)}
                    {open && isToday && (
                      <Chip
                        size="small"
                        label="Hoy"
                        color="info"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">{ap.hour}</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Chip size="small" label={chip.label} color={chip.color} />
                    {ap.is_overbooking && (
                      <Chip
                        size="small"
                        label="Sobreturno"
                        color="secondary"
                        variant="outlined"
                        sx={{ ml: 0.5 }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    {/* Las reglas de negocio viven en el backend: el front solo obedece */}
                    {ap.patient_can_confirm && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EventAvailableIcon />}
                        disabled={busy}
                        sx={{ mr: 1 }}
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
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: '#5b7387' }}>
                  {search.trim() || selectedDate
                    ? 'No hay turnos que coincidan con la búsqueda.'
                    : 'No tenés turnos en esta categoría.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
