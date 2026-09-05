import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

// Operatoria de la salita (turnos, noticias): la comparten el Administrativo
// y los dos roles de administracion del sistema.
const ALLOWED = ['Administrative', 'Administrator', 'Superadministrador'];

export default function AdministrativeRoute() {
  const { rol } = useAuth();
  if (!ALLOWED.includes(rol)) {
    return <Navigate to="/inicio" replace />;
  }
  return <Outlet />;
}
