import { useCallback, useEffect, useMemo, useState } from 'react';
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
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {
  getAppointments,
  getAllowedTransitions,
  updateAppointmentStatus,
  updateAppointmentDiagnosis,
} from '../../api/appointments';
import { useAuth } from '../../context/useAuth';
import { getPatientSummary } from '../../api/ai';
import { getSignsAndSymptomsByPatient } from '../../api/signsAndSymptoms';
import { DISEASE_TYPES, DISEASE_TYPE_OTHER } from '../../utils/diseaseTypes';

// El resumen viene con titulos de seccion en su propia linea y viñetas.
// Se renderiza sin libreria de markdown.
const TITULOS_RESUMEN = [
  'Paciente',
  'Antecedentes en el sistema',
  'Ultimos signos vitales',
  'Últimos signos vitales',
  'Seguimiento de enfermeria',
  'Seguimiento de enfermería',
  'Indicaciones registradas',
  'Puntos a tener en cuenta',
];

function ResumenFormateado({ text }) {
  return (
    <Box>
      {text.split('\n').map((linea, i) => {
        const limpia = linea
          .trim()
          .replace(/^\*\*|\*\*$/g, '')
          .replace(/^#+\s*/, '');
        if (!limpia) return <Box key={i} sx={{ height: 6 }} />;
        const esTitulo = TITULOS_RESUMEN.some(
          (t) => limpia.toLowerCase().replace(':', '') === t.toLowerCase(),
        );
        const esItem = /^[-*•]\s+/.test(limpia);
        if (esTitulo) {
          return (
            <Typography
              key={i}
              variant="subtitle2"
              fontWeight={800}
              color="#0E4C82"
              sx={{ mt: 1.5, mb: 0.5 }}
            >
              {limpia.replace(':', '')}
            </Typography>
          );
        }
        return (
          <Typography
            key={i}
            variant="body2"
            color="#334155"
            sx={{ lineHeight: 1.7, pl: esItem ? 2 : 0 }}
          >
            {esItem ? `• ${limpia.replace(/^[-*•]\s+/, '')}` : limpia}
          </Typography>
        );
      })}
    </Box>
  );
}

const today = new Date().toISOString().split('T')[0];

const statusColor = (status) => {
  if (status === 'Reservado') return 'info';
  if (status === 'En espera') return 'warning';
  if (status === 'Atendido') return 'success';
  if (status === 'Cancelado') return 'error';
  return 'default';
};

const parseDate = (value) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
};

const formatDate = (value) => {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('es-AR') : '—';
};

const readError = (err, fallback) =>
  err.response?.data?.msg || err.response?.data?.error || fallback;

