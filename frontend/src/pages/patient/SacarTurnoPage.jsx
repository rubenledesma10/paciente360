import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  getSpecialties,
  getDoctorsBySpecialty,
  getAvailableSlots,
  createMyAppointment,
  getAppointmentsByPatient,
} from '../../api/appointments';
import { useAuth } from '../../context/useAuth';

const APPOINTMENT_MINUTES = 20;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const today = new Date().toISOString().split('T')[0];

// Título de cada bloque del flujo
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

export default function SacarTurnoPage() {
  const navigate = useNavigate();
  const { userId } = useAuth();

  // Turnos que el paciente ya tiene ese dia: no puede estar en dos
  // consultorios a la vez, aunque sean profesionales distintos.
  const [myAppointments, setMyAppointments] = useState([]);

  const [specialties, setSpecialties] = useState([]);
  const [specialtyId, setSpecialtyId] = useState('');

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctor, setDoctor] = useState(null);

  const [date, setDate] = useState('');
  // grid trae TODOS los horarios con su estado (libre / ocupado / pasado).
  // Mostrar el ocupado en gris explica por que no se puede elegir, en vez
  // de hacerlo desaparecer sin aviso.
  const [grid, setGrid] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [hour, setHour] = useState('');

  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Especialidades: se cargan una sola vez
  useEffect(() => {
    getSpecialties()
      .then((res) => setSpecialties(res.data))
      .catch(() => setError('No se pudieron cargar las especialidades.'));
  }, []);

  // Al cambiar la especialidad se reinicia todo lo que viene después
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

  // Al elegir fecha se piden los horarios libres de ese médico
  const handleDateChange = async (value) => {
    setDate(value);
    setHour('');
    setGrid([]);
    setError('');
    if (!value || !doctor) return;

    setLoadingSlots(true);
    try {
      const [slotsRes, mineRes] = await Promise.all([
        getAvailableSlots(doctor.id_user, value),
        getAppointmentsByPatient(userId),
      ]);
      // Los pasados no se muestran: no aportan nada y ensucian la grilla
      setGrid((slotsRes.data.grid || []).filter((g) => g.status !== 'past'));
      setMyAppointments(
        (mineRes.data || []).filter(
          (a) =>
            a.date === value &&
            (a.status === 'Reservado' || a.status === 'En espera'),
        ),
      );
    } catch (err) {
      setError(
        err.response?.data?.msg || 'No se pudieron cargar los horarios.',
      );
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      await createMyAppointment({
        id_doctor: doctor.id_user,
        date,
        hour,
        reason: reason || null,
      });
      // Avisa a la campana que hay un turno nuevo
      window.dispatchEvent(new Event('appointments-changed'));
      navigate('/mis-turnos');
    } catch (err) {
      setError(
        err.response?.data?.msg ||
          err.response?.data?.error ||
          'No se pudo reservar el turno.',
      );
      // Si el horario se ocupó mientras elegía, refrescamos la grilla
      if (err.response?.status === 409 && doctor && date) {
        handleDateChange(date);
      }
    } finally {
      setSaving(false);
    }
  };

  // Un horario choca si se pisa con otro turno propio dentro de los 20 minutos
  const findMyConflict = (slotHour) =>
    myAppointments.find(
      (a) =>
        a.hour &&
        Math.abs(toMinutes(a.hour) - toMinutes(slotHour)) < APPOINTMENT_MINUTES,
    );

  const displayGrid = grid.map((slot) => {
    if (slot.status === 'taken') return { ...slot, conflict: null };
    return { ...slot, conflict: findMyConflict(slot.hour) || null };
  });

  const takenHours = grid
    .filter((g) => g.status === 'taken')
    .map((g) => g.hour);
  const freeCount = displayGrid.filter(
    (g) => g.status === 'available' && !g.conflict,
  ).length;
  const canSubmit = doctor && date && hour && !saving;

  return (
    <Box sx={{ maxWidth: 780 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} color="#0E4C82">
          Sacar turno
        </Typography>
        <Typography variant="body2" color="#5b7387">
          Elegí especialidad, profesional y horario
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* 1. Especialidad */}
      <Card sx={{ p: 2.5, mb: 2 }}>
        <StepTitle number={1}>Especialidad</StepTitle>
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

      {/* 2. Profesional */}
      {specialtyId && (
        <Card sx={{ p: 2.5, mb: 2 }}>
          <StepTitle number={2}>Profesional</StepTitle>

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

      {/* 3. Fecha y horario */}
      {doctor && (
        <Card sx={{ p: 2.5, mb: 2 }}>
          <StepTitle number={3}>Fecha y horario</StepTitle>

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

          {!loadingSlots && date && grid.length === 0 && (
            <Typography variant="body2" color="#5b7387">
              No hay horarios de atención para esa fecha.
            </Typography>
          )}

          {takenHours.length > 0 && (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              Horarios ya reservados con este profesional:{' '}
              {takenHours.join(' · ')}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {displayGrid.map((slot) => {
              const isTaken = slot.status === 'taken';
              const conflict = slot.conflict;
              const blocked = isTaken || Boolean(conflict);

              let title = '';
              if (isTaken) title = 'Ese horario ya está reservado';
              else if (conflict)
                title = `Ya tenés un turno a esta hora con ${conflict.doctor_name}`;

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
                          : conflict
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

          {/* Aviso especifico: no es que el medico este ocupado, es que el
              paciente ya tiene otra consulta a esa hora */}
          {displayGrid.some((g) => g.conflict) && (
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
              {freeCount} horario(s) disponible(s) para vos
            </Typography>
          )}
        </Card>
      )}

      {/* 4. Confirmación */}
      {hour && (
        <Card sx={{ p: 2.5, mb: 2 }}>
          <StepTitle number={4}>Confirmar</StepTitle>

          <Typography variant="body2" color="#34495e" sx={{ mb: 2 }}>
            Turno con{' '}
            <strong>
              {doctor.first_name} {doctor.last_name}
            </strong>{' '}
            el{' '}
            <strong>
              {new Date(`${date}T00:00:00`).toLocaleDateString('es-AR')}
            </strong>{' '}
            a las <strong>{hour}</strong>.
          </Typography>

          <TextField
            fullWidth
            size="small"
            label="Motivo de la consulta (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {saving ? 'Reservando...' : 'Reservar turno'}
          </Button>
        </Card>
      )}
    </Box>
  );
}
