import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

// Administrador y Superadministrador: gestion completa del sistema.
// El Administrativo (operatoria de la salita) NO entra aca.
const ALLOWED = ['Administrator', 'Superadministrador'];

export default function AdminRoute() {
  const { rol } = useAuth();
  if (!ALLOWED.includes(rol)) {
    return <Navigate to="/inicio" replace />;
  }
  return <Outlet />;
}
