import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicOnlyRoute from './routes/PublicOnlyRoute';
import NurseRoute from './routes/NurseRoute';
import DoctorRoute from './routes/DoctorRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RecuperarCuentaPage from './pages/RecuperarCuentaPage';
import HomePlaceholderPage from './pages/HomePlaceholderPage';
import AuthShell from './components/layout/AuthShell';
import PublicShell from './components/layout/PublicShell';
import SignosPage from './pages/nurse/SignosPage';
import StockPage from './pages/nurse/StockPage';
import GuardiaPage from './pages/nurse/GuardiaPage';
import NewsDetail from './pages/NewsDetail';
import Seguimiento from './pages/Seguimiento';
import IndicacionesPage from './pages/doctor/IndicacionesPage';
import HistoriaClinicaPage from './pages/doctor/HistoriaClinicaPage';
import { useAuth } from './context/useAuth';
import { roleHome } from './utils/roleHome';
import AdministrativeRoute from './routes/AdministrativeRoute';
import AdminNoticiasPage from './pages/admin/AdminNoticiasPage';

function App() {
  const { rol } = useAuth();

  return (
    <Routes>
      {/* Principal pública: login + noticias */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/recuperar-cuenta" element={<RecuperarCuentaPage />} />
      </Route>

      {/* Detalle de noticia: público */}
      <Route element={<PublicShell />}>
        <Route path="/noticias/:id" element={<NewsDetail />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AuthShell />}>
          <Route element={<NurseRoute />}>
            <Route path="signos" element={<SignosPage />} />
            <Route path="seguimiento" element={<Seguimiento />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="guardia" element={<GuardiaPage />} />
          </Route>

          <Route element={<DoctorRoute />}>
            <Route path="indicaciones" element={<IndicacionesPage />} />
            <Route path="historia-clinica" element={<HistoriaClinicaPage />} />
          </Route>

          <Route element={<AdministrativeRoute />}>
            <Route path="admin/noticias" element={<AdminNoticiasPage />} />
          </Route>

          <Route path="inicio" element={<HomePlaceholderPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
