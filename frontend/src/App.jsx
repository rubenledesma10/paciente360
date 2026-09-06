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
import TurnoEmailPage from './pages/TurnoEmailPage';
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
import AdminRoute from './routes/AdminRoute';
import SuperAdminRoute from './routes/SuperAdminRoute';
import AdminNoticiasPage from './pages/admin/AdminNoticiasPage';
import AdminTurnosPage from './pages/admin/AdminTurnosPage';
import AdminUsuariosPage from './pages/admin/AdminUsuariosPage';
import BitacoraPage from './pages/admin/BitacoraPage';
import HelpAssistant from './components/HelpAssistant';

function App() {
  const { rol } = useAuth();

  return (
    <>
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
              <Route
                path="historia-clinica"
                element={<HistoriaClinicaPage />}
              />
            </Route>

            <Route element={<PatientRoute />}>
              <Route path="sacar-turno" element={<SacarTurnoPage />} />
              <Route path="mis-turnos" element={<MisTurnosPage />} />
            </Route>

            {/* Operatoria de la salita: Administrativo, Administrador y Superadmin */}
            <Route element={<AdministrativeRoute />}>
              <Route path="admin/turnos" element={<AdminTurnosPage />} />
              <Route path="admin/noticias" element={<AdminNoticiasPage />} />
            </Route>

            {/* Gestion del sistema: Administrador y Superadmin.
                Stock, historia clinica y guardia reusan las pantallas de
                enfermero y medico bajo rutas propias. */}
            <Route element={<AdminRoute />}>
              <Route path="admin/usuarios" element={<AdminUsuariosPage />} />
              <Route path="admin/stock" element={<StockPage />} />
              <Route
                path="admin/historia-clinica"
                element={<HistoriaClinicaPage />}
              />
              <Route path="admin/guardia" element={<GuardiaPage />} />
            </Route>

            {/* Solo Superadmin */}
            <Route element={<SuperAdminRoute />}>
              <Route path="admin/bitacora" element={<BitacoraPage />} />
            </Route>

            {/* Perfil: comun a los cuatro roles */}
            <Route path="perfil" element={<PerfilPage />} />

            <Route path="inicio" element={<HomePlaceholderPage />} />
          </Route>
        </Route>

        {/* Resultado de confirmar/cancelar desde el mail. Sin layout a
            proposito: se abre desde un link, no desde la app, y tiene que
            verse igual con o sin sesion. */}
        <Route path="/turno-email" element={<TurnoEmailPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Chatbot de ayuda: fuera de <Routes> para que este en todas las
          pantallas, con o sin sesion */}
      <HelpAssistant />
    </>
  );
}

export default App;
