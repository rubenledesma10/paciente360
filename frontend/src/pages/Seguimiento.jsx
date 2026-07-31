import { useState, useEffect } from 'react';
import {
  getAllFollowUps,
  getPendingFollowUps,
  toggleFinishFollowUp,
  createFollowUp,
} from '../services/followUpService';
import { getAllPatients } from '../services/patientService';
import './Seguimiento.css';

function Seguimiento() {
  // Estado: todos los seguimientos y los pendientes
  const [followUps, setFollowUps] = useState([]);
  const [pending, setPending] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('Activos');

  // Estados para el formulario "Nuevo"
  const [showForm, setShowForm] = useState(false);
  const [patients, setPatients] = useState([]);
  const [formPatient, setFormPatient] = useState('');
  const [formObservations, setFormObservations] = useState('');
  const [formNextCheckUp, setFormNextCheckUp] = useState('');

  // Función que trae los seguimientos, los pendientes y los pacientes del backend
  function loadData() {
    getAllFollowUps()
      .then((data) => setFollowUps(data))
      .catch((error) => console.error(error));

    getPendingFollowUps()
      .then((data) => setPending(data))
      .catch((error) => console.error(error));

    getAllPatients()
      .then((data) => setPatients(data))
      .catch((error) => console.error(error));
  }

  // Al cargar la página, traemos los datos
  useEffect(() => {
    loadData();
  }, []);

  // Marca un seguimiento como finalizado y refresca la lista
  function handleFinish(followUpId) {
    toggleFinishFollowUp(followUpId)
      .then(() => loadData())
      .catch((error) => console.error(error));
  }

  // Crea un nuevo seguimiento con los datos del formulario
  function handleCreate() {
    if (!formPatient) {
      alert('Elegí un paciente');
      return;
    }

    const newFollowUp = {
      id_patient: parseInt(formPatient),
      id_nurse: 6, // TODO: reemplazar por el id de la enfermera logueada cuando exista el login
      observations: formObservations,
      next_check_up: formNextCheckUp || null,
    };

    createFollowUp(newFollowUp)
      .then(() => {
        loadData();
        setShowForm(false);
        setFormPatient('');
        setFormObservations('');
        setFormNextCheckUp('');
      })
      .catch((error) => console.error(error));
  }

  // Formatea la fecha ISO a algo legible
  function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  // Saca las iniciales del nombre (ej: "Ana Torres" -> "AT")
  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  // Filtra los seguimientos según el filtro seleccionado
  const filteredFollowUps = followUps.filter((item) => {
    if (selectedFilter === 'Todos') return true;
    if (selectedFilter === 'Activos') {
      return item.status === 'Pendiente' || item.status === 'Programado';
    }
    return item.status === selectedFilter;
  });

  const filters = ['Activos', 'Pendiente', 'Programado', 'Finalizado', 'Todos'];

  return (
    <div className="follow-container">
      <div className="follow-header">
        <div>
          <h1 className="follow-title">Seguimiento del paciente</h1>
          <p className="follow-subtitle">Evolución y recordatorios</p>
        </div>
        <button
          className="follow-new-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancelar' : '+ Nuevo'}
        </button>
      </div>

      {/* Formulario de nuevo seguimiento */}
      {showForm && (
        <div className="follow-form">
          <h3 className="follow-form-title">Registrar seguimiento</h3>

          <label className="follow-label">Paciente</label>
          <select
            className="follow-input"
            value={formPatient}
            onChange={(e) => setFormPatient(e.target.value)}
          >
            <option value="">Seleccioná un paciente</option>
            {patients.map((p) => (
              <option key={p.id_user} value={p.id_user}>
                {p.first_name} {p.last_name}
              </option>
            ))}
          </select>

          <label className="follow-label">Observaciones</label>
          <textarea
            className="follow-input"
            rows="3"
            value={formObservations}
            onChange={(e) => setFormObservations(e.target.value)}
            placeholder="Escribí las observaciones del seguimiento..."
          />

          <label className="follow-label">Próximo control</label>
          <input
            type="date"
            className="follow-input"
            value={formNextCheckUp}
            onChange={(e) => setFormNextCheckUp(e.target.value)}
          />

          <button className="follow-submit-btn" onClick={handleCreate}>
            Guardar seguimiento
          </button>
        </div>
      )}

      {/* Alerta de pendientes */}
      {pending.length > 0 && (
        <div className="follow-alert">
          🔔 Tenés {pending.length} paciente(s) con seguimiento pendiente
        </div>
      )}

      {/* Filtros por estado */}
      <div className="follow-filters">
        {filters.map((f) => (
          <button
            key={f}
            className={`follow-filter-btn ${selectedFilter === f ? 'active' : ''}`}
            onClick={() => setSelectedFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Lista de seguimientos */}
      <div className="follow-list">
        {filteredFollowUps.map((item) => (
          <div className="follow-card" key={item.id_follow_up}>
            <div className="follow-card-head">
              <div className="follow-avatar">
                {getInitials(item.patient_name)}
              </div>
              <div className="follow-card-info">
                <h3 className="follow-patient">{item.patient_name}</h3>
                <p className="follow-datetime">{formatDate(item.date_time)}</p>
              </div>
              <span className={`follow-status ${item.status.toLowerCase()}`}>
                {item.status}
              </span>
            </div>
            <p className="follow-obs">{item.observations}</p>
            <p className="follow-next">
              📅 Próximo control: {formatDate(item.next_check_up)}
            </p>
            {item.status !== 'Finalizado' && (
              <button
                className="follow-finish-btn"
                onClick={() => handleFinish(item.id_follow_up)}
              >
                Marcar finalizado
              </button>
            )}
          </div>
        ))}
        {filteredFollowUps.length === 0 && (
          <p className="follow-empty">No hay seguimientos en esta categoría.</p>
        )}
      </div>
    </div>
  );
}

export default Seguimiento;
