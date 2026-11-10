import { useCallback, useEffect, useState } from 'react'
import { Check, CircleAlert, LoaderCircle, Mail, Plus, RefreshCw, Send, Truck, UserRoundPlus, Users, X } from 'lucide-react'
import { apiRequest } from '../lib/api.js'
import useBodyScrollLock from '../hooks/useBodyScrollLock.js'

function CourierManagementPage() {
  const [drivers, setDrivers] = useState([])
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingId, setSendingId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '' })
  useBodyScrollLock(formOpen)

  const loadDrivers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiRequest('/api/admin/drivers')
      setDrivers(result.drivers)
      setEmailConfigured(result.emailConfigured)
    } catch (requestError) {
      setError(requestError.message || 'Daftar kurir gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDrivers() }, [loadDrivers])

  async function createDriver(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest('/api/admin/drivers', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setNotice(result.message)
      setForm({ name: '', email: '' })
      setFormOpen(false)
      await loadDrivers()
    } catch (requestError) {
      setError(requestError.message || 'Akun kurir gagal dibuat.')
    } finally {
      setSaving(false)
    }
  }

  function openNewDriver() {
    setForm({ name: '', email: '' })
    setFormOpen(true)
  }

  async function resendInvitation(driver) {
    setSendingId(driver.id)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest(`/api/admin/drivers/${driver.id}/invite`, { method: 'POST' })
      setNotice(result.message)
      await loadDrivers()
    } catch (requestError) {
      setError(requestError.message || 'Undangan akun kurir gagal dikirim.')
    } finally {
      setSendingId(null)
    }
  }

  const activeAccounts = drivers.filter((driver) => driver.accountStatus === 'ACTIVE').length
  const pendingAccounts = drivers.filter((driver) => driver.accountStatus === 'PENDING').length

  return (
    <main className="dashboard-content management-page">
      <div className="page-heading">
        <div>
          <p className="breadcrumb">Admin <span>/</span> Akun kurir</p>
          <p className="eyebrow"><span className="eyebrow-line" /> Pengelolaan distribusi</p>
          <h1>Akun kurir</h1>
          <p className="page-description">Buat akses kurir, kirim undangan aktivasi, dan tugaskan kurir pada detail pengiriman.</p>
        </div>
        <div className="page-heading-actions">
          <button className="button-primary page-action-button" type="button" onClick={openNewDriver}><Plus size={16} /> Tambah kurir</button>
          <button className="button-secondary" type="button" onClick={loadDrivers} disabled={loading}><RefreshCw size={14} /> Perbarui data</button>
        </div>
      </div>

      <div className={`email-setup-banner${emailConfigured ? ' email-setup-ready' : ''}`}>
        <span className="email-setup-icon"><Mail size={18} /></span>
        <div>
          <strong>{emailConfigured ? 'Undangan aktivasi kurir siap dikirim.' : 'Undangan kurir menunggu konfigurasi SMTP.'}</strong>
          <p>{emailConfigured ? 'Kurir menerima tautan aman untuk membuat kata sandi dan mengaktifkan akunnya.' : 'Atur SMTP backend agar tautan aktivasi dapat dikirim ke email kurir.'}</p>
        </div>
      </div>

      {notice && <div className="inline-notice success-notice" role="status"><Check size={16} />{notice}</div>}
      {error && <div className="inline-notice error-notice" role="alert"><CircleAlert size={16} />{error}<button type="button" onClick={loadDrivers}><RefreshCw size={14} /></button></div>}

      <section className="school-summary-grid" aria-label="Ringkasan akun kurir">
        <SummaryCard icon={<Truck size={18} />} label="Kurir terdaftar" value={drivers.length} note="akun kurir di sistem" />
        <SummaryCard icon={<Check size={18} />} label="Akun aktif" value={activeAccounts} note="kurir sudah mengaktifkan akun" />
        <SummaryCard icon={<Mail size={18} />} label="Menunggu aktivasi" value={pendingAccounts} note="undangan aktivasi kurir" />
      </section>

      <section className="panel school-list-panel">
        <div className="panel-heading school-list-heading">
          <div><h2>Daftar akun kurir</h2><p>Status akses dan email aktivasi</p></div>
          <span className="school-total"><Users size={14} /> {drivers.length} kurir</span>
        </div>
        <div className="school-list">
          {loading && !drivers.length ? (
            <div className="management-empty"><LoaderCircle size={18} className="refresh-spinning" /> Memuat daftar kurir...</div>
          ) : drivers.length ? drivers.map((driver) => (
            <article className="school-row" key={driver.id}>
              <span className="school-row-icon"><Truck size={18} /></span>
              <div className="school-row-main">
                <strong>{driver.name}</strong>
                <span className="school-row-email"><Mail size={12} /> {driver.email || 'Belum ada akun email'}</span>
              </div>
              <span className={`account-status-badge account-${driver.accountStatus.toLowerCase()}`}>
                <span />
                {driver.accountStatus === 'ACTIVE' ? 'Kurir sudah mengaktifkan akun' : driver.invitationEmailStatus === 'SENT' ? 'Undangan terkirim · menunggu aktivasi' : driver.invitationEmailStatus === 'FAILED' ? 'Pengiriman gagal · kirim ulang' : 'Menunggu undangan aktivasi'}
              </span>
              {driver.accountStatus === 'PENDING' && (
                <button className="button-secondary invite-button" type="button" disabled={sendingId === driver.id} onClick={() => resendInvitation(driver)}>
                  {sendingId === driver.id ? <LoaderCircle size={14} className="refresh-spinning" /> : <Send size={14} />}
                  {sendingId === driver.id ? 'Menyiapkan...' : 'Kirim ulang undangan'}
                </button>
              )}
            </article>
          )) : <div className="management-empty"><UserRoundPlus size={22} /> Belum ada akun kurir yang terdaftar.</div>}
        </div>
      </section>

      {formOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false) }}>
          <section className="detail-modal school-modal" role="dialog" aria-modal="true" aria-labelledby="new-courier-title">
            <div className="modal-heading">
              <div><p className="eyebrow">Pengelolaan distribusi</p><h2 id="new-courier-title">Tambah akun kurir</h2></div>
              <button className="icon-button" type="button" aria-label="Tutup formulir" onClick={() => setFormOpen(false)}><X size={19} /></button>
            </div>
            <p className="school-modal-description">Undangan aktivasi akan dikirim ke email kurir agar kurir dapat membuat kata sandi dan mengaktifkan akunnya.</p>
            <form className="school-form" onSubmit={createDriver}>
              <label className="form-label" htmlFor="courier-name">Nama kurir</label>
              <input className="management-input" id="courier-name" required maxLength="160" placeholder="Nama lengkap kurir" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />

              <label className="form-label" htmlFor="courier-email">Email kurir</label>
              <input className="management-input" id="courier-email" type="email" required maxLength="254" placeholder="kurir@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              <p className="school-form-help"><Mail size={13} /> Undangan dikirim ke alamat email ini saat SMTP aktif.</p>

              <button className="button-primary school-submit-button" type="submit" disabled={saving}>
                {saving ? <><LoaderCircle size={16} className="refresh-spinning" /> Menyiapkan...</> : <><Plus size={16} /> Buat akun &amp; kirim undangan</>}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

function SummaryCard({ icon, label, value, note }) {
  return (
    <article className="metric-card school-summary-card">
      <div className="metric-card-top"><span className="metric-icon">{icon}</span><span className="metric-label">{label}</span></div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-suffix">{note}</span>
    </article>
  )
}

export default CourierManagementPage
