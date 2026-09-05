import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  getPatients,
  createPatient,
  updatePatient,
  togglePatientStatus,
} from '../../api/patients';
import {
  getNurses,
  createNurse,
  updateNurse,
  toggleNurseStatus,
} from '../../api/nurses';

const GENDERS = ['Femenino', 'Masculino', 'Otro'];

const readError = (err, fallback) =>
  err.response?.data?.msg || err.response?.data?.error || fallback;

const emptyForm = {
  first_name: '',
  last_name: '',
  dni: '',
  email: '',
  date_of_birth: '',
  phone_number: '',
  address: '',
  gender: '',
  emergency_contact: '',
  // paciente
  health_plan_name: '',
  member_number: '',
  // enfermero
  license_number: '',
  is_reference: false,
};

export default function AdminUsuariosPage() {
  const [tab, setTab] = useState('patients');
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

  const isPatients = tab === 'patients';

  const loadRows = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = isPatients ? await getPatients() : await getNurses();
      setRows(res.data);
    } catch (err) {
      setLoadError(readError(err, 'No se pudo cargar el listado.'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isPatients]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // Filtrado en memoria: los listados de una salita son chicos y asi el
  // buscador responde sin ir al servidor en cada tecla.
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.first_name, r.last_name, r.dni, r.email, r.license_number]
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
    setForm({
      ...emptyForm,
      ...Object.fromEntries(
        Object.keys(emptyForm).map((k) => [k, row[k] ?? emptyForm[k]]),
      ),
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFormError('');

    const obligatorios = [
      'first_name',
      'last_name',
      'dni',
      'email',
      'date_of_birth',
    ];
    if (!isPatients) obligatorios.push('license_number');
    const faltan = obligatorios.filter((c) => !form[c]);
    if (faltan.length) {
      setFormError(
        'Completá nombre, apellido, DNI, email y fecha de nacimiento' +
          (isPatients ? '.' : ', más la matrícula.'),
      );
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form };
      if (isPatients) {
        delete payload.license_number;
        delete payload.is_reference;
        payload.health_plan_status = Boolean(form.health_plan_name);
      } else {
        delete payload.health_plan_name;
        delete payload.member_number;
        // El alta de enfermero lee 'phone' y la edicion 'phone_number'.
        // Se mandan las dos para que funcione en ambos casos.
        payload.phone = form.phone_number;
      }

      if (editing) {
        const id = editing.id_user;
        if (isPatients) await updatePatient(id, payload);
        else await updateNurse(id, payload);
        setActionOk('Datos actualizados.');
      } else {
        // El usuario y la contraseña iniciales son el DNI; cada uno la
        // cambia después desde su perfil. El backend NO lo completa solo:
        // si no se manda, username queda en null y la columna no lo acepta.
        payload.username = form.dni;
        payload.password = form.dni;
        if (isPatients) await createPatient(payload);
        else await createNurse(payload);
        setActionOk(
          `${isPatients ? 'Paciente' : 'Enfermero'} creado. Usuario y contraseña iniciales: ${form.dni}`,
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
      const id = toggleTarget.id_user;
      if (isPatients) await togglePatientStatus(id);
      else await toggleNurseStatus(id);
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
            Usuarios
          </Typography>
          <Typography variant="body2" color="#5b7387">
            Altas y bajas de pacientes y personal de enfermería
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
        >
          {isPatients ? 'Nuevo paciente' : 'Nuevo enfermero'}
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
        <Tabs
          value={tab}
          onChange={(e, v) => {
            setTab(v);
            setSearch('');
          }}
          sx={{ mb: 2 }}
        >
          <Tab value="patients" label="Pacientes" />
          <Tab value="nurses" label="Enfermeros" />
        </Tabs>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            size="small"
            label="Buscar por nombre, DNI o email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 320 }}
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
                <b>DNI</b>
              </TableCell>
              <TableCell>
                <b>Email</b>
              </TableCell>
              <TableCell>
                <b>Teléfono</b>
              </TableCell>
              <TableCell>
                <b>{isPatients ? 'Obra social' : 'Matrícula'}</b>
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
            {visibleRows.map((row) => (
              <TableRow
                key={row.id_user}
                sx={{ opacity: row.is_active ? 1 : 0.55 }}
              >
                <TableCell>
                  {row.last_name}, {row.first_name}
                  {!isPatients && row.is_reference && (
                    <Chip
                      size="small"
                      label="Referente"
                      sx={{ ml: 1 }}
                      variant="outlined"
                    />
                  )}
                </TableCell>
                <TableCell>{row.dni}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.phone_number || '—'}</TableCell>
                <TableCell>
                  {isPatients
                    ? row.health_plan_name || 'Particular'
                    : row.license_number || '—'}
                </TableCell>
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
                  <Tooltip title={row.is_active ? 'Dar de baja' : 'Reactivar'}>
                    <IconButton
                      size="small"
                      color={row.is_active ? 'error' : 'success'}
                      onClick={() => setToggleTarget(row)}
                    >
                      {row.is_active ? (
                        <BlockIcon fontSize="small" />
                      ) : (
                        <CheckCircleIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {visibleRows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="#5b7387" sx={{ py: 2 }}>
                    No hay {isPatients ? 'pacientes' : 'enfermeros'} para
                    mostrar.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Alta / edición */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editing
            ? `Editar ${isPatients ? 'paciente' : 'enfermero'}`
            : `Nuevo ${isPatients ? 'paciente' : 'enfermero'}`}
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
              label="Email"
              type="email"
              required
              sx={{ flex: '1 1 45%' }}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              sx={{ flex: '1 1 45%' }}
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

            {isPatients ? (
              <>
                <TextField
                  size="small"
                  label="Obra social"
                  sx={{ flex: '1 1 45%' }}
                  value={form.health_plan_name}
                  onChange={(e) =>
                    setForm({ ...form, health_plan_name: e.target.value })
                  }
                  helperText="Dejalo vacío si es particular"
                />
                <TextField
                  size="small"
                  label="Nº de afiliado"
                  sx={{ flex: '1 1 45%' }}
                  value={form.member_number}
                  onChange={(e) =>
                    setForm({ ...form, member_number: e.target.value })
                  }
                />
              </>
            ) : (
              <>
                <TextField
                  size="small"
                  label="Matrícula"
                  required
                  sx={{ flex: '1 1 45%' }}
                  value={form.license_number}
                  onChange={(e) =>
                    setForm({ ...form, license_number: e.target.value })
                  }
                />
                <FormControlLabel
                  sx={{ flex: '1 1 45%' }}
                  control={
                    <Checkbox
                      checked={Boolean(form.is_reference)}
                      onChange={(e) =>
                        setForm({ ...form, is_reference: e.target.checked })
                      }
                    />
                  }
                  label="Enfermero de referencia"
                />
              </>
            )}
          </Box>

          {!editing && (
            <Alert severity="info">
              El usuario y la contraseña iniciales van a ser el DNI. Se cambian
              después desde "Mi perfil".
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

      {/* Baja / reactivación */}
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
            {toggleTarget?.is_active ? (
              <>
                {toggleTarget?.first_name} {toggleTarget?.last_name} no va a
                poder iniciar sesión. Los registros que ya tiene cargados se
                conservan, y podés reactivar la cuenta cuando quieras.
              </>
            ) : (
              <>
                {toggleTarget?.first_name} {toggleTarget?.last_name} va a poder
                volver a iniciar sesión con sus datos de siempre.
              </>
            )}
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
