import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function DoctorRoute() {
  const { rol } = useAuth()
  if (rol !== 'Doctor') {
    return <Navigate to="/inicio" replace />
  }
  return <Outlet />
}
