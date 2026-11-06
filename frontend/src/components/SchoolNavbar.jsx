import { useState } from 'react'
import { Check, KeyRound, LockKeyhole, LogOut, PackageCheck, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import useBodyScrollLock from '../hooks/useBodyScrollLock.js'
import { apiRequest } from '../lib/api.js'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', to: '/school/dashboard' },
  { id: 'qc', label: 'QC & Penerimaan', to: '/school/qc' },
  { id: 'returns', label: 'Pengajuan Retur', to: '/school/returns' },
]

function SchoolNavbar({ school, activePage, onLogout }) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordNotice, setPasswordNotice] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useBodyScrollLock(passwordDialogOpen)

  async function changePassword(event) {
    event.preventDefault()
    setPasswordError('')
    setPasswordNotice('')
    if (newPassword !== passwordConfirmation) {
      setPasswordError('Konfirmasi kata sandi baru belum sama.')
      return
    }

    setSavingPassword(true)
    try {
      const result = await apiRequest('/api/school/password', {
        method: 'PATCH',
        tokenType: 'school',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setPasswordNotice(result.message)
      setPasswordDialogOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      setPasswordConfirmation('')
    } catch (requestError) {
      setPasswordError(requestError.message || 'Kata sandi gagal diubah.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <>
      <header className="school-portal-topbar">
        <div className="school-portal-topbar-inner">
          <Link className="school-portal-brand" to="/school/dashboard">
            <span><PackageCheck size={19} /></span>
            <span><strong>NutriTrack <b>MBG</b></strong><small>SEKOLAH <i>·</i> {school.name}</small></span>
          </Link>
          <nav className="school-portal-nav" aria-label="Navigasi sekolah">
            {NAV_ITEMS.map((item) => item.id === activePage ? (
              <span className="school-portal-nav-active" aria-current="page" key={item.id}>{item.label}</span>
            ) : (
              <Link to={item.to} key={item.id}>{item.label}</Link>
            ))}
          </nav>
          <div className="school-portal-profile">
            <span className="school-user-avatar">{school.name.trim().charAt(0).toUpperCase()}</span>
            <span className="school-user-copy"><strong>{school.name}</strong><small>Petugas sekolah</small></span>
            <button type="button" aria-label="Ubah password" onClick={() => { setPasswordNotice(''); setPasswordError(''); setPasswordDialogOpen(true) }}><KeyRound size={14} /><span>Ubah password</span></button>
            <button type="button" aria-label="Keluar dari akun sekolah" onClick={onLogout}><LogOut size={14} /><span>Keluar</span></button>
          </div>
        </div>
      </header>
      {passwordNotice && <div className="inline-notice success-notice school-password-notice" role="status"><Check size={16} />{passwordNotice}</div>}
      {passwordDialogOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPasswordDialogOpen(false) }}>
          <section className="detail-modal school-password-modal" role="dialog" aria-modal="true" aria-labelledby="school-password-title">
            <div className="modal-heading">
              <div><p className="eyebrow">Keamanan akun sekolah</p><h2 id="school-password-title">Ubah password</h2></div>
              <button className="icon-button" type="button" aria-label="Tutup ubah password" onClick={() => setPasswordDialogOpen(false)}><X size={19} /></button>
            </div>
            <p className="school-modal-description">Gunakan password baru minimal 12 karakter dan jangan gunakan nama sekolah sebagai password.</p>
            {passwordError && <div className="inline-notice error-notice" role="alert">{passwordError}</div>}
            <form className="school-form" onSubmit={changePassword}>
              <label className="form-label" htmlFor="school-current-password">Password saat ini</label>
              <input className="management-input" id="school-current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
              <label className="form-label" htmlFor="school-new-password">Password baru</label>
              <input className="management-input" id="school-new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              <label className="form-label" htmlFor="school-confirm-password">Ulangi password baru</label>
              <input className="management-input" id="school-confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
              <button className="button-primary activation-submit" type="submit" disabled={savingPassword}>{savingPassword ? 'Menyimpan...' : <>Simpan password <LockKeyhole size={15} /></>}</button>
            </form>
          </section>
        </div>
      )}
    </>
  )
}

export default SchoolNavbar
