import { useEffect, useMemo, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { login as loginRequest } from '../api/auth'
import { setUnauthorizedHandler } from '../api/client'
import { AuthContext } from './authContextObject'

const TOKEN_KEY = 'p360_token'
const ROL_KEY = 'p360_rol'
const NOMBRE_KEY = 'p360_nombre'
const USER_ID_KEY = 'p360_userId'

function readStoredAuth() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  return {
    token,
    rol: localStorage.getItem(ROL_KEY),
    nombre: localStorage.getItem(NOMBRE_KEY),
    userId: localStorage.getItem(USER_ID_KEY)
      ? Number(localStorage.getItem(USER_ID_KEY))
      : null,
  }
}

function persistAuth({ token, rol, nombre, userId }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ROL_KEY, rol)
  localStorage.setItem(NOMBRE_KEY, nombre)
  localStorage.setItem(USER_ID_KEY, String(userId))
}

function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROL_KEY)
  localStorage.removeItem(NOMBRE_KEY)
  localStorage.removeItem(USER_ID_KEY)
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readStoredAuth())

  const logout = () => {
    clearStoredAuth()
    setAuth(null)
  }

  useEffect(() => {
    setUnauthorizedHandler(() => logout())
  }, [])

  const login = async (username, password) => {
    let response
    try {
      response = await loginRequest(username, password)
    } catch (err) {
      const message = err.response?.data?.Error || 'No se pudo iniciar sesión.'
      throw new Error(message, { cause: err })
    }
    const { access_token: token, rol, nombre } = response.data
    let userId = null
    try {
      const decoded = jwtDecode(token)
      userId = decoded?.sub ? Number(decoded.sub) : null
    } catch {
      // token without a usable sub claim: leave userId as null
    }
    const nextAuth = { token, rol, nombre, userId }
    persistAuth(nextAuth)
    setAuth(nextAuth)
    return nextAuth
  }

  const value = useMemo(
    () => ({
      token: auth?.token ?? null,
      rol: auth?.rol ?? null,
      nombre: auth?.nombre ?? null,
      userId: auth?.userId ?? null,
      isAuthenticated: !!auth?.token,
      login,
      logout,
    }),
    [auth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
