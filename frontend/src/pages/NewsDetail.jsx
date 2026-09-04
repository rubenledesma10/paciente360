import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardMedia,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import { getNewsById } from '../api/news';
import { simplifyNews, chatAboutNews } from '../api/ai';
import { mediaUrl } from '../utils/mediaUrl';

// Muestra texto con saltos de linea y listas simples sin necesitar una
// libreria de markdown: el modelo devuelve parrafos y viñetas con "-".
function TextoFormateado({ text, color = '#334155' }) {
  const lineas = text.split('\n');
  return (
    <Box>
      {lineas.map((linea, i) => {
        const limpia = linea.trim();
        if (!limpia) return <Box key={i} sx={{ height: 8 }} />;
        const esItem = /^[-*•]\s+/.test(limpia);
        return (
          <Typography
            key={i}
            variant="body1"
            color={color}
            sx={{ lineHeight: 1.8, pl: esItem ? 2 : 0 }}
          >
            {esItem ? `• ${limpia.replace(/^[-*•]\s+/, '')}` : limpia}
          </Typography>
        );
      })}
    </Box>
  );
}

export default function NewsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);

  // Explicacion simple
  const [simple, setSimple] = useState('');
  const [loadingSimple, setLoadingSimple] = useState(false);
  const [simpleError, setSimpleError] = useState('');

  // Conversacion sobre la noticia
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role, text }
  const [question, setQuestion] = useState('');
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    getNewsById(id)
      .then((res) => setItem(res.data))
      .catch((error) => console.error(error));
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingAnswer]);

  const handleSimplify = async () => {
    setSimpleError('');
    setLoadingSimple(true);
    try {
      const res = await simplifyNews(id);
      setSimple(res.data.simplified);
    } catch (err) {
      setSimpleError(
        err.response?.data?.msg || 'No se pudo generar la explicación.',
      );
    } finally {
      setLoadingSimple(false);
    }
  };

  const handleAsk = async () => {
    const q = question.trim();
    if (!q || loadingAnswer) return;
    setChatError('');
    setQuestion('');

    // Se agrega la pregunta al hilo antes de la respuesta, asi el usuario
    // ve que fue enviada aunque el modelo tarde.
    const historyForRequest = messages;
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setLoadingAnswer(true);
    try {
      const res = await chatAboutNews(id, q, historyForRequest);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.data.answer },
      ]);
    } catch (err) {
      setChatError(
        err.response?.data?.msg || 'No se pudo responder la pregunta.',
      );
    } finally {
      setLoadingAnswer(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (!item) {
    return (
      <Box sx={{ maxWidth: 760, mx: 'auto' }}>
        <Typography color="#5b7387">Cargando noticia...</Typography>
      </Box>
    );
  }

  const photo = mediaUrl(item.photo);

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/noticias')}
        sx={{ mb: 2, color: '#1565A8', fontWeight: 600 }}
      >
        Volver a noticias
      </Button>

      <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {photo && (
          <CardMedia
            component="img"
            image={photo}
            alt={item.title}
            sx={{ maxHeight: 340, objectFit: 'cover' }}
          />
        )}

        <Box sx={{ p: 4 }}>
          <Chip
            label={item.category}
            size="small"
            sx={{
              mb: 2,
              fontWeight: 700,
              bgcolor: item.category === 'Prevención' ? '#e4f5ee' : '#fdf1e0',
              color: item.category === 'Prevención' ? '#1a8a5a' : '#c77f1a',
            }}
          />
          <Typography
            variant="h4"
            fontWeight={800}
            color="#0E4C82"
            sx={{ mb: 1 }}
          >
            {item.title}
          </Typography>
          <Typography
            variant="caption"
            color="#94a3b8"
            sx={{ display: 'block', mb: 3 }}
          >
            {formatDate(item.date)}
          </Typography>
          <Typography variant="body1" color="#334155" sx={{ lineHeight: 1.8 }}>
            {item.content}
          </Typography>

          {/* ---------- Explicacion simple ---------- */}
          <Box sx={{ mt: 3 }}>
            {!simple && (
              <Button
                variant="outlined"
                startIcon={
                  loadingSimple ? (
                    <CircularProgress size={16} />
                  ) : (
                    <AutoAwesomeIcon />
                  )
                }
                onClick={handleSimplify}
                disabled={loadingSimple}
              >
                {loadingSimple ? 'Generando...' : 'Explicámelo simple'}
              </Button>
            )}

            {simpleError && (
              <Alert
                severity="warning"
                sx={{ mt: 2 }}
                onClose={() => setSimpleError('')}
              >
                {simpleError}
              </Alert>
            )}

            {simple && (
              <Box
                sx={{
                  mt: 2,
                  p: 2.5,
                  borderRadius: 2,
                  bgcolor: '#f0f9fe',
                  border: '1px solid #cfe8f7',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <AutoAwesomeIcon sx={{ fontSize: 18, color: '#1565A8' }} />
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    color="#0E4C82"
                  >
                    En palabras simples
                  </Typography>
                </Box>
                <TextoFormateado text={simple} />
                <Typography
                  variant="caption"
                  color="#5b7387"
                  sx={{ display: 'block', mt: 1.5 }}
                >
                  Explicación generada automáticamente a partir de la noticia.
                  Ante cualquier duda sobre tu salud, consultá con un
                  profesional.
                </Typography>
                <Button
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() => setSimple('')}
                >
                  Ocultar
                </Button>
              </Box>
            )}
          </Box>

          {/* ---------- Conversacion ---------- */}
          <Box sx={{ mt: 2 }}>
            {!chatOpen ? (
              <Button
                variant="text"
                startIcon={<ChatIcon />}
                onClick={() => setChatOpen(true)}
              >
                Tengo dudas sobre este tema
              </Button>
            ) : (
              <Box
                sx={{
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    bgcolor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <ChatIcon sx={{ fontSize: 18, color: '#1565A8' }} />
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    color="#0E4C82"
                  >
                    Preguntá sobre este tema
                  </Typography>
                </Box>

                {/* Hilo de mensajes */}
                <Box sx={{ p: 2.5, maxHeight: 420, overflowY: 'auto' }}>
                  {messages.length === 0 && (
                    <Typography variant="body2" color="#5b7387">
                      Podés preguntar qué significa algo, pedir recomendaciones
                      generales, o cómo sacar un turno. Por ejemplo:{' '}
                      <em>"¿quiénes tienen que vacunarse?"</em>
                    </Typography>
                  )}

                  {messages.map((m, i) => {
                    const esUsuario = m.role === 'user';
                    return (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex',
                          gap: 1.5,
                          mb: 2,
                          flexDirection: esUsuario ? 'row-reverse' : 'row',
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 30,
                            height: 30,
                            fontSize: 13,
                            bgcolor: esUsuario ? '#0E4C82' : '#29ABE2',
                          }}
                        >
                          {esUsuario ? (
                            'Vos'
                          ) : (
                            <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                          )}
                        </Avatar>
                        <Box
                          sx={{
                            maxWidth: '85%',
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: esUsuario ? '#e8f4fb' : '#f8fafc',
                          }}
                        >
                          {esUsuario ? (
                            <Typography variant="body2" color="#0E4C82">
                              {m.text}
                            </Typography>
                          ) : (
                            <TextoFormateado text={m.text} />
                          )}
                        </Box>
                      </Box>
                    );
                  })}

                  {loadingAnswer && (
                    <Box
                      sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}
                    >
                      <Avatar
                        sx={{ width: 30, height: 30, bgcolor: '#29ABE2' }}
                      >
                        <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                      <CircularProgress size={18} />
                    </Box>
                  )}
                  <div ref={chatEndRef} />
                </Box>

                {chatError && (
                  <Alert
                    severity="warning"
                    sx={{ mx: 2.5, mb: 1 }}
                    onClose={() => setChatError('')}
                  >
                    {chatError}
                  </Alert>
                )}

                {/* Entrada */}
                <Box
                  sx={{
                    p: 2,
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
                        handleAsk();
                      }
                    }}
                    slotProps={{ htmlInput: { maxLength: 400 } }}
                    disabled={loadingAnswer}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAsk}
                    disabled={loadingAnswer || !question.trim()}
                    sx={{ minWidth: 44, px: 2 }}
                  >
                    <SendIcon fontSize="small" />
                  </Button>
                </Box>

                {/* El limite del asistente tiene que estar a la vista */}
                <Typography
                  variant="caption"
                  color="#5b7387"
                  sx={{ display: 'block', px: 2.5, pb: 2 }}
                >
                  Respuestas generadas automáticamente. No reemplazan una
                  consulta médica: si tenés dudas sobre tu salud, sacá un turno.
                  Ante una urgencia, llamá al 107.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
