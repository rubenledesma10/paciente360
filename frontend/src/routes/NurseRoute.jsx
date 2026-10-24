import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function NurseRoute() {
  const { rol } = useAuth()
  if (rol !== 'Nurse') {
    return <Navigate to="/inicio" replace />
  }
  return <Outlet />
}
