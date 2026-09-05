import { useAuth } from '../context/useAuth';

/**
 * true si el usuario logueado es Administrador o Superadministrador.
 *
 * Esos roles supervisan todo el sistema, pero no ejecutan acciones clinicas:
 * no cargan signos, indicaciones, pases de guardia ni movimientos de stock.
 * Las pantallas usan esto para ocultar los botones de accion.
 *
 * Es solo cosmetico: quien realmente lo impide es el backend, con
 * solo_lectura_admins=True en el decorador role_required.
 */
export function useReadOnly() {
  const { rol } = useAuth();
  return rol === 'Administrator' || rol === 'Superadministrador';
}
