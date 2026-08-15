import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function AdministrativeRoute() {
  const { rol } = useAuth();
  if (rol !== 'Administrative') {
    return <Navigate to="/inicio" replace />;
  }
  return <Outlet />;
}
