import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

// Solo Superadministrador: CRUD de administradores y bitacora.
export default function SuperAdminRoute() {
  const { rol } = useAuth();
  if (rol !== 'Superadministrador') {
    return <Navigate to="/inicio" replace />;
  }
  return <Outlet />;
}
