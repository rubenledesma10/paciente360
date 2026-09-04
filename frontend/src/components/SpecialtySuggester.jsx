import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { suggestSpecialty } from '../api/ai';

/**
 * Ayuda a elegir especialidad a partir de lo que cuenta la persona.
 *
 * Se usa en las dos pantallas de reserva (publica y de paciente logueado).
 * onSelect(idEspecialidad) se llama cuando la persona toca una sugerencia.
 *
 * No diagnostica: orienta a quien consultar. Ante una posible urgencia
 * corta y manda al 107.
 */
export default function SpecialtySuggester({ onSelect }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSuggest = async () => {
    if (!description.trim() || loading) return;
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await suggestSpecialty(description.trim());
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.msg || 'No se pudo generar la sugerencia.');
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (id) => {
    onSelect?.(id);
    setOpen(false);
  };

  if (!open) {
    return (
      <Button
        size="small"
        variant="text"
        startIcon={<AutoAwesomeIcon />}
        onClick={() => setOpen(true)}
        sx={{ mb: 1.5, textTransform: 'none' }}
      >
        ¿No sabés qué especialidad elegir? Contanos qué te pasa
      </Button>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{ p: 2, mb: 2, bgcolor: '#f8fafc', borderColor: '#cfe8f7' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AutoAwesomeIcon sx={{ fontSize: 18, color: '#1565A8' }} />
        <Typography variant="subtitle2" fontWeight={700} color="#0E4C82">
          ¿Qué te pasa?
        </Typography>
      </Box>

      <Typography
        variant="caption"
        color="#5b7387"
        sx={{ display: 'block', mb: 1.5 }}
      >
        Contalo en pocas palabras y te orientamos sobre a qué especialidad
        conviene ir. No es un diagnóstico.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          placeholder="Ej: me duele la espalda hace una semana y me cuesta agacharme"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          disabled={loading}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
        <Button
          variant="contained"
          size="small"
          onClick={handleSuggest}
          disabled={loading || !description.trim()}
          startIcon={loading ? <CircularProgress size={14} /> : null}
        >
          {loading ? 'Pensando...' : 'Orientarme'}
        </Button>
        <Button size="small" onClick={() => setOpen(false)}>
          Cerrar
        </Button>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* La urgencia se muestra en rojo y sin sugerencias: no se saca turno */}
      {result?.urgente && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <strong>{result.mensaje}</strong>
        </Alert>
      )}

      {result && !result.urgente && (
        <Box sx={{ mt: 2 }}>
          {result.mensaje && (
            <Typography variant="body2" color="#334155" sx={{ mb: 1.5 }}>
              {result.mensaje}
            </Typography>
          )}

          {result.sugerencias.map((s, i) => (
            <Box
              key={s.id}
              sx={{
                p: 1.5,
                mb: 1,
                borderRadius: 2,
                bgcolor: '#fff',
                border: '1px solid',
                borderColor: i === 0 ? '#29ABE2' : '#e2e8f0',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 0.5,
                  flexWrap: 'wrap',
                }}
              >
                <Typography
                  fontWeight={700}
                  color="#0E4C82"
                  sx={{ textTransform: 'capitalize' }}
                >
                  {s.nombre}
                </Typography>
                {i === 0 && (
                  <Chip size="small" label="Recomendada" color="primary" />
                )}
              </Box>
              <Typography variant="body2" color="#5b7387" sx={{ mb: 1 }}>
                {s.motivo}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handlePick(s.id)}
              >
                Elegir {s.nombre}
              </Button>
            </Box>
          ))}

          <Typography
            variant="caption"
            color="#5b7387"
            sx={{ display: 'block', mt: 1 }}
          >
            Orientación generada automáticamente. Si tenés dudas, Clínica médica
            evalúa y te deriva a donde corresponda.
          </Typography>
        </Box>
      )}
    </Card>
  );
}
