import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardMedia,
  Chip,
  Grid,
  Typography,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../context/useAuth';
import { getNews } from '../api/news';
import { mediaUrl } from '../utils/mediaUrl';

export default function NewsAndPrevention() {
  // Con sesion iniciada esta pantalla vive dentro del AuthShell y ya tiene
  // el menu lateral: la flecha de volver solo hace falta en la vista publica.
  const { isAuthenticated } = useAuth();
  const [news, setNews] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const navigate = useNavigate();

  useEffect(() => {
    getNews()
      .then((res) => setNews(res.data))
      .catch((error) => console.error(error));
  }, []);

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
    <Box>
      {!isAuthenticated && (
        <Button
          component={RouterLink}
          to="/"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 1, color: '#1565A8', fontWeight: 600 }}
        >
          Volver al inicio
        </Button>
      )}

      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={800} color="#0E4C82">
          Noticias y Prevención
        </Typography>
        <Typography variant="body1" color="#5b7387">
          Contenido confiable de salud para vos y tu familia
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 1,
          mb: 4,
          flexWrap: 'wrap',
        }}
      >
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
              size={{ xs: 12, sm: 6, md: 4 }}
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
                  {/* Las noticias sin foto siguen viendose bien: la imagen es opcional */}
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
    </Box>
  );
}
