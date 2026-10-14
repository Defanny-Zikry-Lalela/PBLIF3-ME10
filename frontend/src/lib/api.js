const ADMIN_TOKEN_KEY = 'nutritrack_admin_token'
const SCHOOL_TOKEN_KEY = 'nutritrack_school_token'

export function getToken(type = 'admin') {
  const tokenKey = type === 'school' ? SCHOOL_TOKEN_KEY : ADMIN_TOKEN_KEY
  return localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey)
}

export function setToken(token, rememberMe, type = 'admin') {
  clearToken(type)
  const tokenKey = type === 'school' ? SCHOOL_TOKEN_KEY : ADMIN_TOKEN_KEY
  const storage = rememberMe ? localStorage : sessionStorage
  storage.setItem(tokenKey, token)
}

export function clearToken(type = 'admin') {
  const tokenKey = type === 'school' ? SCHOOL_TOKEN_KEY : ADMIN_TOKEN_KEY
  localStorage.removeItem(tokenKey)
  sessionStorage.removeItem(tokenKey)
}

export async function apiRequest(path, options = {}) {
  const { tokenType = 'admin', ...requestOptions } = options
  const token = getToken(tokenType)
  const headers = new Headers(requestOptions.headers)
  headers.set('Accept', 'application/json')
  if (requestOptions.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(path, { ...requestOptions, headers })
  let body

  try {
    body = await response.json()
  } catch {
    throw new Error('Server mengirim respons yang tidak dapat dibaca.')
  }

  if (!response.ok) {
    if (response.status === 401 && token) clearToken(tokenType)
    throw new Error(body.message || 'Permintaan tidak dapat diproses.')
  }

  return body
}
