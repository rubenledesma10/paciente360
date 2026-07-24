import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import PublicOnlyRoute from './PublicOnlyRoute'
import NurseRoute from './NurseRoute'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import HomePlaceholderPage from '../pages/HomePlaceholderPage'
import AuthShell from '../components/layout/AuthShell'
import SignosPage from '../pages/nurse/SignosPage'
import SeguimientoPage from '../pages/nurse/SeguimientoPage'
import StockPage from '../pages/nurse/StockPage'
import GuardiaPage from '../pages/nurse/GuardiaPage'
import { useAuth } from '../context/useAuth'
import { roleHome } from '../utils/roleHome'

export default function AppRoutes() {
  const { rol } = useAuth()

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<AuthShell />}>
          <Route index element={<Navigate to={roleHome(rol)} replace />} />
          <Route element={<NurseRoute />}>
            <Route path="signos" element={<SignosPage />} />
            <Route path="seguimiento" element={<SeguimientoPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="guardia" element={<GuardiaPage />} />
          </Route>
          <Route path="inicio" element={<HomePlaceholderPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
