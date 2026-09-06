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
  createPatientPrivate,
  updatePatient,
  togglePatientStatus,
} from '../../api/patients';
import {
  getNurses,
  createNurse,
  updateNurse,
  toggleNurseStatus,
} from '../../api/nurses';
import {
  getDoctors,
  createDoctor,
  updateDoctor,
  toggleDoctorStatus,
} from '../../api/doctors';
import {
  getAdministratives,
  createAdministrative,
  updateAdministrative,
  toggleAdministrativeStatus,
} from '../../api/administratives';
import {
  getAdministrators,
  createAdministrator,
  updateAdministrator,
  toggleAdministratorStatus,
} from '../../api/admins';
import { getSpecialties } from '../../api/appointments';
import { useAuth } from '../../context/useAuth';

const GENDERS = ['Femenino', 'Masculino', 'Otro'];

const readError = (err, fallback) =>
  err.response?.data?.msg || err.response?.data?.error || fallback;

// Cada pestaña define su rol: que API usa, que columna extra muestra y que
// campos propios pide el formulario. Asi la pantalla es una sola y no cinco.
const TIPOS = {
  patients: {
    label: 'Pacientes',
    singular: 'paciente',
    list: getPatients,
    create: createPatientPrivate,
    update: updatePatient,
    toggle: togglePatientStatus,
    extraLabel: 'Obra social',
    extraValue: (r) => r.health_plan_name || 'Particular',
    campos: ['health_plan_name', 'member_number'],
  },
  nurses: {
    label: 'Enfermeros',
    singular: 'enfermero',
    list: getNurses,
    create: createNurse,
    update: updateNurse,
    toggle: toggleNurseStatus,
    extraLabel: 'Matrícula',
    extraValue: (r) => r.license_number || '—',
    campos: ['license_number', 'is_reference'],
    requeridos: ['license_number'],
  },
  doctors: {
    label: 'Médicos',
    singular: 'médico',
    list: getDoctors,
    create: createDoctor,
    update: updateDoctor,
    toggle: toggleDoctorStatus,
    extraLabel: 'Matrícula',
    extraValue: (r) => r.medical_license || '—',
    campos: ['medical_license', 'id_especialidad'],
    requeridos: ['medical_license'],
  },
  administratives: {
    label: 'Administrativos',
    singular: 'administrativo',
    list: getAdministratives,
    create: createAdministrative,
    update: updateAdministrative,
    toggle: toggleAdministrativeStatus,
    extraLabel: 'Usuario',
    extraValue: (r) => r.username || '—',
    campos: [],
  },
  administrators: {
    label: 'Administradores',
    singular: 'administrador',
    list: getAdministrators,
    create: createAdministrator,
    update: updateAdministrator,
    toggle: toggleAdministratorStatus,
    extraLabel: 'Usuario',
    extraValue: (r) => r.username || '—',
    campos: [],
    soloSuperadmin: true,
  },
};

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
  health_plan_name: '',
  member_number: '',
  license_number: '',
  is_reference: false,
  medical_license: '',
  id_especialidad: '',
};

