import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, PackageCheck } from 'lucide-react'
import { apiRequest, setToken } from '../lib/api.js'
import useBodyScrollLock from '../hooks/useBodyScrollLock.js'

function Login({ onAdminLogin, onSchoolLogin, onDriverLogin }) {
  useBodyScrollLock(true)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      const role = result.role
        || (result.actor === 'DRIVER' ? 'COURIER' : result.actor)

      if (role === 'COURIER') {
        setToken(result.token, rememberMe, 'driver')
        onDriverLogin({ ...result.driver, role })
        navigate('/courier/dashboard', { replace: true })
      } else if (role === 'ADMIN') {
        setToken(result.token, rememberMe, 'admin')
        onAdminLogin(result.admin)
        navigate('/admin/dashboard', { replace: true })
      } else if (role === 'SCHOOL') {
        setToken(result.token, rememberMe, 'school')
        onSchoolLogin(result.school)
        navigate('/school/dashboard', { replace: true })
      } else {
        throw new Error('Peran akun tidak dikenali. Silakan hubungi administrator.')
      }
    } catch (requestError) {
      setError(requestError.message || 'Tidak dapat terhubung ke server. Silakan coba kembali.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-decoration login-decoration-top" />
      <div className="login-decoration login-decoration-bottom" />
      <div className="login-layout">
        <section className="login-intro">
          <a href="/login" className="login-brand" aria-label="NutriTrack MBG" onClick={(event) => event.preventDefault()}>
            <span className="login-brand-mark"><PackageCheck size={24} strokeWidth={1.9} /></span>
            <span>NutriTrack <strong>MBG</strong></span>
          </a>
          <div className="login-intro-content">
            <h1>Makanan bergizi sampai ke <span>setiap sekolah.</span></h1>
            <p>Pantau penyiapan dan penyaluran MBG dari SPPG hingga diterima para siswa secara tepat waktu.</p>
          </div>
          <div className="login-intro-footer">
            <span className="intro-status-dot" />
            <span>Distribusi MBG terpantau</span>
            <span className="intro-footer-divider">·</span>
            <span>Batam Center</span>
          </div>
          <div className="login-art" aria-hidden="true">
            <div className="art-halo art-halo-large" />
            <div className="art-halo art-halo-small" />
            <div className="art-card art-card-top"><span className="art-mini-icon"><PackageCheck size={18} /></span><span><strong>Distribusi terpantau</strong><small>Status pengiriman live</small></span><span className="art-check">✓</span></div>
            <div className="art-route"><span /><i /><span /></div>
            <div className="art-card art-card-bottom"><span className="art-mini-icon art-mini-icon-green"><LockKeyhole size={17} /></span><span><strong>Akses sesuai peran</strong><small>Admin, sekolah, dan kurir</small></span></div>
          </div>
        </section>

        <section className="login-form-section">
          <form className="login-card" onSubmit={handleSubmit}>
            <div className="login-card-header">
              <p className="login-overline">Portal NutriTrack MBG</p>
              <h2>Selamat datang</h2>
              <p className="login-subtitle">Masuk untuk melanjutkan ke dashboard NutriTrack MBG.</p>
            </div>

            {error && <div className="login-error" role="alert"><span className="login-error-mark">!</span><span>{error}</span></div>}

            <label className="form-label" htmlFor="login-username">Email atau username</label>
            <div className="login-input-wrap">
              <Mail size={17} />
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Masukkan email atau username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                maxLength={254}
              />
            </div>

            <div className="password-label-row">
              <label className="form-label" htmlFor="login-password">Kata sandi</label>
            </div>
            <div className="login-input-wrap">
              <LockKeyhole size={17} />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                maxLength={160}
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <label className="remember-control">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
              <span className="remember-box" />
              <span>Ingat saya</span>
            </label>

            <button className="button-primary login-submit" type="submit" disabled={loading}>
              {loading ? <><span className="button-spinner" /> Memverifikasi...</> : <>Masuk <ArrowRight size={17} /></>}
            </button>

            <div className="login-help">
              <p>Sistem mengenali akun admin, sekolah, atau kurir secara otomatis.</p>
            </div>
          </form>
          <p className="login-copyright">© {new Date().getFullYear()} NutriTrack MBG <span>·</span> Program Makanan Bergizi Gratis</p>
        </section>
      </div>
    </main>
  )
}

export default Login