import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function PatientRoute() {
  const { rol } = useAuth();

  if (rol !== 'Patient') {
    return <Navigate to="/inicio" replace />;
  }

  return <Outlet />;
}
