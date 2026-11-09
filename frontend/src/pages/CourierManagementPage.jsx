import { useCallback, useEffect, useState } from 'react'
import { Check, CircleAlert, LoaderCircle, Mail, Pencil, Plus, RefreshCw, Send, Trash2, Truck, UserRoundPlus, Users, X } from 'lucide-react'
import { apiRequest } from '../lib/api.js'
import useBodyScrollLock from '../hooks/useBodyScrollLock.js'

function CourierManagementPage() {
  const [drivers, setDrivers] = useState([])
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingId, setSendingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [testingEmail, setTestingEmail] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)
  const [form, setForm] = useState({ name: '', email: '' })
  useBodyScrollLock(formOpen)

  const loadDrivers = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const result = await apiRequest('/api/admin/drivers')
      setDrivers(result.drivers)
      setEmailConfigured(result.emailConfigured)
    } catch (requestError) {
      setError(requestError.message || 'Daftar kurir gagal dimuat.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { loadDrivers() }, [loadDrivers])
  useEffect(() => {
    const refreshTimer = window.setInterval(() => loadDrivers({ silent: true }), 15000)
    return () => window.clearInterval(refreshTimer)
  }, [loadDrivers])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest(
        editingDriver ? `/api/admin/drivers/${editingDriver.id}` : '/api/admin/drivers',
        {
          method: editingDriver ? 'PATCH' : 'POST',
          body: JSON.stringify(form),
        },
      )
      setNotice(result.message)
      setEditingDriver(null)
      setForm({ name: '', email: '' })
      setFormOpen(false)
      await loadDrivers()
    } catch (requestError) {
      setError(requestError.message || 'Data kurir gagal disimpan.')
    } finally {
      setSaving(false)
    }
  }

  function openNewDriver() {
    setEditingDriver(null)
    setForm({ name: '', email: '' })
    setFormOpen(true)
  }

  function openEditDriver(driver) {
    setEditingDriver(driver)
    setForm({ name: driver.name, email: driver.email || '' })
    setFormOpen(true)
  }

  async function deleteDriver(driver) {
    if (!window.confirm(`Hapus kurir ${driver.name}? Riwayat pengiriman tetap disimpan, tetapi penugasan kurir ini akan dilepas.`)) return
    setDeletingId(driver.id)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest(`/api/admin/drivers/${driver.id}`, { method: 'DELETE' })
      setNotice(result.message)
      await loadDrivers()
    } catch (requestError) {
      setError(requestError.message || 'Kurir gagal dihapus.')
    } finally {
      setDeletingId(null)
    }
  }

  async function testEmailConnection() {
    setTestingEmail(true)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest('/api/admin/email/test', { method: 'POST' })
      setEmailConfigured(result.configured)
      setNotice(result.message)
    } catch (requestError) {
      setError(requestError.message || 'Koneksi SMTP gagal diverifikasi.')
    } finally {
      setTestingEmail(false)
    }
  }

  async function resendInvitation(driver) {
    setSendingId(driver.id)
    setError('')
    setNotice('')
    try {
      const result = driver.accountStatus === 'NONE'
        ? await apiRequest(`/api/admin/drivers/${driver.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: driver.name, email: driver.email }),
        })
        : await apiRequest(`/api/admin/drivers/${driver.id}/invite`, { method: 'POST' })
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
          <p className="page-description">Atur data dan akun kurir serta penugasan pengiriman MBG.</p>
        </div>
        <button className="button-primary page-action-button" type="button" onClick={openNewDriver}>
          <Plus size={16} /> Tambah kurir
        </button>
      </div>

      <div className={`email-setup-banner${emailConfigured ? ' email-setup-ready' : ''}`}>
        <span className="email-setup-icon"><Mail size={18} /></span>
        <div>
          <strong>{emailConfigured ? 'Kredensial akun kurir siap dikirim.' : 'Email kredensial kurir menunggu konfigurasi SMTP.'}</strong>
          <p>{emailConfigured
            ? 'Uji koneksi SMTP. Email berisi email login dan password awal yang sama dengan nama kurir.'
            : 'SMTP belum aktif. Isi pengaturan SMTP di backend/.env dan mulai ulang backend. Jangan bagikan kata sandi SMTP melalui chat.'}</p>
        </div>
        <button className="email-test-button" type="button" onClick={testEmailConnection} disabled={testingEmail}>
          {testingEmail
            ? <><LoaderCircle size={14} className="refresh-spinning" /> Menguji...</>
            : <><Send size={14} /> {emailConfigured ? 'Uji & kirim email' : 'Uji koneksi SMTP'}</>}
        </button>
      </div>

      {notice && <div className="inline-notice success-notice" role="status"><Check size={16} />{notice}</div>}
      {error && <div className="inline-notice error-notice" role="alert"><CircleAlert size={16} />{error}<button type="button" onClick={loadDrivers}><RefreshCw size={14} /></button></div>}

      <section className="school-summary-grid" aria-label="Ringkasan akun kurir">
        <SummaryCard icon={<Truck size={18} />} label="Kurir terdaftar" value={drivers.length} note="kurir dalam sistem" />
        <SummaryCard icon={<Check size={18} />} label="Akun aktif" value={activeAccounts} note="kurir sudah login pertama kali" />
        <SummaryCard icon={<Mail size={18} />} label="Menunggu login" value={pendingAccounts} note="kredensial belum digunakan" />
      </section>

      <section className="panel school-list-panel">
        <div className="panel-heading school-list-heading">
          <div><h2>Daftar kurir</h2><p>Data kurir, status akun, dan tindakan pengelolaan</p></div>
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
                <span className="school-row-email"><Mail size={12} /> {driver.email || 'Belum ada email akun'}</span>
              </div>
              <span className={`account-status-badge account-${driver.accountStatus.toLowerCase()}`}>
                <span />
                {driver.accountStatus === 'ACTIVE'
                  ? 'Kurir sudah mengaktifkan akun'
                  : driver.accountStatus === 'PENDING'
                    ? driver.invitationEmailStatus === 'SENT'
                      ? 'Email terkirim · menunggu login'
                      : driver.invitationEmailStatus === 'FAILED'
                        ? 'Pengiriman gagal · kirim ulang'
                        : 'Menunggu email kredensial'
                    : 'Belum ada akun'}
              </span>
              {driver.accountStatus !== 'ACTIVE' && (
                <button
                  className="button-secondary invite-button"
                  type="button"
                  disabled={sendingId === driver.id}
                  onClick={() => resendInvitation(driver)}
                >
                  {sendingId === driver.id ? <LoaderCircle size={14} className="refresh-spinning" /> : <Send size={14} />}
                  {sendingId === driver.id
                    ? 'Menyiapkan...'
                    : driver.accountStatus === 'NONE' ? 'Siapkan akun' : 'Kirim ulang email'}
                </button>
              )}
              {driver.accountStatus === 'ACTIVE' && <span className="account-verified"><Check size={15} /> Login pertama berhasil</span>}
              <div className="school-row-actions">
                <button className="school-icon-action" type="button" onClick={() => openEditDriver(driver)} aria-label={`Edit ${driver.name}`} title="Edit kurir"><Pencil size={15} /></button>
                <button
                  className="school-icon-action school-delete-action"
                  type="button"
                  disabled={deletingId === driver.id}
                  onClick={() => deleteDriver(driver)}
                  aria-label={`Hapus ${driver.name}`}
                  title="Hapus kurir"
                >
                  {deletingId === driver.id ? <LoaderCircle size={15} className="refresh-spinning" /> : <Trash2 size={15} />}
                </button>
              </div>
            </article>
          )) : (
            <div className="management-empty"><UserRoundPlus size={22} /> Belum ada kurir yang terdaftar.</div>
          )}
        </div>
      </section>

      {formOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setFormOpen(false); setEditingDriver(null) } }}>
          <section className="detail-modal school-modal" role="dialog" aria-modal="true" aria-labelledby="courier-form-title">
            <div className="modal-heading">
              <div><p className="eyebrow">Pengelolaan kurir MBG</p><h2 id="courier-form-title">{editingDriver ? 'Edit kurir' : 'Tambah kurir'}</h2></div>
              <button className="icon-button" type="button" aria-label="Tutup formulir kurir" onClick={() => { setFormOpen(false); setEditingDriver(null) }}><X size={19} /></button>
            </div>
            <p className="school-modal-description">
              {editingDriver
                ? editingDriver.email !== form.email
                  ? 'Perubahan email akan menonaktifkan akun sampai login pertama dengan email baru. Password awal mengikuti nama kurir.'
                  : editingDriver.accountStatus === 'PENDING' && editingDriver.name !== form.name
                    ? 'Perubahan nama kurir akan memperbarui password awal dan mengirim ulang kredensial.'
                    : 'Perbarui data kurir. Penugasan pengiriman yang sudah ada tetap tersimpan.'
                : 'Email login dan password awal yang sama dengan nama kurir akan dikirim ke kurir. Kurir dapat mengganti password setelah login.'}
            </p>
            <form className="school-form" onSubmit={handleSubmit}>
              <label className="form-label" htmlFor="courier-name">Nama kurir</label>
              <input
                className="management-input"
                id="courier-name"
                required
                maxLength={160}
                placeholder="Nama lengkap kurir"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
              <label className="form-label" htmlFor="courier-email">Email kurir</label>
              <input
                className="management-input"
                id="courier-email"
                type="email"
                required
                maxLength={254}
                placeholder="kurir@example.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
              <p className="school-form-help"><Mail size={13} /> {editingDriver ? 'Perubahan email membuat akun menunggu login pertama dengan password awal sesuai nama kurir.' : 'Kredensial awal dikirim ke email ini saat SMTP aktif.'}</p>
              <button className="button-primary school-submit-button" type="submit" disabled={saving}>
                {saving
                  ? <><LoaderCircle size={16} className="refresh-spinning" /> Menyimpan...</>
                  : editingDriver ? <><Check size={16} /> Simpan perubahan</> : <><Plus size={16} /> Simpan kurir &amp; siapkan akun</>}
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
