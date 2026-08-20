import client from './client'

export function login(username, password) {
  return client.post('/auth/login', { username, password })
}

export function forgotPassword(email) {
  return client.post('/auth/forgot-password', { email })
}
