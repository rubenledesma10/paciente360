import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicOnlyRoute from './routes/PublicOnlyRoute';
import NurseRoute from './routes/NurseRoute';
import PatientRoute from './routes/PatientRoute'; // ← nuevo
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePlaceholderPage from './pages/HomePlaceholderPage';
import AuthShell from './components/layout/AuthShell';
import SignosPage from './pages/nurse/SignosPage';
import StockPage from './pages/nurse/StockPage';
import GuardiaPage from './pages/nurse/GuardiaPage';
import NewsAndPrevention from './pages/NewsAndPrevention';
import NewsDetail from './pages/NewsDetail';
import Seguimiento from './pages/Seguimiento';
import { useAuth } from './context/useAuth';
import { roleHome } from './utils/roleHome';

function App() {
  const { rol } = useAuth();

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
            <Route path="seguimiento" element={<Seguimiento />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="guardia" element={<GuardiaPage />} />
          </Route>

          {/* Rutas del paciente */}
          <Route element={<PatientRoute />}>
            <Route path="noticias" element={<NewsAndPrevention />} />
            <Route path="noticias/:id" element={<NewsDetail />} />
          </Route>

          <Route path="inicio" element={<HomePlaceholderPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
