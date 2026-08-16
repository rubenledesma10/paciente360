import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
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
import ImageIcon from '@mui/icons-material/Image';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { getNews, createNews, updateNews, deleteNews } from '../../api/news';
import { mediaUrl } from '../../utils/mediaUrl';

const CATEGORIES = ['Prevención', 'Salud estacional', 'Enfermedades'];
const MAX_PHOTO_MB = 5;

export default function AdminNoticiasPage() {
  const [news, setNews] = useState([]);
  const [loadError, setLoadError] = useState('');

  // Diálogo crear/editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = crear, objeto = editar
  const [form, setForm] = useState({ title: '', content: '', category: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

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

  const resetPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', content: '', category: '' });
    resetPhoto();
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
    resetPhoto();
    // Al editar se muestra la imagen que ya tiene, hasta que elija otra
    setPhotoPreview(mediaUrl(item.photo));
    setFormError('');
    setDialogOpen(true);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('El archivo tiene que ser una imagen.');
      resetPhoto();
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setFormError(`La imagen no puede pesar más de ${MAX_PHOTO_MB} MB.`);
      resetPhoto();
      return;
    }

    setFormError('');
    setPhotoFile(file);
    // Vista previa local: no se sube nada hasta que guarde
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.title || !form.content || !form.category) {
      setFormError('Completá todos los campos.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, photo: photoFile };
      if (editing) {
        await updateNews(editing.id_news_and_prevention, payload);
      } else {
        await createNews(payload);
      }
      setDialogOpen(false);
      resetPhoto();
      loadNews();
    } catch (err) {
      setFormError(
        err.response?.data?.message || 'No se pudo guardar la noticia.',
      );
    } finally {
      setSaving(false);
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
              <TableCell width={70}>
                <b>Foto</b>
              </TableCell>
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
                <TableCell>
                  <Avatar
                    variant="rounded"
                    src={mediaUrl(item.photo) || undefined}
                    sx={{ width: 48, height: 48, bgcolor: '#e2e8f0' }}
                  >
                    <ImageIcon sx={{ color: '#94a3b8' }} />
                  </Avatar>
                </TableCell>
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
                <TableCell colSpan={5}>
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

          {/* Imagen de portada */}
          <Box>
            <Typography
              variant="body2"
              fontWeight={700}
              color="#0E4C82"
              sx={{ mb: 1 }}
            >
              Imagen de portada
            </Typography>

            {photoPreview && (
              <Box
                component="img"
                src={photoPreview}
                alt="Vista previa"
                sx={{
                  width: '100%',
                  maxHeight: 200,
                  objectFit: 'cover',
                  borderRadius: 2,
                  mb: 1,
                  display: 'block',
                }}
              />
            )}

            <Box
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Button
                variant="outlined"
                size="small"
                startIcon={<PhotoCameraIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? 'Cambiar imagen' : 'Elegir imagen'}
              </Button>
              {photoFile && (
                <Button size="small" color="error" onClick={resetPhoto}>
                  Quitar
                </Button>
              )}
              <Typography variant="caption" color="#5b7387">
                JPG, PNG, GIF o WEBP. Hasta {MAX_PHOTO_MB} MB.
              </Typography>
            </Box>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              hidden
              onChange={handlePhotoChange}
            />

            {editing && !photoFile && (
              <Typography
                variant="caption"
                color="#5b7387"
                sx={{ display: 'block', mt: 1 }}
              >
                Si no elegís una imagen nueva, se mantiene la actual.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
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
