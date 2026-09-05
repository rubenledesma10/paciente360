import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  getAdministrators,
  createAdministrator,
  updateAdministrator,
  toggleAdministratorStatus,
} from '../../api/admins';
import { useAuth } from '../../context/useAuth';

const GENDERS = ['Femenino', 'Masculino', 'Otro'];

const readError = (err, fallback) =>
  err.response?.data?.msg || err.response?.data?.error || fallback;

const emptyForm = {
  first_name: '',
  last_name: '',
  username: '',
  dni: '',
  email: '',
  date_of_birth: '',
  phone_number: '',
  address: '',
  gender: '',
  emergency_contact: '',
};

export default function AdminAdministradoresPage() {
  const { userId } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionOk, setActionOk] = useState('');
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [toggleTarget, setToggleTarget] = useState(null);

  const loadRows = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await getAdministrators();
      setRows(res.data);
    } catch (err) {
      setLoadError(readError(err, 'No se pudo cargar el listado.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.first_name, r.last_name, r.dni, r.email, r.username]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm(
      Object.fromEntries(Object.keys(emptyForm).map((k) => [k, row[k] ?? ''])),
    );
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    const faltan = [
      'first_name',
      'last_name',
      'dni',
      'email',
      'date_of_birth',
    ].filter((c) => !form[c]);
    if (faltan.length) {
      setFormError(
        'Completá nombre, apellido, DNI, email y fecha de nacimiento.',
      );
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        // El endpoint de edicion espera 'phone', el de alta 'phone_number'.
        // Se manda como lo espera cada uno.
        const { phone_number, ...rest } = form;
        await updateAdministrator(editing.id_user, {
          ...rest,
          phone: phone_number,
        });
        setActionOk('Administrador actualizado.');
      } else {
        const payload = { ...form, username: form.username || form.dni };
        await createAdministrator(payload);
        setActionOk(
          `Administrador creado. Usuario: ${payload.username}. Contraseña inicial: el DNI.`,
        );
      }
      setDialogOpen(false);
      loadRows();
    } catch (err) {
      setFormError(readError(err, 'No se pudieron guardar los datos.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!toggleTarget) return;
    setActionError('');
    try {
      await toggleAdministratorStatus(toggleTarget.id_user);
      setActionOk(
        toggleTarget.is_active ? 'Cuenta dada de baja.' : 'Cuenta reactivada.',
      );
      setToggleTarget(null);
      loadRows();
    } catch (err) {
      setActionError(
        readError(err, 'No se pudo cambiar el estado de la cuenta.'),
      );
      setToggleTarget(null);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800} color="#0E4C82">
            Administradores
          </Typography>
          <Typography variant="body2" color="#5b7387">
            Cuentas con gestión completa del sistema
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
        >
          Nuevo administrador
        </Button>
      </Box>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {actionError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setActionError('')}
        >
          {actionError}
        </Alert>
      )}
      {actionOk && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setActionOk('')}
        >
          {actionOk}
        </Alert>
      )}

      <Card sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            size="small"
            label="Buscar por nombre, DNI, email o usuario"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 340 }}
          />
          {loading && <CircularProgress size={20} />}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="#5b7387">
            {visibleRows.length} de {rows.length}
          </Typography>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <b>Nombre</b>
              </TableCell>
              <TableCell>
                <b>Usuario</b>
              </TableCell>
              <TableCell>
                <b>DNI</b>
              </TableCell>
              <TableCell>
                <b>Email</b>
              </TableCell>
              <TableCell>
                <b>Teléfono</b>
              </TableCell>
              <TableCell>
                <b>Estado</b>
              </TableCell>
              <TableCell align="right">
                <b>Acciones</b>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row) => {
              const esUnoMismo = row.id_user === userId;
              return (
                <TableRow
                  key={row.id_user}
                  sx={{ opacity: row.is_active ? 1 : 0.55 }}
                >
                  <TableCell>
                    {row.last_name}, {row.first_name}
                  </TableCell>
                  <TableCell>{row.username}</TableCell>
                  <TableCell>{row.dni}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.phone_number || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.is_active ? 'Activo' : 'Dado de baja'}
                      color={row.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip
                      title={
                        esUnoMismo
                          ? 'No podés darte de baja a vos mismo'
                          : row.is_active
                            ? 'Dar de baja'
                            : 'Reactivar'
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          color={row.is_active ? 'error' : 'success'}
                          onClick={() => setToggleTarget(row)}
                          disabled={esUnoMismo}
                        >
                          {row.is_active ? (
                            <BlockIcon fontSize="small" />
                          ) : (
                            <CheckCircleIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {visibleRows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="#5b7387" sx={{ py: 2 }}>
                    No hay administradores para mostrar.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Alta / edicion */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editing ? 'Editar administrador' : 'Nuevo administrador'}
        </DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              label="Nombre"
              required
              sx={{ flex: '1 1 45%' }}
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
            <TextField
              size="small"
              label="Apellido"
              required
              sx={{ flex: '1 1 45%' }}
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
            <TextField
              size="small"
              label="DNI"
              required
              sx={{ flex: '1 1 45%' }}
              value={form.dni}
              onChange={(e) => setForm({ ...form, dni: e.target.value })}
            />
            <TextField
              size="small"
              label="Usuario"
              sx={{ flex: '1 1 45%' }}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              helperText="Si lo dejás vacío, se usa el DNI"
            />
            <TextField
              size="small"
              label="Email"
              type="email"
              required
              sx={{ flex: '1 1 45%' }}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              size="small"
              label="Fecha de nacimiento"
              type="date"
              required
              sx={{ flex: '1 1 45%' }}
              slotProps={{ inputLabel: { shrink: true } }}
              value={form.date_of_birth}
              onChange={(e) =>
                setForm({ ...form, date_of_birth: e.target.value })
              }
            />
            <TextField
              size="small"
              label="Teléfono"
              sx={{ flex: '1 1 45%' }}
              value={form.phone_number}
              onChange={(e) =>
                setForm({ ...form, phone_number: e.target.value })
              }
            />
            <TextField
              select
              size="small"
              label="Género"
              sx={{ flex: '1 1 45%' }}
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              {GENDERS.map((g) => (
                <MenuItem key={g} value={g}>
                  {g}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Dirección"
              sx={{ flex: '1 1 100%' }}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <TextField
              size="small"
              label="Contacto de emergencia"
              sx={{ flex: '1 1 100%' }}
              value={form.emergency_contact}
              onChange={(e) =>
                setForm({ ...form, emergency_contact: e.target.value })
              }
            />
          </Box>
          {!editing && (
            <Alert severity="info">
              La contraseña inicial es el DNI. Le llega un mail de bienvenida y
              la cambia desde "Mi perfil".
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Baja / reactivacion */}
      <Dialog
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {toggleTarget?.is_active ? 'Dar de baja' : 'Reactivar cuenta'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {toggleTarget?.is_active
              ? `${toggleTarget?.first_name} ${toggleTarget?.last_name} no va a poder iniciar sesión. Podés reactivarlo cuando quieras.`
              : `${toggleTarget?.first_name} ${toggleTarget?.last_name} va a poder volver a iniciar sesión.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setToggleTarget(null)}>Volver</Button>
          <Button
            variant="contained"
            color={toggleTarget?.is_active ? 'error' : 'success'}
            onClick={handleToggle}
          >
            {toggleTarget?.is_active ? 'Dar de baja' : 'Reactivar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
