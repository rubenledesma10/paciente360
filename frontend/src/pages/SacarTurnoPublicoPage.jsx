import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Link,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  getSpecialties,
  getDoctorsBySpecialty,
  getAvailableSlots,
  createPublicAppointment,
  getPublicBusyHours,
} from '../api/appointments';

const APPOINTMENT_MINUTES = 20;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const today = new Date().toISOString().split('T')[0];

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

function StepTitle({ number, children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
      <Avatar
        sx={{
          width: 26,
          height: 26,
          fontSize: 14,
          fontWeight: 700,
          bgcolor: '#0E4C82',
        }}
      >
        {number}
      </Avatar>
      <Typography fontWeight={700} color="#0E4C82">
        {children}
      </Typography>
    </Box>
  );
}

export default function SacarTurnoPublicoPage() {
  // Datos de la persona
  const [form, setForm] = useState({
    dni: '',
    date_of_birth: '',
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
  });

  const [specialties, setSpecialties] = useState([]);
  const [specialtyId, setSpecialtyId] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctor, setDoctor] = useState(null);

  const [date, setDate] = useState('');
  const [grid, setGrid] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [hour, setHour] = useState('');
  const [reason, setReason] = useState('');
  // Horas en las que esta persona ya tiene turno ese dia (con cualquier medico)
  const [busyHours, setBusyHours] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [booked, setBooked] = useState(null);

  useEffect(() => {
    getSpecialties()
      .then((res) => setSpecialties(res.data))
      .catch(() => setError('No se pudieron cargar las especialidades.'));
  }, []);

  const handleSpecialtyChange = async (value) => {
    setSpecialtyId(value);
    setDoctor(null);
    setDate('');
    setGrid([]);
    setHour('');
    setError('');
    setDoctors([]);
    if (!value) return;
    setLoadingDoctors(true);
    try {
      const res = await getDoctorsBySpecialty(value);
      setDoctors(res.data);
    } catch {
      setError('No se pudieron cargar los profesionales.');
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleDoctorSelect = (d) => {
    setDoctor(d);
    setDate('');
    setGrid([]);
    setHour('');
    setError('');
  };

  const handleDateChange = async (value) => {
    setDate(value);
    setHour('');
    setGrid([]);
    setError('');
    if (!value || !doctor) return;
    setLoadingSlots(true);
    setBusyHours([]);
    try {
      const res = await getAvailableSlots(doctor.id_user, value);
      setGrid((res.data.grid || []).filter((g) => g.status !== 'past'));

      // Solo si ya cargo DNI y fecha de nacimiento podemos saber si tiene
      // otros turnos. Si los datos no coinciden, el backend devuelve vacio.
      if (form.dni && form.date_of_birth) {
        try {
          const mine = await getPublicBusyHours({
            dni: form.dni.trim(),
            date_of_birth: form.date_of_birth,
            date: value,
          });
          setBusyHours(mine.data.busy || []);
        } catch {
          setBusyHours([]);
        }
      }
    } catch (err) {
      setError(readError(err, 'No se pudieron cargar los horarios.'));
    } finally {
      setLoadingSlots(false);
    }
  };

  const datosCompletos =
    form.dni &&
    form.date_of_birth &&
    form.first_name &&
    form.last_name &&
    form.email;

  const handleSubmit = async () => {
    setError('');
    if (!datosCompletos) {
      setError('Completá tus datos personales antes de confirmar.');
      return;
    }
    setSaving(true);
    try {
      const res = await createPublicAppointment({
        ...form,
        id_doctor: doctor.id_user,
        date,
        hour,
        reason: reason || null,
      });
      setBooked({
        doctor: `${doctor.first_name} ${doctor.last_name}`,
        date,
        hour,
        data: res.data,
      });
    } catch (err) {
      setError(readError(err, 'No se pudo reservar el turno.'));
      // Si el horario se ocupó mientras completaba, refrescamos la grilla
      if (err.response?.status === 409 && doctor && date) {
        handleDateChange(date);
      }
    } finally {
      setSaving(false);
    }
  };

  // Choca si se pisa con otro turno propio dentro de los 20 minutos
  const hasOwnConflict = (slotHour) =>
    busyHours.some(
      (h) => Math.abs(toMinutes(h) - toMinutes(slotHour)) < APPOINTMENT_MINUTES,
    );

  const displayGrid = grid.map((slot) => ({
    ...slot,
    ownConflict: slot.status === 'taken' ? false : hasOwnConflict(slot.hour),
  }));

  const freeCount = displayGrid.filter(
    (g) => g.status === 'available' && !g.ownConflict,
  ).length;

  // Pantalla de confirmación
  if (booked) {
    return (
      <Box sx={{ maxWidth: 620, mx: 'auto' }}>
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: '#2e7d32', mb: 1 }} />
          <Typography
            variant="h5"
            fontWeight={800}
            color="#0E4C82"
            gutterBottom
          >
            Turno reservado
          </Typography>
          <Typography color="#34495e" sx={{ mb: 2 }}>
            {booked.doctor}
            <br />
            <strong>
              {formatDate(booked.date)} a las {booked.hour}
            </strong>
          </Typography>

          <Alert severity="info" sx={{ textAlign: 'left', mb: 2 }}>
            Podés ver, confirmar o cancelar este turno entrando con tu DNI como
            usuario y contraseña.
          </Alert>

          <Box
            sx={{
              display: 'flex',
              gap: 1,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Button variant="contained" component={RouterLink} to="/">
              Iniciar sesión
            </Button>
            <Button variant="outlined" onClick={() => window.location.reload()}>
              Sacar otro turno
            </Button>
          </Box>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 780, mx: 'auto' }}>
      <Button
        component={RouterLink}
        to="/"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 1, color: '#1565A8', fontWeight: 600 }}
      >
        Volver al inicio
      </Button>

      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight={800} color="#0E4C82">
          Sacar turno
        </Typography>
        <Typography variant="body1" color="#5b7387">
          No necesitás cuenta. Completá tus datos y elegí el horario.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* 1. Datos personales */}
      <Card sx={{ p: 2.5, mb: 2 }}>
        <StepTitle number={1}>Tus datos</StepTitle>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="DNI"
            required
            sx={{ flex: '1 1 45%' }}
            value={form.dni}
            onChange={(e) => setForm({ ...form, dni: e.target.value })}
          />
          <TextField
            size="small"
            label="Fecha de nacimiento"
            type="date"
            required
            sx={{ flex: '1 1 45%' }}
            slotProps={{ inputLabel: { shrink: true } }}
            value={form.date_of_birth}
            onChange={(e) =>
              setForm({ ...form, date_of_birth: e.target.value })
            }
          />
          <TextField
            size="small"
            label="Nombre"
            required
            sx={{ flex: '1 1 45%' }}
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          />
          <TextField
            size="small"
            label="Apellido"
            required
            sx={{ flex: '1 1 45%' }}
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
          <TextField
            size="small"
            label="Email"
            type="email"
            required
            sx={{ flex: '1 1 45%' }}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <TextField
            size="small"
            label="Teléfono"
            sx={{ flex: '1 1 45%' }}
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
          />
        </Box>

        <Typography
          variant="caption"
          color="#5b7387"
          sx={{ mt: 1.5, display: 'block' }}
        >
          Si ya sos paciente de la clínica, el DNI y la fecha de nacimiento
          tienen que coincidir con los que tenemos registrados. ¿Ya tenés
          cuenta?{' '}
          <Link component={RouterLink} to="/">
            Iniciá sesión
          </Link>
          .
        </Typography>
      </Card>

      {/* 2. Especialidad */}
      <Card sx={{ p: 2.5, mb: 2 }}>
        <StepTitle number={2}>Especialidad</StepTitle>
        <TextField
          select
          fullWidth
          size="small"
          label="Elegí una especialidad"
          value={specialtyId}
          onChange={(e) => handleSpecialtyChange(e.target.value)}
        >
          {specialties.map((s) => (
            <MenuItem key={s.id_speciality} value={s.id_speciality}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
      </Card>

      {/* 3. Profesional */}
      {specialtyId && (
        <Card sx={{ p: 2.5, mb: 2 }}>
          <StepTitle number={3}>Profesional</StepTitle>
          {loadingDoctors && <CircularProgress size={22} />}
          {!loadingDoctors && doctors.length === 0 && (
            <Typography variant="body2" color="#5b7387">
              No hay profesionales disponibles en esta especialidad.
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {doctors.map((d) => {
              const selected = doctor?.id_user === d.id_user;
              return (
                <Card
                  key={d.id_user}
                  onClick={() => handleDoctorSelect(d)}
                  sx={{
                    p: 1.5,
                    minWidth: 230,
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: selected ? '#29ABE2' : 'transparent',
                    bgcolor: selected ? '#f0f9fe' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <Avatar sx={{ bgcolor: '#29ABE2', fontWeight: 700 }}>
                    {d.first_name?.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography fontWeight={700} color="#0E4C82">
                      {d.first_name} {d.last_name}
                    </Typography>
                    <Typography variant="caption" color="#5b7387">
                      {d.health_plans?.length
                        ? d.health_plans.join(', ')
                        : 'Consultar obras sociales'}
                    </Typography>
                  </Box>
                </Card>
              );
            })}
          </Box>
        </Card>
      )}

      {/* 4. Fecha y horario */}
      {doctor && (
        <Card sx={{ p: 2.5, mb: 2 }}>
          <StepTitle number={4}>Fecha y horario</StepTitle>

          <TextField
            type="date"
            size="small"
            label="Fecha"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: today },
            }}
            sx={{ mb: 2 }}
          />

          {loadingSlots && <CircularProgress size={22} />}

          {!loadingSlots && date && freeCount === 0 && grid.length > 0 && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              No quedan horarios libres para esa fecha: el profesional tiene la
              agenda completa. Probá con otro día.
            </Alert>
          )}

          {grid.filter((g) => g.status === 'taken').length > 0 && (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              Horarios ya reservados:{' '}
              {grid
                .filter((g) => g.status === 'taken')
                .map((g) => g.hour)
                .join(' · ')}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {displayGrid.map((slot) => {
              const isTaken = slot.status === 'taken';
              const blocked = isTaken || slot.ownConflict;

              let title = '';
              if (isTaken) title = 'Ese horario ya está reservado';
              else if (slot.ownConflict)
                title = 'Ya tenés un turno a esta hora';

              return (
                <Tooltip
                  key={slot.hour}
                  title={title}
                  disableHoverListener={!blocked}
                >
                  <span>
                    <Chip
                      label={slot.hour}
                      disabled={blocked}
                      onClick={blocked ? undefined : () => setHour(slot.hour)}
                      color={
                        hour === slot.hour
                          ? 'primary'
                          : slot.ownConflict
                            ? 'warning'
                            : 'default'
                      }
                      variant={hour === slot.hour ? 'filled' : 'outlined'}
                      sx={{
                        fontWeight: 600,
                        textDecoration: isTaken ? 'line-through' : 'none',
                      }}
                    />
                  </span>
                </Tooltip>
              );
            })}
          </Box>

          {displayGrid.some((g) => g.ownConflict) && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              Los horarios en naranja no están disponibles porque ya tenés otro
              turno a esa hora. No podés estar con dos profesionales al mismo
              tiempo.
            </Alert>
          )}

          {grid.length > 0 && (
            <Typography
              variant="caption"
              color="#5b7387"
              sx={{ mt: 1, display: 'block' }}
            >
              {freeCount} horario(s) libre(s) · los tachados ya están reservados
            </Typography>
          )}
        </Card>
      )}

      {/* 5. Confirmación */}
      {hour && (
        <Card sx={{ p: 2.5, mb: 4 }}>
          <StepTitle number={5}>Confirmar</StepTitle>
          <Typography variant="body2" color="#34495e" sx={{ mb: 2 }}>
            Turno con{' '}
            <strong>
              {doctor.first_name} {doctor.last_name}
            </strong>{' '}
            el <strong>{formatDate(date)}</strong> a las <strong>{hour}</strong>
            .
          </Typography>

          <TextField
            fullWidth
            size="small"
            label="Motivo de la consulta (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Divider sx={{ mb: 2 }} />

          <Button variant="contained" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Reservando...' : 'Reservar turno'}
          </Button>
        </Card>
      )}
    </Box>
  );
}
