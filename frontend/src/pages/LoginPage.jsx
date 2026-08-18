import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardMedia,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useAuth } from '../context/useAuth';
import { roleHome } from '../utils/roleHome';
import { gradients, paletteRaw } from '../theme/theme';
import { getNews } from '../api/news';
import { mediaUrl } from '../utils/mediaUrl';

const schema = yup.object({
  username: yup.string().required('Ingresá tu usuario'),
  password: yup.string().required('Ingresá tu contraseña'),
});

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Noticias públicas
  const [news, setNews] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  useEffect(() => {
    getNews()
      .then((res) => setNews(res.data))
      .catch((error) => console.error(error));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async ({ username, password }) => {
    setServerError('');
    setSubmitting(true);
    try {
      const { rol } = await login(username, password);
      navigate(roleHome(rol), { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
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

  const categories = ['Todas', ...new Set(news.map((item) => item.category))];
  const filteredNews =
    selectedCategory === 'Todas'
      ? news
      : news.filter((item) => item.category === selectedCategory);

  return (
    <Box sx={{ minHeight: '100vh', background: paletteRaw.bg }}>
      <Grid container sx={{ minHeight: '100vh' }}>
        {/* Columna izquierda: bienvenida + login */}
        <Grid
          size={{ xs: 12, md: 5, lg: 4 }}
          sx={{
            background: gradients.login,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 3, md: 4 },
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 400 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                sx={{
                  width: 76,
                  height: 76,
                  mx: 'auto',
                  mb: 2,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#fff',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                }}
              >
                <LocalHospitalIcon
                  sx={{ fontSize: 40, color: paletteRaw.celeste }}
                />
              </Box>
              <Typography variant="h4" fontWeight={800} color="#fff">
                Paciente<span style={{ color: paletteRaw.celesteL }}>360º</span>
              </Typography>
              <Typography variant="body2" sx={{ color: '#D7ECF8' }}>
                Ingresá con tu usuario y contraseña
              </Typography>
            </Box>
            <Paper sx={{ p: 4 }}>
              <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
              >
                {serverError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {serverError}
                  </Alert>
                )}
                <TextField
                  label="Usuario"
                  fullWidth
                  margin="normal"
                  autoFocus
                  {...register('username')}
                  error={!!errors.username}
                  helperText={errors.username?.message}
                />
                <TextField
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  margin="normal"
                  {...register('password')}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword((v) => !v)}
                            edge="end"
                            size="small"
                            aria-label={
                              showPassword
                                ? 'Ocultar contraseña'
                                : 'Mostrar contraseña'
                            }
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={submitting}
                  sx={{ mt: 2 }}
                >
                  {submitting ? 'Ingresando…' : 'Ingresar'}
                </Button>
                <Typography variant="body2" align="center" sx={{ mt: 1.5 }}>
                  <Link component={RouterLink} to="/recuperar-cuenta">
                    ¿Olvidaste tu usuario o contraseña?
                  </Link>
                </Typography>
                <Typography
                  variant="body2"
                  align="center"
                  sx={{ mt: 2 }}
                  color={paletteRaw.gray}
                >
                  ¿Sos paciente y no tenés cuenta?{' '}
                  <Link component={RouterLink} to="/register">
                    Crear cuenta
                  </Link>
                </Typography>

                {/* Sacar turno no requiere cuenta: si el acceso no esta aca,
                    nadie descubre que existe */}
                <Divider sx={{ my: 2 }}>
                  <Typography variant="caption" color={paletteRaw.gray}>
                    o
                  </Typography>
                </Divider>
                <Button
                  component={RouterLink}
                  to="/turnos"
                  variant="outlined"
                  fullWidth
                  startIcon={<EventAvailableIcon />}
                >
                  Sacar un turno sin cuenta
                </Button>
              </Box>
            </Paper>
          </Box>
        </Grid>

        {/* Columna derecha: noticias públicas */}
        <Grid size={{ xs: 12, md: 7, lg: 8 }} sx={{ p: { xs: 3, md: 5 } }}>
          <Box
            sx={{
              mb: 3,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight={800} color="#0E4C82">
                Noticias y Prevención
              </Typography>
              <Typography variant="body1" color="#5b7387">
                Contenido confiable de salud para vos y tu familia
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              to="/turnos"
              variant="contained"
              startIcon={<EventAvailableIcon />}
            >
              Sacar turno
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                onClick={() => setSelectedCategory(cat)}
                color={selectedCategory === cat ? 'primary' : 'default'}
                variant={selectedCategory === cat ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Box>

          <Grid container spacing={3}>
            {filteredNews.map((item) => {
              const photo = mediaUrl(item.photo);
              return (
                <Grid
                  key={item.id_news_and_prevention}
                  size={{ xs: 12, sm: 6 }}
                >
                  <Card sx={{ height: '100%', borderRadius: 3 }}>
                    <CardActionArea
                      onClick={() =>
                        navigate(`/noticias/${item.id_news_and_prevention}`)
                      }
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                      }}
                    >
                      {/* La imagen es opcional: sin foto la tarjeta se ve igual de bien */}
                      {photo && (
                        <CardMedia
                          component="img"
                          image={photo}
                          alt={item.title}
                          sx={{ height: 170, objectFit: 'cover' }}
                        />
                      )}

                      <Box sx={{ p: 2.5 }}>
                        <Chip
                          label={item.category}
                          size="small"
                          sx={{
                            mb: 1.5,
                            fontWeight: 700,
                            bgcolor:
                              item.category === 'Prevención'
                                ? '#e4f5ee'
                                : '#fdf1e0',
                            color:
                              item.category === 'Prevención'
                                ? '#1a8a5a'
                                : '#c77f1a',
                          }}
                        />
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          color="#0E4C82"
                          sx={{ mb: 0.5 }}
                        >
                          {item.title}
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            mb: 1.5,
                          }}
                        >
                          <CalendarTodayIcon
                            sx={{ fontSize: 14, color: '#94a3b8' }}
                          />
                          <Typography variant="caption" color="#94a3b8">
                            {formatDate(item.date)}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          color="#475569"
                          sx={{ lineHeight: 1.6 }}
                        >
                          {item.content}
                        </Typography>
                      </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
