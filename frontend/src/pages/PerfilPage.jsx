import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import LockResetIcon from '@mui/icons-material/LockReset';
import {
  getMyProfile,
  updateMyProfile,
  deleteMyPhoto,
  changeMyPassword,
} from '../api/profile';
import { useAuth } from '../context/useAuth';
import { mediaUrl } from '../utils/mediaUrl';
import { ROLE_LABELS } from '../components/layout/menuConfig';

const MAX_PHOTO_MB = 5;

const EDITABLE = [
  'email',
  'phone_number',
  'address',
  'emergency_contact',
  'country',
  'gender',
];
const PATIENT_EDITABLE = ['health_plan_name', 'member_number'];

const LABELS = {
  email: 'Email',
  phone_number: 'Teléfono',
  address: 'Dirección',
  emergency_contact: 'Contacto de emergencia',
  country: 'País',
  gender: 'Género',
  health_plan_name: 'Obra social',
  member_number: 'Nº de afiliado',
};

const readError = (err, fallback) =>
  err.response?.data?.msg || err.response?.data?.error || fallback;

export default function PerfilPage() {
  const { rol, updateProfileInfo } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState('');
  const [saving, setSaving] = useState(false);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Diálogo de contraseña
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const isPatient = rol === 'Patient';
  const fields = isPatient ? [...EDITABLE, ...PATIENT_EDITABLE] : EDITABLE;

  const loadProfile = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await getMyProfile();
      setProfile(res.data);
      const initial = {};
      [...EDITABLE, ...PATIENT_EDITABLE].forEach((f) => {
        initial[f] = res.data[f] ?? '';
      });
      setForm(initial);
      setPhotoPreview(mediaUrl(res.data.profile_photo));
    } catch (err) {
      setLoadError(readError(err, 'No se pudo cargar tu perfil.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSaveError('El archivo tiene que ser una imagen.');
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setSaveError(`La imagen no puede pesar más de ${MAX_PHOTO_MB} MB.`);
      return;
    }
    setSaveError('');
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = async () => {
    setSaveError('');
    try {
      await deleteMyPhoto();
      setPhotoFile(null);
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // El avatar del shell tiene que reflejarlo sin recargar la página
      updateProfileInfo?.({ foto: null });
      setSaveOk('Foto de perfil eliminada.');
      loadProfile();
    } catch (err) {
      setSaveError(readError(err, 'No se pudo eliminar la foto.'));
    }
  };

  const handleSave = async () => {
    setSaveError('');
    setSaveOk('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (photoFile) payload.profile_photo = photoFile;
      const res = await updateMyProfile(payload);
      setProfile(res.data);
      setPhotoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setPhotoPreview(mediaUrl(res.data.profile_photo));
      updateProfileInfo?.({ foto: res.data.profile_photo });
      setSaveOk('Perfil actualizado.');
    } catch (err) {
      setSaveError(readError(err, 'No se pudieron guardar los cambios.'));
    } finally {
      setSaving(false);
    }
  };

  const openPasswordDialog = () => {
    setCurrentPassword('');
    setNewPassword('');
    setRepeatPassword('');
    setPasswordError('');
    setPasswordOpen(true);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!currentPassword || !newPassword) {
      setPasswordError('Completá los dos campos.');
      return;
    }
    if (newPassword !== repeatPassword) {
      setPasswordError('La nueva contraseña y su repetición no coinciden.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setPasswordSaving(true);
    try {
      await changeMyPassword(currentPassword, newPassword);
      setPasswordOpen(false);
      setSaveOk('Contraseña actualizada.');
    } catch (err) {
      setPasswordError(readError(err, 'No se pudo cambiar la contraseña.'));
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  const fullName = `${profile.first_name} ${profile.last_name}`;

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} color="#0E4C82">
          Mi perfil
        </Typography>
        <Typography variant="body2" color="#5b7387">
          Tus datos personales y de contacto
        </Typography>
      </Box>

      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError('')}>
          {saveError}
        </Alert>
      )}
      {saveOk && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveOk('')}>
          {saveOk}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Columna de identidad: foto y datos no editables */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <Avatar
              src={photoPreview || undefined}
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 2,
                bgcolor: '#0E4C82',
                fontSize: 44,
                fontWeight: 700,
              }}
            >
              {fullName.charAt(0).toUpperCase()}
            </Avatar>

            <Typography fontWeight={800} color="#0E4C82">
              {fullName}
            </Typography>
            <Chip
              size="small"
              label={ROLE_LABELS[profile.rol] || profile.rol}
              sx={{ mt: 0.5, mb: 2 }}
            />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PhotoCameraIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? 'Cambiar foto' : 'Subir foto'}
              </Button>
              {photoPreview && (
                <Button size="small" color="error" onClick={handleRemovePhoto}>
                  Quitar foto
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

            <Divider sx={{ my: 2 }} />

            {/* Datos de identidad: solo lectura, los cambia un administrador */}
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="caption" color="#5b7387" display="block">
                Usuario
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                {profile.username}
              </Typography>

              <Typography variant="caption" color="#5b7387" display="block">
                DNI
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                {profile.dni}
              </Typography>

              <Typography variant="caption" color="#5b7387" display="block">
                Fecha de nacimiento
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {profile.date_of_birth
                  ? new Date(
                      `${profile.date_of_birth}T00:00:00`,
                    ).toLocaleDateString('es-AR')
                  : '—'}
              </Typography>

              {profile.medical_license && (
                <>
                  <Typography
                    variant="caption"
                    color="#5b7387"
                    display="block"
                    sx={{ mt: 1 }}
                  >
                    Matrícula
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {profile.medical_license}
                  </Typography>
                </>
              )}
              {profile.license_number && (
                <>
                  <Typography
                    variant="caption"
                    color="#5b7387"
                    display="block"
                    sx={{ mt: 1 }}
                  >
                    Matrícula
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {profile.license_number}
                  </Typography>
                </>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Columna editable */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: 3 }}>
            <Typography fontWeight={700} color="#0E4C82" sx={{ mb: 2 }}>
              Datos de contacto
            </Typography>

            <Grid container spacing={2}>
              {fields.map((field) => (
                <Grid key={field} size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label={LABELS[field] || field}
                    value={form[field] ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, [field]: e.target.value })
                    }
                  />
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
              <Button
                variant="outlined"
                onClick={loadProfile}
                disabled={saving}
              >
                Descartar
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                variant="text"
                startIcon={<LockResetIcon />}
                onClick={openPasswordDialog}
              >
                Cambiar contraseña
              </Button>
            </Box>

            <Typography
              variant="caption"
              color="#5b7387"
              sx={{ mt: 2, display: 'block' }}
            >
              El usuario, el DNI y la matrícula no se editan desde acá: si hay
              un error en esos datos, pedile la corrección a un administrativo.
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Diálogo de cambio de contraseña */}
      <Dialog
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Cambiar contraseña</DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {passwordError && <Alert severity="error">{passwordError}</Alert>}
          <TextField
            type="password"
            label="Contraseña actual"
            size="small"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <TextField
            type="password"
            label="Nueva contraseña"
            size="small"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="Mínimo 6 caracteres"
          />
          <TextField
            type="password"
            label="Repetir nueva contraseña"
            size="small"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPasswordOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={passwordSaving}
          >
            {passwordSaving ? 'Guardando...' : 'Cambiar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
