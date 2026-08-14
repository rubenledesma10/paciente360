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

export default function NotificationsBell() {
  const { rol, userId } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadNurse = async () => {
      try {
        const res = await getFollowUps();
        const notifs = res.data
          .filter((f) => f.id_nurse === userId)
          .filter((f) => f.status === 'active' || f.status === 'pending')
          .map((f) => ({
            id: `fu-${f.id_follow_up}`,
            kind: f.status,
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

    const load = () => {
      if (rol === 'Nurse') {
        loadNurse();
      } else {
        setItems([]);
      }
    };

    load();

    // Escucha cambios en los seguimientos para refrescar en tiempo real
    const handler = () => load();
    window.addEventListener('followups-changed', handler);

    return () => {
      cancelled = true;
      window.removeEventListener('followups-changed', handler);
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
