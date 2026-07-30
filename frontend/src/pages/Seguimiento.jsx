import { useState, useEffect } from 'react';
import {
  getAllFollowUps,
  getPendingFollowUps,
} from '../services/followUpService';
import './Seguimiento.css';

function Seguimiento() {
  // Estado: todos los seguimientos y los pendientes
  const [followUps, setFollowUps] = useState([]);
  const [pending, setPending] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('Activos');

  // Al cargar la página, traemos ambos del backend, todos y los pendientes.
  useEffect(() => {
    getAllFollowUps()
      .then((data) => setFollowUps(data))
      .catch((error) => console.error(error));

    getPendingFollowUps()
      .then((data) => setPending(data))
      .catch((error) => console.error(error));
  }, []);

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
        <h1 className="follow-title">Seguimiento del paciente</h1>
        <p className="follow-subtitle">Evolución y recordatorios</p>
      </div>

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
