import { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Typography,
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getFollowUps } from '../api/followUps';
import { getAppointments, getAppointmentsByPatient } from '../api/appointments';

// Días de anticipación para avisar al paciente que confirme
const CONFIRM_WINDOW_DAYS = 3;

// Parsea 'YYYY-MM-DD' como fecha local (evita el corrimiento de un día por UTC)
const parseDate = (value) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
};

// Devuelve la cantidad de días entre hoy y una fecha (positivo = futuro)
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
  return d
    ? d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    : '—';
};

export default function NotificationsBell() {
  const { rol, userId } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;

    // ----- ENFERMERO: seguimientos de hoy / vencidos -----
    const loadNurse = async () => {
      try {
        const res = await getFollowUps();
        const notifs = res.data
          .filter((f) => f.id_nurse === userId)
          .filter((f) => f.status === 'active' || f.status === 'pending')
          .map((f) => ({
            id: `fu-${f.id_follow_up}`,
            title:
              f.status === 'pending'
                ? `Seguimiento vencido: ${f.patient_name}`
                : `Seguimiento de hoy: ${f.patient_name}`,
            subtitle:
              f.status === 'pending'
                ? 'Hay que reprogramarlo'
                : 'Control programado para hoy',
            to: '/seguimiento',
          }));
        if (!cancelled) setItems(notifs);
      } catch {
        if (!cancelled) setItems([]);
      }
    };

    // ----- MÉDICO: turnos a atender (hoy y próximos) -----
    const loadDoctor = async () => {
      try {
        const res = await getAppointments();
        const notifs = res.data
          .filter((a) => a.id_doctor === userId)
          .filter((a) => a.status === 'Reservado' || a.status === 'En espera')
          .filter((a) => daysUntil(a.date) >= 0) // hoy en adelante
          .sort((a, b) => parseDate(a.date) - parseDate(b.date))
          .map((a) => {
            const d = daysUntil(a.date);
            return {
              id: `ap-${a.id_medical_appointment}`,
              title: `Turno con ${a.patient_name}`,
              subtitle:
                d === 0
                  ? `Hoy a las ${a.hour}`
                  : `${formatDate(a.date)} a las ${a.hour}`,
              to: null,
            };
          });
        if (!cancelled) setItems(notifs);
      } catch {
        if (!cancelled) setItems([]);
      }
    };

    // ----- PACIENTE: turnos por confirmar + próximos -----
    const loadPatient = async () => {
      try {
        const res = await getAppointmentsByPatient(userId);
        const notifs = res.data
          .filter((a) => a.status === 'Reservado' || a.status === 'En espera')
          .filter((a) => daysUntil(a.date) >= 0)
          .sort((a, b) => parseDate(a.date) - parseDate(b.date))
          .map((a) => {
            const d = daysUntil(a.date);
            // Por confirmar: dentro de la ventana, sin confirmar y no el día del turno
            const needsConfirm =
              !a.confirmed && d > 0 && d <= CONFIRM_WINDOW_DAYS;
            return {
              id: `ap-${a.id_medical_appointment}`,
              title: needsConfirm
                ? `Confirmá tu turno del ${formatDate(a.date)}`
                : `Turno el ${formatDate(a.date)}`,
              subtitle: needsConfirm
                ? `Con ${a.doctor_name} a las ${a.hour}`
                : `Con ${a.doctor_name} a las ${a.hour}${a.confirmed ? ' (confirmado)' : ''}`,
              to: '/mis-turnos',
            };
          });
        if (!cancelled) setItems(notifs);
      } catch {
        if (!cancelled) setItems([]);
      }
    };

    const load = () => {
      if (rol === 'Nurse') loadNurse();
      else if (rol === 'Doctor') loadDoctor();
      else if (rol === 'Patient') loadPatient();
      else setItems([]);
    };

    load();

    // Refresco en tiempo real (seguimientos y turnos)
    const handler = () => load();
    window.addEventListener('followups-changed', handler);
    window.addEventListener('appointments-changed', handler);

    return () => {
      cancelled = true;
      window.removeEventListener('followups-changed', handler);
      window.removeEventListener('appointments-changed', handler);
    };
  }, [rol, userId]);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleClickItem = (to) => {
    handleClose();
    if (to) navigate(to);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton onClick={handleOpen}>
        <Badge badgeContent={items.length} color="error">
          <NotificationsNoneIcon sx={{ color: '#5b7387' }} />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ width: 320, maxHeight: 400 }}>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography fontWeight={700} color="#0E4C82">
              Notificaciones
            </Typography>
          </Box>
          <Divider />
          {items.length === 0 ? (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" color="#5b7387">
                No tenés notificaciones.
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {items.map((n) => (
                <ListItemButton
                  key={n.id}
                  onClick={() => handleClickItem(n.to)}
                >
                  <ListItemText
                    primary={n.title}
                    secondary={n.subtitle}
                    slotProps={{
                      primary: {
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#0E4C82',
                      },
                      secondary: { fontSize: 12 },
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}
