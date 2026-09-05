import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
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
import RefreshIcon from '@mui/icons-material/Refresh';
import { getBitacora } from '../../api/bitacora';

// Nombres de tabla de la base -> etiqueta legible
const TABLAS = {
  users: 'Usuarios',
  patients: 'Pacientes',
  nurses: 'Enfermeros',
  doctors: 'Médicos',
  medical_appointment: 'Turnos',
  patient_follow_up: 'Seguimientos',
  signs_and_symptoms: 'Signos y síntomas',
  medical_indication: 'Indicaciones médicas',
  medical_product: 'Productos',
  stock_movement: 'Movimientos de stock',
  traceability: 'Trazabilidad',
  guard_pass: 'Pase de guardia',
  news_and_prevention: 'Noticias',
  specialties: 'Especialidades',
  health_plans: 'Obras sociales',
  bitacora: 'Bitácora',
};

const nombreTabla = (t) => TABLAS[t] || t;

// El detalle lo escribe cada ruta del backend con el nombre crudo de la
// tabla ("Registro creado en la tabla patients"). Se traduce aca para que
// la pantalla quede toda en castellano sin tener que tocar cada endpoint.
const traducirDetalle = (detalle) => {
  if (!detalle) return '—';
  let texto = detalle;
  // De mayor a menor largo: evita que "patients" pise "patient_follow_up"
  Object.keys(TABLAS)
    .sort((a, b) => b.length - a.length)
    .forEach((tabla) => {
      texto = texto.replace(new RegExp(`\\b${tabla}\\b`, 'g'), TABLAS[tabla]);
    });
  return texto
    .replace(/\ben la tabla\b/gi, 'en')
    .replace(/\bDoctor\b/g, 'Médico');
};

// Etiquetas de las acciones que registra el backend
const ACCIONES = {
  CREAR: 'Creación',
  ACTUALIZAR: 'Modificación',
  ELIMINAR_LOGICO: 'Baja',
  ELIMINAR: 'Eliminación',
  ACTIVAR: 'Reactivación',
  LOGIN: 'Inicio de sesión',
};

const nombreAccion = (a) => ACCIONES[a] || a;

// Colores por tipo de accion, para que se distingan de un vistazo
const actionColor = (action) => {
  const a = (action || '').toUpperCase();
  if (
    a.includes('CREATE') ||
    a.includes('CREAR') ||
    a.includes('INSERT') ||
    a.includes('ALTA')
  )
    return 'success';
  if (
    a.includes('DELETE') ||
    a.includes('ELIMINAR') ||
    a.includes('BAJA') ||
    a.includes('CANCEL')
  )
    return 'error';
  if (
    a.includes('UPDATE') ||
    a.includes('ACTUALIZAR') ||
    a.includes('EDIT') ||
    a.includes('MODIF')
  )
    return 'warning';
  if (a.includes('LOGIN') || a.includes('SESION')) return 'info';
  return 'default';
};

// "2026-09-05T13:32:17" -> "05/09/2026 13:32"
const formatFechaHora = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const readError = (err, fallback) =>
  err.response?.data?.msg || err.response?.data?.error || fallback;

export default function BitacoraPage() {
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [table, setTable] = useState('');
  const [action, setAction] = useState('');

  // Se trae todo una vez y se filtra en memoria. Asi las opciones de los
  // desplegables salen del total registrado y no se achican al filtrar.
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getBitacora();
      setAllRows(res.data);
    } catch (err) {
      setError(readError(err, 'No se pudo cargar la bitácora.'));
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = allRows.filter(
    (r) =>
      (!table || r.table_name === table) && (!action || r.action === action),
  );

  const tablas = [
    ...new Set(allRows.map((r) => r.table_name).filter(Boolean)),
  ].sort((a, b) => nombreTabla(a).localeCompare(nombreTabla(b)));
  const acciones = [
    ...new Set(allRows.map((r) => r.action).filter(Boolean)),
  ].sort();

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} color="#0E4C82">
          Bitácora
        </Typography>
        <Typography variant="body2" color="#5b7387">
          Registro de acciones realizadas en el sistema
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <TextField
            select
            size="small"
            label="Tabla"
            value={table}
            onChange={(e) => setTable(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {tablas.map((t) => (
              <MenuItem key={t} value={t}>
                {nombreTabla(t)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Acción"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {acciones.map((a) => (
              <MenuItem key={a} value={a}>
                {nombreAccion(a)}
              </MenuItem>
            ))}
          </TextField>
          <Button
            size="small"
            onClick={() => {
              setTable('');
              setAction('');
            }}
          >
            Limpiar
          </Button>
          <Button size="small" startIcon={<RefreshIcon />} onClick={load}>
            Actualizar
          </Button>
          {loading && <CircularProgress size={20} />}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="#5b7387">
            {rows.length} de {allRows.length} registro(s)
          </Typography>
        </Box>
      </Card>

      <Card sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <b>Fecha y hora</b>
              </TableCell>
              <TableCell>
                <b>Usuario</b>
              </TableCell>
              <TableCell>
                <b>Acción</b>
              </TableCell>
              <TableCell>
                <b>Tabla</b>
              </TableCell>
              <TableCell>
                <b>Registro</b>
              </TableCell>
              <TableCell>
                <b>Detalle</b>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id_bitacora}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {formatFechaHora(r.timestamp)}
                </TableCell>
                <TableCell>{r.username}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={nombreAccion(r.action)}
                    color={actionColor(r.action)}
                  />
                </TableCell>
                <TableCell>{nombreTabla(r.table_name)}</TableCell>
                <TableCell>{r.record_id ?? '—'}</TableCell>
                <TableCell sx={{ maxWidth: 380 }}>
                  <Tooltip title={traducirDetalle(r.details)}>
                    <Typography
                      variant="body2"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {traducirDetalle(r.details)}
                    </Typography>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="#5b7387" sx={{ py: 2 }}>
                    No hay registros para los filtros seleccionados.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
}
