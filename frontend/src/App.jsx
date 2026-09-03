import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicOnlyRoute from './routes/PublicOnlyRoute';
import NurseRoute from './routes/NurseRoute';
import DoctorRoute from './routes/DoctorRoute';
import PatientRoute from './routes/PatientRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RecuperarCuentaPage from './pages/RecuperarCuentaPage';
import HomePlaceholderPage from './pages/HomePlaceholderPage';
import AuthShell from './components/layout/AuthShell';
import NewsShell from './components/layout/NewsShell';
import SignosPage from './pages/nurse/SignosPage';
import StockPage from './pages/nurse/StockPage';
import GuardiaPage from './pages/nurse/GuardiaPage';
import EstadisticasPage from './pages/nurse/EstadisticasPage';
import NewsAndPrevention from './pages/NewsAndPrevention';
import NewsDetail from './pages/NewsDetail';
import SacarTurnoPublicoPage from './pages/SacarTurnoPublicoPage';
import Seguimiento from './pages/Seguimiento';
import IndicacionesPage from './pages/doctor/IndicacionesPage';
import HistoriaClinicaPage from './pages/doctor/HistoriaClinicaPage';
import AgendaPage from './pages/doctor/AgendaPage';
import PerfilPage from './pages/PerfilPage';
import MisTurnosPage from './pages/patient/MisTurnosPage';
import SacarTurnoPage from './pages/patient/SacarTurnoPage';
import { useAuth } from './context/useAuth';
import { roleHome } from './utils/roleHome';
import AdministrativeRoute from './routes/AdministrativeRoute';
import AdminNoticiasPage from './pages/admin/AdminNoticiasPage';
import AdminTurnosPage from './pages/admin/AdminTurnosPage';

function App() {
  const { rol } = useAuth();

  return (
    <Routes>
      {/* Principal pública: login + registro */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/recuperar-cuenta" element={<RecuperarCuentaPage />} />
      </Route>

      {/* Noticias: se ven con y sin sesión.
          NewsShell elige el layout: sidebar si estás logueado, cabecera pública si no. */}
      <Route element={<NewsShell />}>
        <Route path="/turnos" element={<SacarTurnoPublicoPage />} />
        <Route path="/noticias" element={<NewsAndPrevention />} />
        <Route path="/noticias/:id" element={<NewsDetail />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AuthShell />}>
          <Route element={<NurseRoute />}>
            <Route path="signos" element={<SignosPage />} />
            <Route path="seguimiento" element={<Seguimiento />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="guardia" element={<GuardiaPage />} />
            <Route path="estadisticas" element={<EstadisticasPage />} />
          </Route>

          <Route element={<DoctorRoute />}>
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="indicaciones" element={<IndicacionesPage />} />
            <Route path="historia-clinica" element={<HistoriaClinicaPage />} />
          </Route>

          <Route element={<PatientRoute />}>
            <Route path="sacar-turno" element={<SacarTurnoPage />} />
            <Route path="mis-turnos" element={<MisTurnosPage />} />
          </Route>

          <Route element={<AdministrativeRoute />}>
            <Route path="admin/turnos" element={<AdminTurnosPage />} />
            <Route path="admin/noticias" element={<AdminNoticiasPage />} />
          </Route>

          {/* Perfil: comun a los cuatro roles */}
          <Route path="perfil" element={<PerfilPage />} />

          <Route path="inicio" element={<HomePlaceholderPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
