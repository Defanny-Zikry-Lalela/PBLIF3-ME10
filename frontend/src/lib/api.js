const ADMIN_TOKEN_KEY = 'nutritrack_admin_token'
const SCHOOL_TOKEN_KEY = 'nutritrack_school_token'
const DRIVER_TOKEN_KEY = 'nutritrack_driver_token'

export function getToken(type = 'admin') {
  const tokenKey = type === 'school'
    ? SCHOOL_TOKEN_KEY
    : type === 'driver' ? DRIVER_TOKEN_KEY : ADMIN_TOKEN_KEY
  return localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey)
}

export function setToken(token, rememberMe, type = 'admin') {
  clearToken(type)
  const tokenKey = type === 'school'
    ? SCHOOL_TOKEN_KEY
    : type === 'driver' ? DRIVER_TOKEN_KEY : ADMIN_TOKEN_KEY
  const storage = rememberMe ? localStorage : sessionStorage
  storage.setItem(tokenKey, token)
}

export function clearToken(type = 'admin') {
  const tokenKey = type === 'school'
    ? SCHOOL_TOKEN_KEY
    : type === 'driver' ? DRIVER_TOKEN_KEY : ADMIN_TOKEN_KEY
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

  let response
  try {
    response = await fetch(path, { ...requestOptions, headers })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    if (error instanceof TypeError) {
      throw new Error('Tidak dapat terhubung ke server. Pastikan backend berjalan di port 5000, lalu coba lagi.')
    }
    throw error
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`Server mengirim respons bukan JSON (HTTP ${response.status}). Periksa apakah backend berjalan dan proxy /api mengarah ke port 5000.`)
  }
  const body = await response.json()

  if (!response.ok) {
    if (response.status === 401 && token) clearToken(tokenType)
    throw new Error(body.message || 'Permintaan tidak dapat diproses.')
  }

  return body
}
