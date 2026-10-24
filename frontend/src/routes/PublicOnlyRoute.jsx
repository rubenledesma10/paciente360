import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { roleHome } from '../utils/roleHome';

export default function PublicOnlyRoute() {
  const { isAuthenticated, rol } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={roleHome(rol)} replace />;
  }
  return <Outlet />;
}

// Esto es un comentario en JSX.
