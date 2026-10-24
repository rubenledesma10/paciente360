import { useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { login as loginRequest } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { AuthContext } from './authContextObject';

const TOKEN_KEY = 'p360_token';
const ROL_KEY = 'p360_rol';
const NOMBRE_KEY = 'p360_nombre';
const USER_ID_KEY = 'p360_userId';
const FOTO_KEY = 'p360_foto';

function readStoredAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  return {
    token,
    rol: localStorage.getItem(ROL_KEY),
    nombre: localStorage.getItem(NOMBRE_KEY),
    userId: localStorage.getItem(USER_ID_KEY)
      ? Number(localStorage.getItem(USER_ID_KEY))
      : null,
    foto: localStorage.getItem(FOTO_KEY) || null,
  };
}

function persistAuth({ token, rol, nombre, userId, foto }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROL_KEY, rol);
  localStorage.setItem(NOMBRE_KEY, nombre);
  localStorage.setItem(USER_ID_KEY, String(userId));
  if (foto) {
    localStorage.setItem(FOTO_KEY, foto);
  } else {
    localStorage.removeItem(FOTO_KEY);
  }
}

function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROL_KEY);
  localStorage.removeItem(NOMBRE_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(FOTO_KEY);
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readStoredAuth());

  const logout = () => {
    clearStoredAuth();
    setAuth(null);
  };

  useEffect(() => {
    setUnauthorizedHandler(() => logout());
  }, []);

  const login = async (username, password) => {
    let response;
    try {
      response = await loginRequest(username, password);
    } catch (err) {
      const message = err.response?.data?.Error || 'No se pudo iniciar sesión.';
      throw new Error(message, { cause: err });
    }
    const { access_token: token, rol, nombre } = response.data;
    let userId = null;
    try {
      const decoded = jwtDecode(token);
      userId = decoded?.sub ? Number(decoded.sub) : null;
    } catch {
      // token without a usable sub claim: leave userId as null
    }
    const nextAuth = { token, rol, nombre, userId, foto: null };
    persistAuth(nextAuth);
    setAuth(nextAuth);
    return nextAuth;
  };

  // Permite que la pantalla de perfil refresque el avatar y el nombre del
  // shell sin obligar al usuario a cerrar sesion y volver a entrar.
  const updateProfileInfo = ({ nombre, foto } = {}) => {
    setAuth((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        nombre: nombre !== undefined ? nombre : prev.nombre,
        foto: foto !== undefined ? foto : prev.foto,
      };
      persistAuth(next);
      return next;
    });
  };

  const value = useMemo(
    () => ({
      token: auth?.token ?? null,
      rol: auth?.rol ?? null,
      nombre: auth?.nombre ?? null,
      userId: auth?.userId ?? null,
      foto: auth?.foto ?? null,
      isAuthenticated: !!auth?.token,
      login,
      logout,
      updateProfileInfo,
    }),
    [auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
