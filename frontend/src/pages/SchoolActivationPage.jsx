import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, LockKeyhole, PackageCheck } from 'lucide-react'
import { apiRequest } from '../lib/api.js'

function SchoolActivationPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function activate(event) {
    event.preventDefault()
    setError('')
    if (!token) {
      setError('Tautan aktivasi tidak lengkap. Gunakan tautan terbaru dari email sekolah.')
      return
    }
    if (password !== confirmation) {
      setError('Konfirmasi kata sandi belum sama.')
      return
    }
    setSaving(true)
    try {
      await apiRequest('/api/auth/school/activate', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      setShowSuccess(true)
    } catch (requestError) {
      setError(requestError.message || 'Akun sekolah tidak dapat diaktifkan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="activation-page">
      <section className="activation-card">
        <span className="activation-brand"><PackageCheck size={19} /> NutriTrack <strong>MBG</strong></span>
        {showSuccess ? (
          <div className="activation-result">
            <span className="activation-success-icon"><Check size={24} /></span>
            <p className="login-overline">Password berhasil dibuat</p>
            <h1>Kata sandi berhasil dibuat</h1>
            <p>Silakan masuk ke portal sekolah. Status akun akan aktif setelah login berhasil.</p>
            <Link to="/school/login" className="activation-back-link">Masuk ke portal sekolah <ArrowRight size={15} /></Link>
          </div>
        ) : (
          <>
            <span className="activation-icon"><LockKeyhole size={20} /></span>
            <p className="login-overline">Aktivasi akun sekolah</p>
            <h1>Buat kata sandi</h1>
            <p className="activation-description">Buat kata sandi minimal 12 karakter. Setelah itu, login ke portal sekolah untuk mengaktifkan status akun.</p>
            {error && <div className="login-error" role="alert">{error}</div>}
            <form onSubmit={activate}>
              <label className="form-label" htmlFor="school-password">Kata sandi baru</label>
              <span className="activation-input"><LockKeyhole size={16} /><input id="school-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 12 karakter" /></span>
              <label className="form-label activation-confirm-label" htmlFor="school-password-confirm">Ulangi kata sandi</label>
              <span className="activation-input"><LockKeyhole size={16} /><input id="school-password-confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Masukkan kembali kata sandi" /></span>
              <button className="button-primary activation-submit" type="submit" disabled={saving}>{saving ? 'Menyimpan kata sandi...' : <>Simpan kata sandi <ArrowRight size={16} /></>}</button>
            </form>
          </>
        )}
        <p className="activation-footer">NutriTrack MBG <span>·</span> Program Makanan Bergizi Gratis</p>
      </section>
    </main>
  )
}

export default SchoolActivationPage
