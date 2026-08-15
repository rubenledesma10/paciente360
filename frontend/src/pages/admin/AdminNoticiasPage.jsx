import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getNews, createNews, updateNews, deleteNews } from '../../api/news';

const CATEGORIES = ['Prevención', 'Salud estacional', 'Enfermedades'];

export default function AdminNoticiasPage() {
  const [news, setNews] = useState([]);
  const [loadError, setLoadError] = useState('');

  // Diálogo crear/editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = crear, objeto = editar
  const [form, setForm] = useState({ title: '', content: '', category: '' });
  const [formError, setFormError] = useState('');

  // Diálogo borrar
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadNews = async () => {
    setLoadError('');
    try {
      const res = await getNews();
      setNews(res.data);
    } catch {
      setLoadError('No se pudieron cargar las noticias.');
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', content: '', category: '' });
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title,
      content: item.content,
      category: item.category,
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.title || !form.content || !form.category) {
      setFormError('Completá todos los campos.');
      return;
    }
    try {
      if (editing) {
        await updateNews(editing.id_news_and_prevention, form);
      } else {
        await createNews(form);
      }
      setDialogOpen(false);
      loadNews();
    } catch (err) {
      setFormError(
        err.response?.data?.message || 'No se pudo guardar la noticia.',
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNews(deleteTarget.id_news_and_prevention);
      setDeleteTarget(null);
      loadNews();
    } catch {
      setLoadError('No se pudo eliminar la noticia.');
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('es-AR');
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800} color="#0E4C82">
            Noticias y novedades
          </Typography>
          <Typography variant="body2" color="#5b7387">
            Publicá contenido para los pacientes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
        >
          Nueva noticia
        </Button>
      </Box>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      <Card sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <b>Título</b>
              </TableCell>
              <TableCell>
                <b>Categoría</b>
              </TableCell>
              <TableCell>
                <b>Fecha</b>
              </TableCell>
              <TableCell align="right">
                <b>Acciones</b>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {news.map((item) => (
              <TableRow key={item.id_news_and_prevention}>
                <TableCell>{item.title}</TableCell>
                <TableCell>
                  <Chip label={item.category} size="small" />
                </TableCell>
                <TableCell>{formatDate(item.date)}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(item)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {news.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="#5b7387" sx={{ py: 2 }}>
                    No hay noticias cargadas.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Diálogo crear/editar */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editing ? 'Editar noticia' : 'Nueva noticia'}
        </DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            label="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextField
            select
            label="Categoría"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Contenido"
            multiline
            minRows={4}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo borrar */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      >
        <DialogTitle>Eliminar noticia</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro que querés eliminar "{deleteTarget?.title}"?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
