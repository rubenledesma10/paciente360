import { useAuth } from '../../context/useAuth';
import AuthShell from './AuthShell';
import PublicShell from './PublicShell';

/**
 * Layout para las noticias, que son publicas pero tambien las ve el paciente
 * logueado desde su menu.
 *
 * Si hay sesion se usa el AuthShell (con sidebar y campana), y si no el
 * PublicShell. Sin esto, el paciente logueado que entraba a /noticias veia
 * la cabecera publica con "Iniciar sesion" y parecia que se habia deslogueado.
 */
export default function NewsShell() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AuthShell /> : <PublicShell />;
}