export default function AdminUsuariosPage() {
  const { rol, userId } = useAuth();
  const esSuperadmin = rol === 'Superadministrador';

  const [tab, setTab] = useState('patients');
  const [rows, setRows] = useState([]);
  const [specialties, setSpecialties] = useState([]);
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

  const tipo = TIPOS[tab];

  // La pestaña de administradores solo existe para el superadmin
  const pestañas = useMemo(
    () =>
      Object.entries(TIPOS).filter(
        ([, t]) => !t.soloSuperadmin || esSuperadmin,
      ),
    [esSuperadmin],
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await tipo.list();
      setRows(res.data);
    } catch (err) {
      setLoadError(readError(err, 'No se pudo cargar el listado.'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tipo]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // Las especialidades solo hacen falta para el alta de medicos
  useEffect(() => {
    if (tab !== 'doctors' || specialties.length) return;
    getSpecialties()
      .then((res) => setSpecialties(res.data))
      .catch(() => setSpecialties([]));
  }, [tab, specialties.length]);

  // Filtrado en memoria: los listados de una salita son chicos y asi el
  // buscador responde sin ir al servidor en cada tecla.
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.first_name,
        r.last_name,
        r.dni,
        r.email,
        r.username,
        r.license_number,
        r.medical_license,
      ]
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
    ].concat(tipo.requeridos || []);
    if (obligatorios.some((c) => !form[c])) {
      setFormError(
        'Completá nombre, apellido, DNI, email y fecha de nacimiento' +
          (tipo.requeridos?.length ? ', más la matrícula.' : '.'),
      );
      return;
    }

    setSaving(true);
    try {
      // Se manda solo lo comun mas los campos propios de este rol
      const comunes = [
        'first_name',
        'last_name',
        'dni',
        'email',
        'date_of_birth',
        'phone_number',
        'address',
        'gender',
        'emergency_contact',
      ];
      const payload = {};
      [...comunes, ...tipo.campos].forEach((c) => {
        if (form[c] !== '' && form[c] !== undefined) payload[c] = form[c];
      });

      if (tab === 'patients') {
        payload.health_plan_status = Boolean(form.health_plan_name);
      }
      if (tab === 'nurses') {
        // El alta de enfermero lee 'phone' y la edicion 'phone_number'
        payload.phone = form.phone_number;
        payload.is_reference = Boolean(form.is_reference);
      }

      if (editing) {
        await tipo.update(editing.id_user, payload);
        setActionOk('Datos actualizados.');
      } else {
        // Usuario y contraseña iniciales = DNI. El backend no lo completa
        // solo: si no se manda, username queda null y la columna no lo acepta.
        payload.username = form.dni;
        payload.password = form.dni;
        await tipo.create(payload);
        setActionOk(
          `${tipo.label.slice(0, -1)} creado. Usuario y contraseña iniciales: ${form.dni}`,
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
      await tipo.toggle(toggleTarget.id_user);
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

  const nombreEspecialidad = (id) =>
    specialties.find((s) => s.id_speciality === id)?.name || '—';

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
            Altas, ediciones y bajas de las cuentas del sistema
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
        >
          Nuevo {tipo.singular}
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
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2 }}
        >
          {pestañas.map(([key, t]) => (
            <Tab key={key} value={key} label={t.label} />
          ))}
        </Tabs>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            size="small"
            label="Buscar por nombre, DNI, email o matrícula"
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
                <b>DNI</b>
              </TableCell>
              <TableCell>
                <b>Email</b>
              </TableCell>
              <TableCell>
                <b>Teléfono</b>
              </TableCell>
              <TableCell>
                <b>{tipo.extraLabel}</b>
              </TableCell>
              {tab === 'doctors' && (
                <TableCell>
                  <b>Especialidad</b>
                </TableCell>
              )}
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
                  sx={{ opacity: row.is_active === false ? 0.55 : 1 }}
                >
                  <TableCell>
                    {row.last_name}, {row.first_name}
                    {tab === 'nurses' && row.is_reference && (
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
                  <TableCell>{tipo.extraValue(row)}</TableCell>
                  {tab === 'doctors' && (
                    <TableCell>
                      {nombreEspecialidad(row.id_especialidad)}
                    </TableCell>
                  )}
                  <TableCell>
                    <Chip
                      size="small"
                      label={
                        row.is_active === false ? 'Dado de baja' : 'Activo'
                      }
                      color={row.is_active === false ? 'default' : 'success'}
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
                          : row.is_active === false
                            ? 'Reactivar'
                            : 'Dar de baja'
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          color={row.is_active === false ? 'success' : 'error'}
                          onClick={() => setToggleTarget(row)}
                          disabled={esUnoMismo}
                        >
                          {row.is_active === false ? (
                            <CheckCircleIcon fontSize="small" />
                          ) : (
                            <BlockIcon fontSize="small" />
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
                <TableCell colSpan={8}>
                  <Typography color="#5b7387" sx={{ py: 2 }}>
                    No hay {tipo.label.toLowerCase()} para mostrar.
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
          {editing ? `Editar ${tipo.singular}` : `Nuevo ${tipo.singular}`}
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

            {tab === 'patients' && (
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
            )}

            {tab === 'nurses' && (
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

            {tab === 'doctors' && (
              <>
                <TextField
                  size="small"
                  label="Matrícula"
                  required
                  sx={{ flex: '1 1 45%' }}
                  value={form.medical_license}
                  onChange={(e) =>
                    setForm({ ...form, medical_license: e.target.value })
                  }
                />
                <TextField
                  select
                  size="small"
                  label="Especialidad"
                  sx={{ flex: '1 1 45%' }}
                  value={form.id_especialidad}
                  onChange={(e) =>
                    setForm({ ...form, id_especialidad: e.target.value })
                  }
                >
                  {specialties.map((s) => (
                    <MenuItem key={s.id_speciality} value={s.id_speciality}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
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
          {toggleTarget?.is_active === false
            ? 'Reactivar cuenta'
            : 'Dar de baja'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {toggleTarget?.is_active === false ? (
              <>
                {toggleTarget?.first_name} {toggleTarget?.last_name} va a poder
                volver a iniciar sesión con sus datos de siempre.
              </>
            ) : (
              <>
                {toggleTarget?.first_name} {toggleTarget?.last_name} no va a
                poder iniciar sesión. Los registros que ya tiene cargados se
                conservan, y podés reactivar la cuenta cuando quieras.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setToggleTarget(null)}>Volver</Button>
          <Button
            variant="contained"
            color={toggleTarget?.is_active === false ? 'success' : 'error'}
            onClick={handleToggle}
          >
            {toggleTarget?.is_active === false ? 'Reactivar' : 'Dar de baja'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
