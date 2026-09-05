import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Box, Button, Card, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import InfoIcon from '@mui/icons-material/Info';
// 'ErrorOutline' no existe en esta version de @mui/icons-material
import ErrorOutlineIcon from '@mui/icons-material/Error';
import { useAuth } from '../context/useAuth';
import Logo from '../components/Logo';

// Cada estado que puede devolver el backend, con como se muestra.
const ESTADOS = {
  confirmado: {
    icon: CheckCircleIcon,
    color: '#2e7d32',
    bg: '#e8f5e9',
    titulo: 'Asistencia confirmada',
    texto: 'Gracias por avisar. Te esperamos.',
  },
  cancelado: {
    icon: CancelIcon,
    color: '#c62828',
    bg: '#ffebee',
    titulo: 'Turno cancelado',
    texto:
      'El horario quedó libre para otra persona. Si necesitás atención, podés sacar un turno nuevo.',
  },
  ya_confirmado: {
    icon: CheckCircleIcon,
    color: '#2e7d32',
    bg: '#e8f5e9',
    titulo: 'Este turno ya estaba confirmado',
    texto: 'No hace falta hacer nada más. Te esperamos.',
  },
  cerrado: {
    icon: InfoIcon,
    color: '#1565A8',
    bg: '#e8f4fb',
    titulo: 'Este turno ya no está vigente',
    texto: 'Ya fue atendido o cancelado, así que el link no tiene efecto.',
  },
  vencido: {
    icon: ScheduleIcon,
    color: '#ef6c00',
    bg: '#fff3e0',
    titulo: 'Este link venció',
    texto:
      'Los links del mail duran 48 horas. Podés confirmar o cancelar tu turno desde la aplicación.',
  },
  no_encontrado: {
    icon: ErrorOutlineIcon,
    color: '#c62828',
    bg: '#ffebee',
    titulo: 'No encontramos el turno',
    texto:
      'Puede que haya sido eliminado. Revisá tus turnos desde la aplicación.',
  },
  error: {
    icon: ErrorOutlineIcon,
    color: '#c62828',
    bg: '#ffebee',
    titulo: 'No se pudo procesar el link',
    texto:
      'Probá de nuevo desde el mail, o gestioná tu turno desde la aplicación.',
  },
};

const formatFecha = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

export default function TurnoEmailPage() {
  const [params] = useSearchParams();
  const { isAuthenticated } = useAuth();

  const estado = ESTADOS[params.get('estado')] || ESTADOS.error;
  const fecha = formatFecha(params.get('fecha'));
  const hora = params.get('hora');
  const medico = params.get('medico');
  const Icon = estado.icon;

  // Con sesion iniciada se lo manda a sus turnos; sin sesion, al login,
  // donde entra con su DNI.
  const destinoTurnos = isAuthenticated ? '/mis-turnos' : '/';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#F4F8FB',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Logo size={40} />
        <Typography variant="h6" fontWeight={800} color="#0E4C82">
          Paciente<span style={{ color: '#29ABE2' }}>360º</span>
        </Typography>
      </Box>

      <Card
        sx={{
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          borderRadius: 3,
          maxWidth: 560,
          width: '100%',
        }}
      >
        <Box
          sx={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            bgcolor: estado.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2.5,
          }}
        >
          <Icon sx={{ fontSize: 48, color: estado.color }} />
        </Box>

        <Typography variant="h5" fontWeight={800} color="#0E4C82" gutterBottom>
          {estado.titulo}
        </Typography>

        {(fecha || hora || medico) && (
          <Box
            sx={{
              display: 'inline-block',
              px: 2.5,
              py: 1.5,
              my: 1.5,
              borderRadius: 2,
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            {medico && (
              <Typography fontWeight={700} color="#0E4C82">
                {medico}
              </Typography>
            )}
            {(fecha || hora) && (
              <Typography
                variant="body2"
                color="#5b7387"
                sx={{ textTransform: 'capitalize' }}
              >
                {fecha}
                {fecha && hora ? ' · ' : ''}
                {hora ? `${hora} hs` : ''}
              </Typography>
            )}
          </Box>
        )}

        <Typography color="#334155" sx={{ mb: 3, lineHeight: 1.7 }}>
          {estado.texto}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Button variant="contained" component={RouterLink} to={destinoTurnos}>
            {isAuthenticated ? 'Ver mis turnos' : 'Iniciar sesión'}
          </Button>
          <Button variant="outlined" component={RouterLink} to="/turnos">
            Sacar otro turno
          </Button>
        </Box>

        {!isAuthenticated && (
          <Typography
            variant="caption"
            color="#5b7387"
            sx={{ display: 'block', mt: 2.5 }}
          >
            Ingresás con tu DNI como usuario y contraseña.
          </Typography>
        )}
      </Card>
    </Box>
  );
}
