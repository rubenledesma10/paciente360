import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Card, Chip, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getNewsById } from '../api/news';

export default function NewsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);

  useEffect(() => {
    getNewsById(id)
      .then((res) => setItem(res.data))
      .catch((error) => console.error(error));
  }, [id]);

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

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/')}
        sx={{ mb: 2, color: '#1565A8', fontWeight: 600 }}
      >
        Volver a inicio
      </Button>

      <Card sx={{ p: 4, borderRadius: 3 }}>
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
      </Card>
    </Box>
  );
}
