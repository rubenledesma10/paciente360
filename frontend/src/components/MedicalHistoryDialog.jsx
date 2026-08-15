import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getMedicalHistory } from '../api/medicalHistory';

const typeColor = (tipo) => {
  if (tipo === 'Seguimiento') return 'info';
  if (tipo === 'Signos y Síntomas') return 'warning';
  if (tipo === 'Indicación Médica') return 'success';
  return 'default';
};

export default function MedicalHistoryDialog({
  open,
  onClose,
  patientId,
  patientName,
  patientDni,
  patientAge,
}) {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !patientId) return;
    setError('');
    setLoading(true);
    getMedicalHistory(patientId)
      .then((res) => setEvents(res.data))
      .catch(() => setError('No se pudo cargar la historia clínica.'))
      .finally(() => setLoading(false));
  }, [open, patientId]);

  const renderDetalle = (evento) => {
    const d = evento.detalle;
    if (evento.tipo === 'Seguimiento') {
      return (
        <>
          <Typography variant="body2" color="#34495e">
            {d.observations}
          </Typography>
          {d.next_check_up && (
            <Typography variant="caption" color="#5b7387">
              Próximo control:{' '}
              {new Date(d.next_check_up).toLocaleDateString('es-AR')}
            </Typography>
          )}
        </>
      );
    }
    if (evento.tipo === 'Signos y Síntomas') {
      return (
        <>
          <Typography variant="body2" color="#34495e">
            {d.signs && `Signos: ${d.signs}. `}
            {d.symptoms && `Síntomas: ${d.symptoms}.`}
          </Typography>
          <Typography variant="caption" color="#5b7387">
            {d.temperature && `Temp: ${d.temperature}°C · `}
            {d.blood_pressure && `Presión: ${d.blood_pressure}`}
          </Typography>
          {d.observations && (
            <Typography variant="caption" display="block" color="#5b7387">
              {d.observations}
            </Typography>
          )}
        </>
      );
    }
    if (evento.tipo === 'Indicación Médica') {
      return (
        <>
          <Typography variant="body2" color="#34495e">
            {d.indication}
          </Typography>
          {d.treatment && (
            <Typography variant="caption" color="#5b7387">
              Tratamiento: {d.treatment}
            </Typography>
          )}
        </>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800} color="#0E4C82">
            Historia clínica
          </Typography>
          <Typography variant="caption" color="#5b7387">
            {patientName}
            {patientDni && ` — DNI ${patientDni}`}
            {patientAge != null && ` — ${patientAge} años`}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error">{error}</Alert>}
        {loading && (
          <Typography color="#5b7387">Cargando historia clínica...</Typography>
        )}
        {!loading && !error && events.length === 0 && (
          <Typography color="#5b7387">
            Este paciente todavía no tiene registros en su historia clínica.
          </Typography>
        )}

        {events.map((evento, index) => (
          <Box key={`${evento.tipo}-${evento.id}`} sx={{ mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 0.5,
              }}
            >
              <Chip
                size="small"
                label={evento.tipo}
                color={typeColor(evento.tipo)}
              />
              <Typography variant="caption" color="#94a3b8">
                {evento.fecha
                  ? new Date(evento.fecha).toLocaleString('es-AR')
                  : 'Sin fecha'}
              </Typography>
            </Box>
            {renderDetalle(evento)}
            {index < events.length - 1 && <Divider sx={{ mt: 2 }} />}
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}
