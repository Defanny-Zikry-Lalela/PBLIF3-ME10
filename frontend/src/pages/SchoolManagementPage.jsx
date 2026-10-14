import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, Check, CircleAlert, LoaderCircle, Mail, Pencil, Plus, RefreshCw, School, Send, Trash2, UserRoundPlus, Users, X } from 'lucide-react'
import { apiRequest } from '../lib/api.js'

const LEVELS = [
  { value: 'SD', label: 'Sekolah Dasar (SD)' },
  { value: 'SMP', label: 'Sekolah Menengah Pertama (SMP)' },
  { value: 'SMA', label: 'Sekolah Menengah Atas (SMA)' },
  { value: 'SMK', label: 'Sekolah Menengah Kejuruan (SMK)' },
  { value: 'SLB', label: 'Sekolah Luar Biasa (SLB)' },
]

function SchoolManagementPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [schools, setSchools] = useState([])
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [sendingId, setSendingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [testingEmail, setTestingEmail] = useState(false)
  const [formOpen, setFormOpen] = useState(() => new URLSearchParams(location.search).get('newSchool') === '1')
  const [editingSchool, setEditingSchool] = useState(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    educationLevel: 'SD',
    targetPupils: '',
    address: '',
  })

  const loadSchools = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const result = await apiRequest('/api/admin/schools')
      setSchools(result.schools)
      setEmailConfigured(result.emailConfigured)
    } catch (requestError) {
      setError(requestError.message || 'Data sekolah gagal dimuat.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { loadSchools() }, [loadSchools])
  useEffect(() => {
    const refreshTimer = window.setInterval(() => loadSchools({ silent: true }), 15000)
    return () => window.clearInterval(refreshTimer)
  }, [loadSchools])

  useEffect(() => {
    if (new URLSearchParams(location.search).get('newSchool') === '1') {
      setFormOpen(true)
      navigate('/schools', { replace: true })
    }
  }, [location.search, navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest(editingSchool ? `/api/admin/schools/${editingSchool.id}` : '/api/admin/schools', {
        method: editingSchool ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...form, targetPupils: Number(form.targetPupils) }),
      })
      setNotice(result.message)
      setEditingSchool(null)
      setForm({ name: '', email: '', educationLevel: 'SD', targetPupils: '', address: '' })
      setFormOpen(false)
      await loadSchools()
    } catch (requestError) {
      setError(requestError.message || 'Sekolah gagal disimpan.')
    } finally {
      setSaving(false)
    }
  }

  function openNewSchool() {
    setEditingSchool(null)
    setForm({ name: '', email: '', educationLevel: 'SD', targetPupils: '', address: '' })
    setFormOpen(true)
  }

  function openEditSchool(school) {
    setEditingSchool(school)
    setForm({
      name: school.name,
      email: school.email || '',
      educationLevel: school.educationLevel,
      targetPupils: String(school.targetPupils),
      address: school.address || '',
    })
    setFormOpen(true)
  }

  async function deleteSchool(school) {
    if (!window.confirm(`Hapus ${school.name}? Data jadwal distribusi, klaim, dan keanggotaan menu sekolah ini juga akan dihapus.`)) return
    setDeletingId(school.id)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest(`/api/admin/schools/${school.id}`, { method: 'DELETE' })
      setNotice(result.message)
      await loadSchools()
    } catch (requestError) {
      setError(requestError.message || 'Sekolah gagal dihapus.')
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

  async function resendInvitation(school) {
    setSendingId(school.id)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest(`/api/admin/schools/${school.id}/invite`, { method: 'POST' })
      setNotice(result.message)
      await loadSchools()
    } catch (requestError) {
      setError(requestError.message || 'Undangan akun gagal dibuat.')
    } finally {
      setSendingId(null)
    }
  }

  const activeCount = schools.filter((school) => school.isActive).length
  const activeAccounts = schools.filter((school) => school.accountStatus === 'ACTIVE').length
  const pendingAccounts = schools.filter((school) => school.accountStatus === 'PENDING').length

  return (
    <main className="dashboard-content management-page">
      <div className="page-heading">
        <div>
          <p className="breadcrumb">Admin <span>/</span> Sekolah penerima MBG</p>
          <p className="eyebrow"><span className="eyebrow-line" /> Pengelolaan penerima manfaat</p>
          <h1>Sekolah penerima MBG</h1>
          <p className="page-description">Atur sekolah, target porsi harian, dan akun sekolah untuk memantau penerimaan MBG.</p>
        </div>
        <button className="button-primary page-action-button" type="button" onClick={openNewSchool}>
          <Plus size={16} /> Tambah sekolah
        </button>
      </div>

      <div className={`email-setup-banner${emailConfigured ? ' email-setup-ready' : ''}`}>
        <span className="email-setup-icon"><Mail size={18} /></span>
        <div>
          <strong>{emailConfigured ? 'Pengiriman kredensial Gmail siap diuji.' : 'Kredensial akun sekolah dikirim melalui email.'}</strong>
          <p>{emailConfigured
            ? 'Uji koneksi Gmail. Setelah terverifikasi, email kredensial sekolah yang menunggu akan dikirim.'
            : 'SMTP Gmail belum aktif. Isi App Password di backend/.env dan mulai ulang backend. Jangan bagikan App Password melalui chat.'}</p>
        </div>
        <button className="email-test-button" type="button" onClick={testEmailConnection} disabled={testingEmail}>
          {testingEmail ? <><LoaderCircle size={14} className="refresh-spinning" /> Menguji...</> : <><Send size={14} /> {emailConfigured ? 'Uji & kirim kredensial' : 'Periksa SMTP'}</>}
        </button>
      </div>

      {!emailConfigured && (
        <span className="sr-only">Konfigurasi SMTP belum aktif</span>
      )}

      {notice && <div className="inline-notice success-notice" role="status"><Check size={16} /> {notice}</div>}
      {error && <div className="inline-notice error-notice" role="alert"><CircleAlert size={16} /> {error}<button type="button" onClick={loadSchools} aria-label="Muat ulang sekolah"><RefreshCw size={14} /></button></div>}

      <section className="school-summary-grid" aria-label="Ringkasan sekolah">
        <SummaryCard icon={<School size={18} />} label="Sekolah terdaftar" value={activeCount} note="sekolah aktif sebagai penerima MBG" />
        <SummaryCard icon={<UserRoundPlus size={18} />} label="Akun aktif" value={activeAccounts} note="sekolah sudah mengaktifkan akun" />
        <SummaryCard icon={<Mail size={18} />} label="Belum login" value={pendingAccounts} note="akun menunggu login pertama" />
      </section>

      <section className="panel school-list-panel">
        <div className="panel-heading school-list-heading">
          <div>
            <h2>Daftar sekolah penerima</h2>
            <p>Informasi penerima, target porsi, dan status akun</p>
          </div>
          <span className="school-total"><Building2 size={14} /> {activeCount} sekolah aktif</span>
        </div>
        <div className="school-list">
          {loading && !schools.length ? (
            <div className="management-empty"><LoaderCircle size={18} className="refresh-spinning" /> Memuat data sekolah...</div>
          ) : schools.length ? schools.map((school) => (
            <article className="school-row" key={school.id}>
              <span className="school-row-icon"><School size={19} /></span>
              <div className="school-row-main">
                <strong>{school.name}</strong>
                <span className="school-row-meta">
                  {LEVELS.find((level) => level.value === school.educationLevel)?.value || school.educationLevel}
                  <span>·</span>
                  {school.targetPupils.toLocaleString('id-ID')} porsi / hari
                </span>
                {school.email && <span className="school-row-email"><Mail size={12} /> {school.email}</span>}
              </div>
              <span className={`account-status-badge account-${school.accountStatus.toLowerCase()}`}>
                <span />
                {school.accountStatus === 'ACTIVE' ? 'Sekolah sudah mengaktifkan akun' : school.accountStatus === 'PENDING' ? (
                  school.invitationEmailStatus === 'SENT'
                    ? 'Email terkirim · menunggu login'
                    : school.invitationEmailStatus === 'FAILED'
                      ? 'Pengiriman gagal · kirim ulang'
                      : 'Menunggu email kredensial'
                ) : 'Belum ada akun'}
              </span>
              {school.accountStatus === 'PENDING' && (
                <button
                  className="button-secondary invite-button"
                  type="button"
                  disabled={sendingId === school.id}
                  onClick={() => resendInvitation(school)}
                >
                  <Send size={14} /> {sendingId === school.id ? 'Menyiapkan...' : 'Kirim ulang kredensial'}
                </button>
              )}
              {school.accountStatus === 'ACTIVE' && <span className="account-verified"><Check size={15} /> Login pertama berhasil</span>}
              <div className="school-row-actions">
                <button className="school-icon-action" type="button" onClick={() => openEditSchool(school)} aria-label={`Edit ${school.name}`} title="Edit sekolah"><Pencil size={15} /></button>
                <button className="school-icon-action school-delete-action" type="button" disabled={deletingId === school.id} onClick={() => deleteSchool(school)} aria-label={`Hapus ${school.name}`} title="Hapus sekolah">
                  {deletingId === school.id ? <LoaderCircle size={15} className="refresh-spinning" /> : <Trash2 size={15} />}
                </button>
              </div>
            </article>
          )) : (
            <div className="management-empty"><Users size={22} /> Belum ada sekolah yang terdaftar.</div>
          )}
        </div>
        <div className="school-list-footer">
          <span>Kelola menu dan porsi MBG penerima melalui menu gizi.</span>
          <Link to="/nutrition">Atur menu &amp; gizi <ArrowRight size={14} /></Link>
        </div>
      </section>

      {formOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false) }}>
          <section className="detail-modal school-modal" role="dialog" aria-modal="true" aria-labelledby="new-school-title">
            <div className="modal-heading">
              <div><p className="eyebrow">Penerima program MBG</p><h2 id="new-school-title">{editingSchool ? 'Edit sekolah' : 'Tambah sekolah'}</h2></div>
              <button className="icon-button" type="button" aria-label="Tutup formulir" onClick={() => { setFormOpen(false); setEditingSchool(null) }}><X size={19} /></button>
            </div>
            <p className="school-modal-description">{editingSchool ? editingSchool.email !== form.email && editingSchool.accountStatus === 'ACTIVE' ? 'Mengubah email akan menonaktifkan akun sampai sekolah masuk kembali menggunakan kredensial baru yang dikirim ke email tersebut.' : 'Perbarui identitas sekolah dan target porsi MBG.' : 'Kredensial login akan dikirim ke email sekolah. Password awal sama dengan nama sekolah; sekolah dapat menggantinya setelah login.'}</p>
            <form className="school-form" onSubmit={handleSubmit}>
              <label className="form-label" htmlFor="school-name">Nama sekolah</label>
              <input className="management-input" id="school-name" required maxLength={160} placeholder="Contoh: SDN 01 Batam Center" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />

              <label className="form-label" htmlFor="school-email">Email resmi sekolah</label>
              <input className="management-input" id="school-email" type="email" required maxLength={254} placeholder="sekolah@example.sch.id" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              <p className="school-form-help"><Mail size={13} /> {editingSchool ? 'Perubahan email memerlukan aktivasi akun yang baru.' : 'Undangan akun akan dikirim ke alamat email ini saat SMTP aktif.'}</p>

              <div className="school-form-grid">
                <div><label className="form-label" htmlFor="school-level">Jenjang pendidikan</label>
                  <select className="management-input" id="school-level" value={form.educationLevel} onChange={(event) => setForm({ ...form, educationLevel: event.target.value })}>
                    {LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
                  </select>
                </div>
                <div><label className="form-label" htmlFor="school-target">Target porsi / hari</label>
                  <input className="management-input" id="school-target" type="number" min="1" max="100000" required placeholder="Contoh: 250" value={form.targetPupils} onChange={(event) => setForm({ ...form, targetPupils: event.target.value })} />
                </div>
              </div>

              <label className="form-label" htmlFor="school-address">Alamat sekolah <span className="optional-label">Opsional</span></label>
              <textarea className="management-input school-address-input" id="school-address" rows="2" maxLength={500} placeholder="Kecamatan, kota, dan alamat lengkap" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
              <button className="button-primary school-submit-button" type="submit" disabled={saving}>
                {saving ? <><LoaderCircle size={16} className="refresh-spinning" /> Menyimpan...</> : editingSchool ? <><Check size={16} /> Simpan perubahan</> : <><Plus size={16} /> Simpan sekolah &amp; siapkan akun</>}
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

export default SchoolManagementPage
