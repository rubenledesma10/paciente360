import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Fab,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { askAssistant } from '../api/ai';

// Sugerencias de arranque, para que el panel vacio no intimide
const SUGERENCIAS = [
  '¿Cómo saco un turno?',
  '¿Cómo cancelo un turno?',
  '¿Cómo cambio mi contraseña?',
];

function TextoFormateado({ text }) {
  return (
    <Box>
      {text.split('\n').map((linea, i) => {
        const limpia = linea.trim().replace(/\*\*/g, '');
        if (!limpia) return <Box key={i} sx={{ height: 6 }} />;
        const esItem = /^(\d+[.)]|[-*•])\s+/.test(limpia);
        return (
          <Typography
            key={i}
            variant="body2"
            color="#334155"
            sx={{ lineHeight: 1.65, pl: esItem ? 1.5 : 0 }}
          >
            {limpia}
          </Typography>
        );
      })}
    </Box>
  );
}

export default function HelpAssistant() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  const send = async (text) => {
    const q = (text ?? question).trim();
    if (!q || loading) return;
    setError('');
    setQuestion('');
    const history = messages;
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await askAssistant(q, history, location.pathname);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.data.answer },
      ]);
    } catch (err) {
      setError(
        err.response?.data?.msg || 'No se pudo responder. Probá de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Boton flotante */}
      {!open && (
        <Tooltip title="Ayuda" placement="left">
          <Fab
            color="primary"
            onClick={() => setOpen(true)}
            sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}
            aria-label="Abrir ayuda"
          >
            <HelpIcon />
          </Fab>
        </Tooltip>
      )}

      {/* Panel de chat */}
      {open && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: { xs: 'calc(100vw - 32px)', sm: 380 },
            height: { xs: 'calc(100vh - 100px)', sm: 520 },
            maxHeight: 'calc(100vh - 48px)',
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          {/* Cabecera */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              bgcolor: '#0E4C82',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <AutoAwesomeIcon fontSize="small" />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>
                Ayuda de Paciente360
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                Preguntá cómo usar la aplicación
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              sx={{ color: '#fff' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Mensajes */}
          <Box
            sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: '#f8fafc' }}
          >
            {messages.length === 0 && (
              <Box>
                <Typography variant="body2" color="#5b7387" sx={{ mb: 1.5 }}>
                  Puedo explicarte dónde está cada cosa y cómo funciona. Por
                  ejemplo:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {SUGERENCIAS.map((s) => (
                    <Button
                      key={s}
                      size="small"
                      variant="outlined"
                      onClick={() => send(s)}
                      sx={{
                        justifyContent: 'flex-start',
                        textTransform: 'none',
                      }}
                    >
                      {s}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}

            {messages.map((m, i) => {
              const esUsuario = m.role === 'user';
              return (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    gap: 1,
                    mb: 1.5,
                    flexDirection: esUsuario ? 'row-reverse' : 'row',
                  }}
                >
                  {!esUsuario && (
                    <Avatar sx={{ width: 26, height: 26, bgcolor: '#29ABE2' }}>
                      <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                    </Avatar>
                  )}
                  <Box
                    sx={{
                      maxWidth: '85%',
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: esUsuario ? '#0E4C82' : '#fff',
                      border: esUsuario ? 'none' : '1px solid #e2e8f0',
                    }}
                  >
                    {esUsuario ? (
                      <Typography variant="body2" sx={{ color: '#fff' }}>
                        {m.text}
                      </Typography>
                    ) : (
                      <TextoFormateado text={m.text} />
                    )}
                  </Box>
                </Box>
              );
            })}

            {loading && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Avatar sx={{ width: 26, height: 26, bgcolor: '#29ABE2' }}>
                  <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                </Avatar>
                <CircularProgress size={16} />
              </Box>
            )}

            {error && (
              <Alert
                severity="warning"
                sx={{ mt: 1 }}
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            )}
            <div ref={endRef} />
          </Box>

          {/* Entrada */}
          <Box
            sx={{
              p: 1.5,
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: 1,
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Escribí tu pregunta"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              slotProps={{ htmlInput: { maxLength: 400 } }}
              disabled={loading}
              autoFocus
            />
            <Button
              variant="contained"
              onClick={() => send()}
              disabled={loading || !question.trim()}
              sx={{ minWidth: 40, px: 1.5 }}
            >
              <SendIcon fontSize="small" />
            </Button>
          </Box>

          <Typography
            variant="caption"
            color="#5b7387"
            sx={{ px: 2, pb: 1.5, textAlign: 'center' }}
          >
            Solo explica cómo usar la app. Para consultas de salud, sacá un
            turno.
          </Typography>
        </Paper>
      )}
    </>
  );
}