export default function AgendaPage() {
  const { userId } = useAuth();
  const [rows, setRows] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionOk, setActionOk] = useState('');

  // Resumen clínico previo a la consulta
  const [summaryTarget, setSummaryTarget] = useState(null);
  const [summary, setSummary] = useState('');
  const [summaryMeta, setSummaryMeta] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  // Diálogo de cierre de consulta / edición de diagnóstico
  const [diagnosisTarget, setDiagnosisTarget] = useState(null);
  // 'close' cierra la consulta (guarda y pasa a Atendido); 'edit' solo corrige
  const [diagnosisMode, setDiagnosisMode] = useState('close');
  const [diagnosisForm, setDiagnosisForm] = useState({
    disease_type: '',
    diagnosis: '',
    disease_details: '',
  });
  const [diagnosisError, setDiagnosisError] = useState('');
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);

  const [statusTarget, setStatusTarget] = useState(null);
  const [allowedStatuses, setAllowedStatuses] = useState([]);
  const [newStatus, setNewStatus] = useState('');
  const [statusError, setStatusError] = useState('');

  // Último registro de signos y síntomas cargado por enfermería, indexado
  // por id_patient para no repetir el fetch si un paciente tiene más de un
  // turno el mismo día.
  const [lastSigns, setLastSigns] = useState({});
  const [lastSignsLoading, setLastSignsLoading] = useState({});

  const loadAgenda = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setLoadError('');
    try {
      const params = { id_doctor: userId };
      if (selectedDate) params.date = selectedDate;
      const res = await getAppointments(params);
      setRows(res.data);
    } catch (err) {
      setLoadError(readError(err, 'No se pudo cargar la agenda.'));
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDate]);

  useEffect(() => {
    loadAgenda();
  }, [loadAgenda]);

  useEffect(() => {
    const handler = () => loadAgenda();
    window.addEventListener('appointments-changed', handler);
    return () => window.removeEventListener('appointments-changed', handler);
  }, [loadAgenda]);

  const notifyChange = () => {
    window.dispatchEvent(new Event('appointments-changed'));
  };

  useEffect(() => {
    // queueMicrotask: el fetch por paciente es un efecto secundario hacia un
    // sistema externo (la API), no una sincronización de estado derivado, así
    // que se dispara fuera del cuerpo síncrono del efecto.
    queueMicrotask(() => {
      const uniquePatientIds = [
        ...new Set(rows.map((r) => r.id_patient)),
      ].filter((id) => id != null && !(id in lastSigns) && !lastSignsLoading[id]);
      if (uniquePatientIds.length === 0) return;

      setLastSignsLoading((prev) => {
        const next = { ...prev };
        uniquePatientIds.forEach((id) => {
          next[id] = true;
        });
        return next;
      });

      uniquePatientIds.forEach(async (id) => {
        try {
          const res = await getSignsAndSymptomsByPatient(id);
          const latest =
            Array.isArray(res.data) && res.data.length > 0
              ? res.data[0]
              : null;
          setLastSigns((prev) => ({ ...prev, [id]: latest }));
        } catch {
          setLastSigns((prev) => ({ ...prev, [id]: null }));
        } finally {
          setLastSignsLoading((prev) => ({ ...prev, [id]: false }));
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // Los cancelados no forman parte de la jornada de trabajo: van al final
  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (a.status === 'Cancelado' && b.status !== 'Cancelado') return 1;
        if (b.status === 'Cancelado' && a.status !== 'Cancelado') return -1;
        return (a.hour || '').localeCompare(b.hour || '');
      }),
    [rows],
  );

  const attendedCount = rows.filter((ap) => ap.status === 'Atendido').length;
  const pendingCount = rows.filter(
    (ap) => ap.status === 'Reservado' || ap.status === 'En espera',
  ).length;

  const openSummary = async (appointment) => {
    setSummaryTarget(appointment);
    setSummary('');
    setSummaryMeta(null);
    setSummaryError('');
    setLoadingSummary(true);
    try {
      const res = await getPatientSummary(appointment.id_patient);
      setSummary(res.data.summary);
      setSummaryMeta(res.data.registros);
    } catch (err) {
      setSummaryError(readError(err, 'No se pudo generar el resumen.'));
    } finally {
      setLoadingSummary(false);
    }
  };

  const openDiagnosisDialog = (appointment, mode) => {
    setDiagnosisTarget(appointment);
    setDiagnosisMode(mode);
    setDiagnosisForm({
      disease_type: appointment.disease_type || '',
      diagnosis: appointment.diagnosis || '',
      disease_details: appointment.disease_details || '',
    });
    setDiagnosisError('');
  };

  const handleSaveDiagnosis = async () => {
    if (!diagnosisTarget) return;
    setDiagnosisError('');

    if (!diagnosisForm.disease_type || !diagnosisForm.diagnosis.trim()) {
      setDiagnosisError('Completá el tipo de enfermedad y el diagnóstico.');
      return;
    }
    if (
      diagnosisForm.disease_type === DISEASE_TYPE_OTHER &&
      !diagnosisForm.disease_details.trim()
    ) {
      setDiagnosisError('Si elegís "Otra", aclará cuál en los detalles.');
      return;
    }

    const id = diagnosisTarget.id_medical_appointment;
    setSavingDiagnosis(true);
    try {
      // Primero el diagnóstico. Si esto falla, el turno NO se marca como
      // atendido: quedaría una consulta cerrada sin registro clínico.
      await updateAppointmentDiagnosis(id, {
        disease_type: diagnosisForm.disease_type,
        diagnosis: diagnosisForm.diagnosis.trim(),
        disease_details: diagnosisForm.disease_details.trim() || null,
      });

      if (diagnosisMode === 'close') {
        await updateAppointmentStatus(id, 'Atendido');
        setActionOk('Consulta cerrada y diagnóstico registrado.');
      } else {
        setActionOk('Diagnóstico actualizado.');
      }

      setDiagnosisTarget(null);
      await loadAgenda();
      notifyChange();
    } catch (err) {
      setDiagnosisError(readError(err, 'No se pudo guardar el diagnóstico.'));
    } finally {
      setSavingDiagnosis(false);
    }
  };

  const openStatusDialog = async (appointment) => {
    setStatusTarget(appointment);
    setNewStatus('');
    setStatusError('');
    setAllowedStatuses([]);
    try {
      const res = await getAllowedTransitions(
        appointment.id_medical_appointment,
      );
      setAllowedStatuses(res.data.allowed || []);
    } catch (err) {
      setStatusError(
        readError(err, 'No se pudieron obtener los estados posibles.'),
      );
    }
  };

  const applyStatus = async (appointmentId, status) => {
    setStatusError('');
    try {
      await updateAppointmentStatus(appointmentId, status);
      setActionOk(`Turno marcado como "${status}".`);
      setStatusTarget(null);
      await loadAgenda();
      notifyChange();
    } catch (err) {
      setStatusError(readError(err, 'No se pudo cambiar el estado.'));
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} color="#0E4C82">
          Mis turnos
        </Typography>
        <Typography variant="body2" color="#5b7387">
          Agenda de pacientes del día
        </Typography>
      </Box>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
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

      <Card sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <TextField
            type="date"
            size="small"
            label="Fecha"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 170 }}
          />
          <Button size="small" onClick={() => setSelectedDate(today)}>
            Hoy
          </Button>
          <Button size="small" startIcon={<RefreshIcon />} onClick={loadAgenda}>
            Actualizar
          </Button>
          {loading && <CircularProgress size={20} />}

          <Box sx={{ flexGrow: 1 }} />
          <Chip
            size="small"
            label={`${pendingCount} por atender`}
            color="warning"
            variant="outlined"
          />
          <Chip
            size="small"
            label={`${attendedCount} atendidos`}
            color="success"
            variant="outlined"
          />
        </Box>
      </Card>

      {sortedRows.length === 0 && !loading && (
        <Typography color="#5b7387">
          No tenés turnos para el {formatDate(selectedDate)}.
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {sortedRows.map((ap) => {
          const isClosed =
            ap.status === 'Atendido' || ap.status === 'Cancelado';
          const patientName = ap.patient_name || '—';

          return (
            <Card
              key={ap.id_medical_appointment}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
                opacity: ap.status === 'Cancelado' ? 0.6 : 1,
                borderLeft: '5px solid',
                borderLeftColor:
                  ap.status === 'Atendido'
                    ? '#2e7d32'
                    : ap.status === 'Cancelado'
                      ? '#d32f2f'
                      : '#29ABE2',
              }}
            >
              <Box sx={{ minWidth: 64 }}>
                <Typography variant="h6" fontWeight={800} color="#0E4C82">
                  {ap.hour}
                </Typography>
                <Typography variant="caption" color="#5b7387">
                  {formatDate(ap.date)}
                </Typography>
              </Box>

              <Avatar sx={{ bgcolor: '#29ABE2', fontWeight: 700 }}>
                {patientName.charAt(0)}
              </Avatar>

              <Box sx={{ flexGrow: 1, minWidth: 180 }}>
                <Typography fontWeight={700} color="#0E4C82">
                  {patientName}
                </Typography>
                <Typography variant="caption" color="#5b7387" component="div">
                  {ap.reason || 'Consulta médica'}
                  {ap.diagnosis && (
                    <>
                      {/* La barra separa el motivo (lo que trajo al paciente)
                          del diagnostico (lo que el medico concluyo) */}
                      <Box component="span" sx={{ mx: 0.75, color: '#c3d0da' }}>
                        |
                      </Box>
                      <Box
                        component="span"
                        sx={{ color: '#1565A8', fontWeight: 700 }}
                      >
                        Diagnóstico: {ap.diagnosis}
                        {ap.disease_type ? ` (${ap.disease_type})` : ''}
                      </Box>
                    </>
                  )}
                </Typography>

                {(() => {
                  const record = lastSigns[ap.id_patient];
                  const isLoadingRecord = lastSignsLoading[ap.id_patient];

                  if (isLoadingRecord) {
                    return (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          mt: 0.5,
                        }}
                      >
                        <CircularProgress size={12} />
                        <Typography variant="caption" color="#5b7387">
                          Cargando signos y síntomas...
                        </Typography>
                      </Box>
                    );
                  }

                  if (!record) {
                    return (
                      <Typography
                        variant="caption"
                        color="#94a3b8"
                        component="div"
                        sx={{ mt: 0.5, fontStyle: 'italic' }}
                      >
                        Sin registros de signos y síntomas.
                      </Typography>
                    );
                  }

                  const isFever =
                    record.temperature != null && record.temperature >= 38;

                  return (
                    <Box
                      sx={{
                        mt: 0.75,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color="#0E4C82"
                        component="div"
                        sx={{ mb: 0.25 }}
                      >
                        Signos y síntomas (último registro)
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 0.75,
                          alignItems: 'center',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: isFever ? '#d32f2f' : '#334155',
                            fontWeight: isFever ? 700 : 400,
                          }}
                        >
                          Temp:{' '}
                          {record.temperature != null
                            ? `${record.temperature}°C`
                            : '—'}
                        </Typography>
                        <Typography variant="caption" color="#334155">
                          Presión: {record.blood_pressure || '—'}
                        </Typography>
                        <Chip
                          size="small"
                          label={record.record_type || '—'}
                          color={
                            record.record_type === 'Urgencia'
                              ? 'error'
                              : 'primary'
                          }
                          sx={{ height: 18, fontSize: '0.7rem' }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        color="#334155"
                        component="div"
                        sx={{ mt: 0.25 }}
                      >
                        Síntomas: {record.symptoms || '—'}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="#334155"
                        component="div"
                      >
                        Signos: {record.signs || '—'}
                      </Typography>
                    </Box>
                  );
                })()}
              </Box>

              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={ap.status}
                  color={statusColor(ap.status)}
                />
                {ap.is_overbooking && (
                  <Chip
                    size="small"
                    label="Sobreturno"
                    color="secondary"
                    variant="outlined"
                  />
                )}
                {ap.confirmed && (
                  <Chip size="small" label="Confirmado" variant="outlined" />
                )}
                {ap.status === 'Atendido' && !ap.diagnosis && (
                  <Chip size="small" label="Sin diagnóstico" color="warning" />
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                {/* Resumen de lo que el sistema sabe del paciente, para
                    llegar a la consulta con contexto */}
                {!isClosed && (
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={() => openSummary(ap)}
                  >
                    Preparar consulta
                  </Button>
                )}
                {/* Cerrar la consulta exige diagnóstico: no se puede dar por
                    atendido un turno sin dejar registro de qué se encontró */}
                {ap.status === 'En espera' && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AssignmentTurnedInIcon />}
                    onClick={() => openDiagnosisDialog(ap, 'close')}
                  >
                    Cerrar consulta
                  </Button>
                )}
                {ap.status === 'Atendido' && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditNoteIcon />}
                    onClick={() => openDiagnosisDialog(ap, 'edit')}
                  >
                    {ap.diagnosis ? 'Ver diagnóstico' : 'Cargar diagnóstico'}
                  </Button>
                )}
                {!isClosed && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SwapHorizIcon />}
                    onClick={() => openStatusDialog(ap)}
                  >
                    Cambiar estado
                  </Button>
                )}
              </Box>
            </Card>
          );
        })}
      </Box>

      {/* Diálogo: resumen clínico */}
      <Dialog
        open={Boolean(summaryTarget)}
        onClose={() => setSummaryTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ color: '#1565A8' }} />
          Preparar consulta
        </DialogTitle>
        <DialogContent>
          {summaryTarget && (
            <Typography variant="body2" color="#5b7387" sx={{ mb: 2 }}>
              {summaryTarget.patient_name} — {formatDate(summaryTarget.date)} a
              las {summaryTarget.hour}
              {summaryTarget.reason ? ` · ${summaryTarget.reason}` : ''}
            </Typography>
          )}

          {loadingSummary && (
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 3 }}
            >
              <CircularProgress size={22} />
              <Typography variant="body2" color="#5b7387">
                Leyendo la historia del paciente...
              </Typography>
            </Box>
          )}

          {summaryError && <Alert severity="warning">{summaryError}</Alert>}

          {summary && (
            <>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <ResumenFormateado text={summary} />
              </Box>

              {summaryMeta && (
                <Typography
                  variant="caption"
                  color="#5b7387"
                  sx={{ display: 'block', mt: 1.5 }}
                >
                  Resumen armado a partir de {summaryMeta.consultas}{' '}
                  consulta(s), {summaryMeta.signos} registro(s) de signos,{' '}
                  {summaryMeta.seguimientos} seguimiento(s) y{' '}
                  {summaryMeta.indicaciones} indicación(es) cargadas en el
                  sistema.
                </Typography>
              )}

              {/* Aclaracion obligatoria: es sintesis de lo registrado, no una
                  evaluacion clinica */}
              <Alert severity="info" sx={{ mt: 1.5 }}>
                Generado automáticamente a partir de los registros del sistema.
                Es un apoyo para la lectura, no reemplaza la revisión de la
                historia clínica ni el criterio profesional.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSummaryTarget(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de diagnóstico */}
      <Dialog
        open={Boolean(diagnosisTarget)}
        onClose={() => setDiagnosisTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {diagnosisMode === 'close'
            ? 'Cerrar consulta'
            : 'Diagnóstico de la consulta'}
        </DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {diagnosisError && <Alert severity="error">{diagnosisError}</Alert>}

          {diagnosisTarget && (
            <Typography variant="body2" color="#5b7387">
              {diagnosisTarget.patient_name} —{' '}
              {formatDate(diagnosisTarget.date)} a las {diagnosisTarget.hour}
              {diagnosisTarget.reason ? ` · ${diagnosisTarget.reason}` : ''}
            </Typography>
          )}

          <TextField
            select
            label="Tipo de enfermedad"
            required
            value={diagnosisForm.disease_type}
            onChange={(e) =>
              setDiagnosisForm({
                ...diagnosisForm,
                disease_type: e.target.value,
              })
            }
            helperText="Se usa para los reportes por período"
          >
            {DISEASE_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Diagnóstico"
            required
            multiline
            minRows={2}
            value={diagnosisForm.diagnosis}
            onChange={(e) =>
              setDiagnosisForm({ ...diagnosisForm, diagnosis: e.target.value })
            }
          />

          <TextField
            label={
              diagnosisForm.disease_type === DISEASE_TYPE_OTHER
                ? 'Especificá cuál'
                : 'Detalles (opcional)'
            }
            required={diagnosisForm.disease_type === DISEASE_TYPE_OTHER}
            multiline
            minRows={2}
            value={diagnosisForm.disease_details}
            onChange={(e) =>
              setDiagnosisForm({
                ...diagnosisForm,
                disease_details: e.target.value,
              })
            }
          />

          {diagnosisMode === 'close' && (
            <Alert severity="info">
              Al guardar, el turno queda marcado como <strong>Atendido</strong>.
              El paciente va a aparecer en la lista de seguimiento del
              enfermero.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDiagnosisTarget(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveDiagnosis}
            disabled={savingDiagnosis}
          >
            {savingDiagnosis
              ? 'Guardando...'
              : diagnosisMode === 'close'
                ? 'Guardar y cerrar consulta'
                : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de cambio de estado */}
      <Dialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Cambiar estado del turno</DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {statusError && <Alert severity="error">{statusError}</Alert>}
          {statusTarget && (
            <Typography variant="body2" color="#5b7387">
              {statusTarget.patient_name} — {statusTarget.hour}
              <br />
              Estado actual: <strong>{statusTarget.status}</strong>
            </Typography>
          )}
          {allowedStatuses.length === 0 ? (
            <Typography variant="body2" color="#5b7387">
              Este turno ya está en un estado final: no admite más cambios.
            </Typography>
          ) : (
            <TextField
              select
              label="Nuevo estado"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {allowedStatuses.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStatusTarget(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!newStatus}
            onClick={() =>
              applyStatus(statusTarget.id_medical_appointment, newStatus)
            }
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
