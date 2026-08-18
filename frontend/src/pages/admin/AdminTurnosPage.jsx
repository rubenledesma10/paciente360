import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  getAppointments,
  getAllowedTransitions,
  updateAppointmentStatus,
  cancelAppointment,
  createAppointmentAsAdmin,
  getSpecialties,
  getDoctorsBySpecialty,
  getAvailableSlots,
} from '../../api/appointments';
import { getPatients } from '../../api/patients';

const STATUSES = ['Reservado', 'En espera', 'Atendido', 'Cancelado'];
const today = new Date().toISOString().split('T')[0];

const statusColor = (status) => {
  if (status === 'Reservado') return 'info';
  if (status === 'En espera') return 'warning';
  if (status === 'Atendido') return 'success';
  if (status === 'Cancelado') return 'error';
  return 'default';
};

const parseDate = (value) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
};

const formatDate = (value) => {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('es-AR') : '—';
};

const readError = (err, fallback) =>
  err.response?.data?.msg || err.response?.data?.error || fallback;

const emptyNewPatient = {
  first_name: '',
  last_name: '',
  email: '',
  date_of_birth: '',
  phone_number: '',
  health_plan_name: '',
  member_number: '',
};

export default function AdminTurnosPage() {
  const [rows, setRows] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionOk, setActionOk] = useState('');

  // Filtros
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');

  // Diálogo de cambio de estado
  const [statusTarget, setStatusTarget] = useState(null);
  const [allowedStatuses, setAllowedStatuses] = useState([]);
  const [newStatus, setNewStatus] = useState('');
  const [statusError, setStatusError] = useState('');

  // Diálogo de cancelación
  const [cancelTarget, setCancelTarget] = useState(null);

  // Diálogo de alta
  const [createOpen, setCreateOpen] = useState(false);
  const [dni, setDni] = useState('');
  const [foundPatient, setFoundPatient] = useState(null);
  const [patientChecked, setPatientChecked] = useState(false);
  const [newPatient, setNewPatient] = useState(emptyNewPatient);
  const [specialties, setSpecialties] = useState([]);
  const [specialtyId, setSpecialtyId] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [hour, setHour] = useState('');
  const [reason, setReason] = useState('');
  const [isOverbooking, setIsOverbooking] = useState(false);
  const [createError, setCreateError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (filterStatus) params.status = filterStatus;
      const res = await getAppointments(params);
      setRows(res.data);
    } catch (err) {
      setLoadError(readError(err, 'No se pudieron cargar los turnos.'));
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterStatus]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    getPatients()
      .then((res) => setPatients(res.data))
      .catch(() => setPatients([]));
    getSpecialties()
      .then((res) => setSpecialties(res.data))
      .catch(() => setSpecialties([]));
  }, []);

  const notifyChange = () => {
    window.dispatchEvent(new Event('appointments-changed'));
  };

  // El filtro de médico sale de los turnos ya cargados: no hace falta
  // un endpoint que liste todos los médicos.
  const doctorOptions = useMemo(() => {
    const map = new Map();
    rows.forEach((ap) => {
      if (ap.id_doctor && !map.has(ap.id_doctor)) {
        map.set(ap.id_doctor, ap.doctor_name || `Médico #${ap.id_doctor}`);
      }
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const visibleRows = useMemo(() => {
    const filtered = filterDoctor
      ? rows.filter((ap) => String(ap.id_doctor) === String(filterDoctor))
      : rows;
    return [...filtered].sort((a, b) => {
      const dateDiff = parseDate(a.date) - parseDate(b.date);
      if (dateDiff !== 0) return dateDiff;
      return (a.hour || '').localeCompare(b.hour || '');
    });
  }, [rows, filterDoctor]);

  // ---------- Cambio de estado ----------

  const openStatusDialog = async (appointment) => {
    setStatusTarget(appointment);
    setNewStatus('');
    setStatusError('');
    setAllowedStatuses([]);
    try {
      const res = await getAllowedTransitions(
        appointment.id_medical_appointment,
      );
      setAllowedStatuses(res.data.allowed || []);
    } catch (err) {
      setStatusError(
        readError(err, 'No se pudieron obtener los estados posibles.'),
      );
    }
  };

  const handleStatusChange = async () => {
    if (!statusTarget || !newStatus) return;
    setStatusError('');
    try {
      await updateAppointmentStatus(
        statusTarget.id_medical_appointment,
        newStatus,
      );
      setActionOk(`Turno actualizado a "${newStatus}".`);
      setStatusTarget(null);
      await loadAppointments();
      notifyChange();
    } catch (err) {
      setStatusError(readError(err, 'No se pudo cambiar el estado.'));
    }
  };

  // ---------- Cancelación ----------

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setActionError('');
    try {
      await cancelAppointment(cancelTarget.id_medical_appointment);
      setActionOk('Turno cancelado.');
      setCancelTarget(null);
      await loadAppointments();
      notifyChange();
    } catch (err) {
      setActionError(readError(err, 'No se pudo cancelar el turno.'));
      setCancelTarget(null);
    }
  };

  // ---------- Alta de turno ----------

  const resetCreateForm = () => {
    setDni('');
    setFoundPatient(null);
    setPatientChecked(false);
    setNewPatient(emptyNewPatient);
    setSpecialtyId('');
    setDoctors([]);
    setDoctorId('');
    setAppointmentDate('');
    setSlots([]);
    setHour('');
    setReason('');
    setIsOverbooking(false);
    setCreateError('');
  };

  const openCreate = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  // Se busca en la lista de pacientes ya cargada: si no está, se lo da de alta
  // con el turno, que es lo que pasa cuando alguien llama por teléfono.
  const handleSearchPatient = () => {
    setCreateError('');
    if (!dni.trim()) {
      setCreateError('Ingresá el DNI del paciente.');
      return;
    }
    const match = patients.find((p) => String(p.dni) === dni.trim());
    setFoundPatient(match || null);
    setPatientChecked(true);
  };

  const handleSpecialtyChange = async (value) => {
    setSpecialtyId(value);
    setDoctorId('');
    setDoctors([]);
    setAppointmentDate('');
    setSlots([]);
    setHour('');
    if (!value) return;
    try {
      const res = await getDoctorsBySpecialty(value);
      setDoctors(res.data);
    } catch {
      setCreateError('No se pudieron cargar los profesionales.');
    }
  };

  const handleDoctorChange = (value) => {
    setDoctorId(value);
    setAppointmentDate('');
    setSlots([]);
    setHour('');
  };

  const handleDateChange = async (value) => {
    setAppointmentDate(value);
    setHour('');
    setSlots([]);
    if (!value || !doctorId) return;
    // En un sobreturno no se ofrece la grilla: justamente se pisa un horario ocupado
    if (isOverbooking) return;
    setLoadingSlots(true);
    try {
      const res = await getAvailableSlots(doctorId, value);
      setSlots(res.data.slots || []);
    } catch (err) {
      setCreateError(readError(err, 'No se pudieron cargar los horarios.'));
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleOverbookingToggle = (checked) => {
    setIsOverbooking(checked);
    setHour('');
    setSlots([]);
    // Si vuelve a turno normal y ya había fecha, se recargan los horarios libres
    if (!checked && appointmentDate && doctorId) {
      handleDateChange(appointmentDate);
    }
  };

  const handleCreate = async () => {
    setCreateError('');

    if (!dni.trim()) {
      setCreateError('Ingresá el DNI del paciente.');
      return;
    }
    if (!patientChecked) {
      setCreateError('Buscá el paciente antes de continuar.');
      return;
    }
    if (!foundPatient) {
      const missing = [
        'first_name',
        'last_name',
        'email',
        'date_of_birth',
      ].filter((f) => !newPatient[f]);
      if (missing.length) {
        setCreateError(
          'El paciente es nuevo: completá nombre, apellido, email y fecha de nacimiento.',
        );
        return;
      }
    }
    if (!doctorId || !appointmentDate || !hour) {
      setCreateError('Elegí profesional, fecha y horario.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        dni: dni.trim(),
        id_doctor: Number(doctorId),
        date: appointmentDate,
        hour,
        reason: reason || null,
        is_overbooking: isOverbooking,
      };
      if (!foundPatient) Object.assign(payload, newPatient);

      await createAppointmentAsAdmin(payload);
      setActionOk(
        isOverbooking ? 'Sobreturno registrado.' : 'Turno registrado.',
      );
      setCreateOpen(false);
      resetCreateForm();
      // Un paciente nuevo tiene que aparecer en la próxima búsqueda
      getPatients()
        .then((res) => setPatients(res.data))
        .catch(() => {});
      await loadAppointments();
      notifyChange();
    } catch (err) {
      setCreateError(readError(err, 'No se pudo registrar el turno.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800} color="#0E4C82">
            Gestión de turnos
          </Typography>
          <Typography variant="body2" color="#5b7387">
            Asigná, actualizá y cancelá turnos de la clínica
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
        >
          Nuevo turno
        </Button>
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

      {/* Filtros */}
      <Card sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <TextField
            type="date"
            size="small"
            label="Fecha"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 170 }}
          />
          <TextField
            select
            size="small"
            label="Estado"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Profesional"
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {doctorOptions.map(([id, name]) => (
              <MenuItem key={id} value={id}>
                {name}
              </MenuItem>
            ))}
          </TextField>

          {/* Atajo al caso mas comun del mostrador: la agenda del dia */}
          <Button
            size="small"
            variant={filterDate === today ? 'contained' : 'outlined'}
            onClick={() => setFilterDate(today)}
          >
            Turnos de hoy
          </Button>
          <Button
            size="small"
            onClick={() => {
              setFilterDate('');
              setFilterStatus('');
              setFilterDoctor('');
            }}
          >
            Limpiar
          </Button>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadAppointments}
          >
            Actualizar
          </Button>
          {loading && <CircularProgress size={20} />}
        </Box>
      </Card>

      {/* Listado */}
      <Card sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <b>Fecha</b>
              </TableCell>
              <TableCell>
                <b>Hora</b>
              </TableCell>
              <TableCell>
                <b>Paciente</b>
              </TableCell>
              <TableCell>
                <b>Profesional</b>
              </TableCell>
              <TableCell>
                <b>Motivo</b>
              </TableCell>
              <TableCell>
                <b>Estado</b>
              </TableCell>
              <TableCell align="right">
                <b>Acciones</b>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((ap) => (
              <TableRow key={ap.id_medical_appointment}>
                <TableCell>{formatDate(ap.date)}</TableCell>
                <TableCell>{ap.hour}</TableCell>
                <TableCell>{ap.patient_name || '—'}</TableCell>
                <TableCell>{ap.doctor_name || '—'}</TableCell>
                <TableCell>{ap.reason || '—'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Chip
                      size="small"
                      label={ap.status}
                      color={statusColor(ap.status)}
                    />
                    {ap.is_overbooking && (
                      <Chip
                        size="small"
                        label="Sobreturno"
                        color="secondary"
                        variant="outlined"
                      />
                    )}
                    {ap.confirmed && (
                      <Chip
                        size="small"
                        label="Confirmado"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Cambiar estado">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => openStatusDialog(ap)}
                        disabled={
                          ap.status === 'Atendido' || ap.status === 'Cancelado'
                        }
                      >
                        <SwapHorizIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Cancelar turno">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setCancelTarget(ap)}
                        disabled={
                          ap.status === 'Atendido' || ap.status === 'Cancelado'
                        }
                      >
                        <EventBusyIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {visibleRows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="#5b7387" sx={{ py: 2 }}>
                    No hay turnos para los filtros seleccionados.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Diálogo: cambiar estado */}
      <Dialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Cambiar estado del turno</DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {statusError && <Alert severity="error">{statusError}</Alert>}
          {statusTarget && (
            <Typography variant="body2" color="#5b7387">
              {statusTarget.patient_name} — {formatDate(statusTarget.date)}{' '}
              {statusTarget.hour}
              <br />
              Estado actual: <strong>{statusTarget.status}</strong>
            </Typography>
          )}
          {/* Solo se ofrecen las transiciones que el backend acepta */}
          {allowedStatuses.length === 0 ? (
            <Typography variant="body2" color="#5b7387">
              Este turno ya está en un estado final: no admite más cambios.
            </Typography>
          ) : (
            <TextField
              select
              label="Nuevo estado"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {allowedStatuses.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStatusTarget(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleStatusChange}
            disabled={!newStatus}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo: cancelar turno */}
      <Dialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Cancelar turno</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {cancelTarget && (
              <>
                ¿Cancelar el turno de {cancelTarget.patient_name} con{' '}
                {cancelTarget.doctor_name} el {formatDate(cancelTarget.date)} a
                las {cancelTarget.hour}? El horario queda liberado para otro
                paciente.
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

      {/* Diálogo: nuevo turno */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {isOverbooking ? 'Nuevo sobreturno' : 'Nuevo turno'}
        </DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {createError && <Alert severity="error">{createError}</Alert>}

          {/* 1. Paciente por DNI */}
          <Typography variant="body2" fontWeight={700} color="#0E4C82">
            1. Paciente
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              label="DNI"
              value={dni}
              onChange={(e) => {
                setDni(e.target.value);
                setPatientChecked(false);
                setFoundPatient(null);
              }}
              sx={{ flex: 1 }}
            />
            <Button variant="outlined" onClick={handleSearchPatient}>
              Buscar
            </Button>
          </Box>

          {patientChecked && foundPatient && (
            <Alert severity="success">
              {foundPatient.first_name} {foundPatient.last_name}
              {foundPatient.health_plan_name
                ? ` — ${foundPatient.health_plan_name}`
                : ''}
            </Alert>
          )}

          {patientChecked && !foundPatient && (
            <>
              <Alert severity="info">
                No hay ningún paciente con ese DNI. Completá los datos y se da
                de alta junto con el turno.
              </Alert>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  label="Nombre"
                  sx={{ flex: '1 1 45%' }}
                  value={newPatient.first_name}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, first_name: e.target.value })
                  }
                />
                <TextField
                  size="small"
                  label="Apellido"
                  sx={{ flex: '1 1 45%' }}
                  value={newPatient.last_name}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, last_name: e.target.value })
                  }
                />
                <TextField
                  size="small"
                  label="Email"
                  type="email"
                  sx={{ flex: '1 1 45%' }}
                  value={newPatient.email}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, email: e.target.value })
                  }
                />
                <TextField
                  size="small"
                  label="Fecha de nacimiento"
                  type="date"
                  sx={{ flex: '1 1 45%' }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={newPatient.date_of_birth}
                  onChange={(e) =>
                    setNewPatient({
                      ...newPatient,
                      date_of_birth: e.target.value,
                    })
                  }
                />
                <TextField
                  size="small"
                  label="Teléfono"
                  sx={{ flex: '1 1 45%' }}
                  value={newPatient.phone_number}
                  onChange={(e) =>
                    setNewPatient({
                      ...newPatient,
                      phone_number: e.target.value,
                    })
                  }
                />
                <TextField
                  size="small"
                  label="Obra social"
                  sx={{ flex: '1 1 45%' }}
                  value={newPatient.health_plan_name}
                  onChange={(e) =>
                    setNewPatient({
                      ...newPatient,
                      health_plan_name: e.target.value,
                    })
                  }
                />
              </Box>
            </>
          )}

          <Divider />

          {/* 2. Profesional */}
          <Typography variant="body2" fontWeight={700} color="#0E4C82">
            2. Profesional
          </Typography>
          <TextField
            select
            size="small"
            label="Especialidad"
            value={specialtyId}
            onChange={(e) => handleSpecialtyChange(e.target.value)}
          >
            {specialties.map((s) => (
              <MenuItem key={s.id_speciality} value={s.id_speciality}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Profesional"
            value={doctorId}
            onChange={(e) => handleDoctorChange(e.target.value)}
            disabled={!specialtyId || doctors.length === 0}
            helperText={
              specialtyId && doctors.length === 0
                ? 'No hay profesionales en esta especialidad.'
                : ''
            }
          >
            {doctors.map((d) => (
              <MenuItem key={d.id_user} value={d.id_user}>
                {d.first_name} {d.last_name}
              </MenuItem>
            ))}
          </TextField>

          <Divider />

          {/* 3. Fecha y horario */}
          <Typography variant="body2" fontWeight={700} color="#0E4C82">
            3. Fecha y horario
          </Typography>

          <FormControlLabel
            control={
              <Checkbox
                checked={isOverbooking}
                onChange={(e) => handleOverbookingToggle(e.target.checked)}
              />
            }
            label="Es un sobreturno (urgencia): se agenda aunque el horario esté ocupado"
          />

          <TextField
            type="date"
            size="small"
            label="Fecha"
            value={appointmentDate}
            onChange={(e) => handleDateChange(e.target.value)}
            disabled={!doctorId}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: today },
            }}
          />

          {isOverbooking ? (
            <TextField
              size="small"
              label="Horario (HH:MM)"
              placeholder="14:20"
              value={hour}
              onChange={(e) => setHour(e.target.value)}
              disabled={!appointmentDate}
              helperText="Entre 08:00 y 19:40. Al ser sobreturno puede pisar otro turno del profesional."
            />
          ) : (
            <>
              {loadingSlots && <CircularProgress size={22} />}
              {!loadingSlots && appointmentDate && slots.length === 0 && (
                <Typography variant="body2" color="#5b7387">
                  No quedan horarios libres ese día. Probá otra fecha o cargalo
                  como sobreturno.
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {slots.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    onClick={() => setHour(s)}
                    color={hour === s ? 'primary' : 'default'}
                    variant={hour === s ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Box>
            </>
          )}

          <TextField
            size="small"
            label="Motivo de la consulta (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? 'Guardando...' : 'Registrar turno'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
