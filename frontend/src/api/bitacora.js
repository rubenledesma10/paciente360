import client from './client';

// Registro de acciones del sistema. Solo Superadministrador.
export function getBitacora(params) {
  // params opcionales: { table: 'medical_appointment', action: 'CREATE' }
  const tieneFiltros = params && (params.table || params.action);
  return tieneFiltros
    ? client.get('/bitacora/search', { params })
    : client.get('/bitacora/');
}
