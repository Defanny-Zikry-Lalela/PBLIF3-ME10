import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CircleHelp,
  Clock3,
  KeyRound,
  LockKeyhole,
  LogOut,
  MapPin,
  PackageCheck,
  Route,
  School,
  Truck,
  X,
} from 'lucide-react'
import { apiRequest } from '../lib/api.js'
import useBodyScrollLock from '../hooks/useBodyScrollLock.js'

const STATUS_LABELS = {
  PREPARING: 'Menunggu keberangkatan',
  IN_TRANSIT: 'Dalam perjalanan',
  ARRIVED: 'Tiba di lokasi',
  COMPLETED: 'Selesai diterima',
  ALERT: 'Perlu perhatian admin',
}

const TABS = [
  { id: 'assignments', label: 'Penugasan' },
  { id: 'navigation', label: 'Navigasi' },
  { id: 'handover', label: 'Serah Terima' },
]

function CourierDashboard({ driver, onLogout }) {
  const [deliveries, setDeliveries] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [activeTab, setActiveTab] = useState('assignments')
  const [pin, setPin] = useState('')
  const [issueNote, setIssueNote] = useState('')
  const [reportingIssue, setReportingIssue] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordNotice, setPasswordNotice] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  useBodyScrollLock(passwordDialogOpen)

  useEffect(() => {
    const dateTimer = setInterval(() => setCurrentDate(new Date()), 60_000)
    return () => clearInterval(dateTimer)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')

    apiRequest('/api/courier/dashboard', {
      tokenType: 'driver',
      signal: controller.signal,
    })
      .then(({ deliveries: assigned }) => {
        setError('')
        setDeliveries(assigned)
        setSelectedId((currentId) => (
          assigned.some((delivery) => delivery.id === currentId)
            ? currentId
            : assigned.find((delivery) => delivery.status !== 'COMPLETED')?.id || ''
        ))
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || 'Daftar penugasan gagal dimuat.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      apiRequest('/api/courier/dashboard', { tokenType: 'driver' })
        .then(({ deliveries: assigned }) => {
          setDeliveries(assigned)
          setSelectedId((currentId) => (
            assigned.some((delivery) => delivery.id === currentId && delivery.status !== 'COMPLETED')
              ? currentId
              : assigned.find((delivery) => delivery.status !== 'COMPLETED')?.id || ''
          ))
        })
        .catch((requestError) => {
          setError(requestError.message || 'Daftar penugasan gagal dimuat.')
        })
    }, 10_000)
    return () => window.clearInterval(timer)
  }, [])

  const selectedDelivery = deliveries.find((delivery) => delivery.id === selectedId)
  const activeDelivery = selectedDelivery?.status !== 'COMPLETED' ? selectedDelivery : null
  const activeDeliveries = deliveries.filter((delivery) => delivery.status !== 'COMPLETED')
  const totalPortions = activeDeliveries.reduce((total, delivery) => total + delivery.portions, 0)
  const taskStatus = deliveries.some((delivery) => delivery.status === 'ALERT')
    ? 'Perlu perhatian'
    : activeDeliveries.length
      ? 'Sedang berjalan'
      : 'Tidak ada tugas'
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(currentDate)

  async function updateDelivery(delivery, status, note) {
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const result = await apiRequest(`/api/courier/deliveries/${delivery.id}`, {
        method: 'PATCH',
        tokenType: 'driver',
        body: JSON.stringify({ status, ...(note ? { note } : {}) }),
      })
      setNotice(result.message)
      setIssueNote('')
      setReportingIssue(false)
      const refreshed = await apiRequest('/api/courier/dashboard', { tokenType: 'driver' })
      setDeliveries(refreshed.deliveries)
      return true
    } catch (requestError) {
      setError(requestError.message || 'Pembaruan pengiriman gagal disimpan.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function confirmArrival(delivery) {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest(`/api/courier/deliveries/${delivery.id}/arrival`, {
        method: 'POST',
        tokenType: 'driver',
      })
      setDeliveries((currentDeliveries) => currentDeliveries.map((currentDelivery) => (
        currentDelivery.id === delivery.id
          ? { ...currentDelivery, status: result.status, arrivedAt: result.arrivedAt }
          : currentDelivery
      )))
      setNotice(result.message)
    } catch (requestError) {
      setError(requestError.message || 'Konfirmasi tiba gagal disimpan.')
    } finally {
      setSaving(false)
    }
  }

  function submitIssue(event) {
    event.preventDefault()
    if (!selectedDelivery) return
    updateDelivery(selectedDelivery, 'ALERT', issueNote.trim())
  }

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
      const result = await apiRequest('/api/courier/password', {
        method: 'PATCH',
        tokenType: 'driver',
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

  async function submitHandover(event) {
    event.preventDefault()
    if (!activeDelivery || !/^\d{4}$/.test(pin)) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest(`/api/courier/deliveries/${activeDelivery.id}/handover`, {
        method: 'POST',
        tokenType: 'driver',
        body: JSON.stringify({ pin }),
      })
      setNotice(result.message)
      setPin('')
      const refreshed = await apiRequest('/api/courier/dashboard', { tokenType: 'driver' })
      setDeliveries(refreshed.deliveries)
    } catch (requestError) {
      setError(requestError.message || 'Serah terima gagal dikonfirmasi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="courier-dashboard-shell">
      <header className="courier-dashboard-topbar">
        <div className="courier-dashboard-topbar-inner">
          <a className="school-portal-brand" href="/courier/dashboard">
            <span><PackageCheck size={19} /></span>
            <span><strong>NutriTrack <b>MBG</b></strong><small>PORTAL KURIR</small></span>
          </a>
          <div className="courier-profile">
            <span className="school-user-avatar">{driver.name.trim().charAt(0).toUpperCase()}</span>
            <span><strong>{driver.name}</strong><small>Kurir MBG</small></span>
            <button className="courier-password-button" type="button" aria-label="Ubah password" onClick={() => { setPasswordError(''); setPasswordNotice(''); setPasswordDialogOpen(true) }}><KeyRound size={14} /><span>Ubah password</span></button>
            <button className="courier-logout-button" type="button" onClick={onLogout}><LogOut size={14} /><span>Keluar</span></button>
          </div>
        </div>
      </header>

      <main className="courier-dashboard-content">
        <div className="courier-dashboard-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-line" /> Operasional distribusi</p>
            <h1>Dashboard kurir</h1>
            <p className="page-description">Kelola rute dan serah terima penugasan MBG Anda.</p>
          </div>
          <div className="date-badge courier-date-badge"><CalendarDays size={15} />{dateLabel}</div>
        </div>

        <section className="courier-dashboard-metrics" aria-label="Ringkasan tugas kurir">
          <CourierMetric
            icon={<PackageCheck size={17} />}
            label="Porsi dibawa"
            value={loading ? '…' : totalPortions.toLocaleString('id-ID')}
            note="Total porsi pengiriman aktif"
          />
          <CourierMetric
            icon={<School size={17} />}
            label="Sekolah tujuan"
            value={loading ? '…' : activeDeliveries.length.toLocaleString('id-ID')}
            note="Pengiriman belum selesai"
          />
          <CourierMetric
            icon={<Route size={17} />}
            label="Status tugas"
            value={loading ? '…' : taskStatus}
            note={`${activeDeliveries.length} pengiriman belum selesai`}
          />
        </section>

        <nav className="courier-dashboard-tabs" aria-label="Navigasi dashboard kurir">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'active' : ''}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {notice && <div className="inline-notice success-notice" role="status"><Check size={16} />{notice}</div>}
        {error && <div className="inline-notice error-notice" role="alert">{error}</div>}
        {passwordNotice && <div className="inline-notice success-notice" role="status"><Check size={16} />{passwordNotice}</div>}

        {loading ? (
          <div className="panel courier-dashboard-empty">Memuat penugasan...</div>
        ) : activeTab === 'assignments' ? (
          <section className="courier-tab-content" aria-label="Penugasan kurir">
            <div className="courier-assignment-grid">
              <section className="panel courier-route-panel">
                <div className="courier-section-heading">
                  <div><h2>Rute pengiriman</h2><p>{activeDeliveries.length} sekolah tujuan</p></div>
                  <Route size={20} />
                </div>
                {deliveries.length ? (
                  <ol className="courier-route-list">
                    {deliveries.map((delivery, index) => (
                      <li key={delivery.id} className={delivery.status === 'COMPLETED' ? 'completed' : ''}>
                        <span className="courier-route-number">{index + 1}</span>
                        <div className="courier-route-details">
                          <strong>{delivery.school}</strong>
                          <span><MapPin size={13} />{delivery.address || 'Alamat belum tersedia'}</span>
                          <span><PackageCheck size={13} />{delivery.portions.toLocaleString('id-ID')} porsi</span>
                        </div>
                        <span className={`return-status return-status-${delivery.status === 'COMPLETED' ? 'approved' : delivery.status === 'ALERT' ? 'rejected' : 'pending'}`}>
                          {STATUS_LABELS[delivery.status] || delivery.status}
                        </span>
                        <button
                          type="button"
                          className="courier-route-open"
                          onClick={() => { setSelectedId(delivery.id); setActiveTab('navigation') }}
                        >
                          <span className="sr-only">Buka navigasi ke {delivery.school}</span>
                          <ArrowRight size={17} />
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="courier-dashboard-empty">
                    <School size={24} />
                    <h3>Belum ada penugasan</h3>
                    <p>Rute sekolah akan muncul setelah admin menetapkan pengiriman kepada Anda.</p>
                  </div>
                )}
              </section>

              <aside className="panel courier-guide-panel">
                <div className="courier-guide-heading">
                  <span><CircleHelp size={18} /></span>
                  <div><h2>Panduan operasional</h2><p>Langkah aman selama pengiriman</p></div>
                </div>
                {[
                  ['1', 'Periksa penugasan', 'Pastikan sekolah tujuan dan jumlah porsi sesuai manifest.'],
                  ['2', 'Jaga kondisi makanan', 'Bawa makanan dengan aman dan jaga kebersihan selama perjalanan.'],
                  ['3', 'Perbarui status rute', 'Tandai mulai perjalanan dan konfirmasi tiba saat sampai di sekolah.'],
                  ['4', 'Selesaikan serah terima', 'Serahkan makanan kepada petugas sekolah dan laporkan kendala kepada admin.'],
                ].map(([number, title, description]) => (
                  <article className="courier-guide-step" key={number}>
                    <span>{number}</span>
                    <div><strong>{title}</strong><p>{description}</p></div>
                  </article>
                ))}
                <div className="courier-guide-notice">
                  <Check size={14} />
                  <p>Jika terjadi kendala, gunakan menu Navigasi untuk melaporkannya kepada admin.</p>
                </div>
              </aside>
            </div>
          </section>
        ) : activeDelivery ? (
          activeTab === 'navigation' ? (
            <section className="courier-tab-content courier-operation-grid" aria-label="Navigasi pengiriman">
              <article className="panel courier-destination-card">
                <div className="courier-section-heading">
                  <div><p className="courier-card-overline">Tujuan berikutnya</p><h2>{selectedDelivery.school}</h2></div>
                  <span className="courier-destination-icon"><MapPin size={20} /></span>
                </div>
                <p className="courier-destination-address">{selectedDelivery.address || 'Alamat belum tersedia'}</p>
                <div className="courier-arrival-estimate">
                  <Clock3 size={18} />
                  <span>
                    <small>{selectedDelivery.arrivedAt ? 'Tiba tercatat di server' : 'Estimasi waktu tiba (ETA)'}</small>
                    <strong>{selectedDelivery.arrivedAt
                      ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selectedDelivery.arrivedAt))
                      : 'Belum tersedia dari server'}</strong>
                  </span>
                </div>
                <div className="courier-action-stack">
                  {selectedDelivery.status === 'PREPARING' && (
                    <button className="button-primary" type="button" disabled={saving} onClick={() => updateDelivery(selectedDelivery, 'IN_TRANSIT')}>
                      <Truck size={16} /> Tandai mulai perjalanan
                    </button>
                  )}
                  {selectedDelivery.status === 'IN_TRANSIT' && (
                    <button className="button-primary" type="button" disabled={saving} onClick={() => confirmArrival(selectedDelivery)}>
                      <Check size={16} /> {saving ? 'Mencatat tiba...' : selectedDelivery.arrivedAt ? 'Sinkronkan status tiba' : 'Konfirmasi Tiba di Lokasi'}
                    </button>
                  )}
                  {selectedDelivery.status === 'ARRIVED' && (
                    <span className="courier-arrival-recorded"><Check size={16} /> Tiba di lokasi tercatat</span>
                  )}
                  {selectedDelivery.status === 'ALERT' && (
                    <button className="button-primary" type="button" disabled={saving} onClick={() => updateDelivery(selectedDelivery, 'IN_TRANSIT')}>
                      <Truck size={16} /> Lanjutkan perjalanan
                    </button>
                  )}
                  {selectedDelivery.status === 'IN_TRANSIT' && (
                    <button className="button-secondary courier-issue-toggle" type="button" onClick={() => setReportingIssue((visible) => !visible)}>
                      <AlertTriangle size={16} /> Laporkan Kendala
                    </button>
                  )}
                </div>
                {reportingIssue && (
                  <form className="courier-issue-form" onSubmit={submitIssue}>
                    <label htmlFor="courier-issue-note">Jelaskan kendala (minimal 5 karakter)</label>
                    <textarea id="courier-issue-note" value={issueNote} onChange={(event) => setIssueNote(event.target.value)} minLength={5} maxLength={500} required />
                    <button className="button-primary" type="submit" disabled={saving || issueNote.trim().length < 5}>
                      Kirim laporan
                    </button>
                  </form>
                )}
              </article>
              <aside className="panel courier-stop-summary">
                <span><PackageCheck size={19} /></span>
                <small>Porsi untuk sekolah ini</small>
                <strong>{selectedDelivery.portions.toLocaleString('id-ID')}</strong>
                <span>porsi manifest</span>
                <p><Clock3 size={14} /> {selectedDelivery.departureTime || 'Belum berangkat'}</p>
              </aside>
            </section>
          ) : (
            <section className="courier-tab-content panel courier-handover-panel" aria-label="Serah terima pengiriman">
              <div className="courier-section-heading">
                <div><p className="courier-card-overline">Serah terima ke sekolah</p><h2>{activeDelivery.school}</h2></div>
                <span className="courier-destination-icon"><PackageCheck size={20} /></span>
              </div>
              <div className="courier-handover-grid">
                <div className="courier-qr-area">
                  <PackageCheck size={54} strokeWidth={1.4} />
                  <strong>{activeDelivery.qcStatus === 'QC_APPROVED'
                    ? 'QC sekolah disetujui'
                    : activeDelivery.qcStatus === 'QC_REJECTED'
                      ? 'QC sekolah perlu tindak lanjut'
                      : 'Menunggu konfirmasi QC sekolah'}</strong>
                  <span>ID manifest: {activeDelivery.id}</span>
                  <small>{activeDelivery.qcStatus === 'QC_APPROVED'
                    ? 'Minta PIN 4 digit kepada petugas sekolah.'
                    : 'Form PIN akan tersedia setelah sekolah menyetujui kondisi makanan.'}</small>
                </div>
                {activeDelivery.qcStatus === 'QC_APPROVED' ? (
                <form className="courier-handover-form" onSubmit={submitHandover}>
                  <label htmlFor="handover-pin">PIN serah terima (4 digit)</label>
                  <input
                    id="handover-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                  />
                  <dl className="courier-manifest-details">
                    <div><dt>Sekolah tujuan</dt><dd>{activeDelivery.school}</dd></div>
                    <div><dt>Jumlah porsi manifest</dt><dd>{activeDelivery.portions.toLocaleString('id-ID')} porsi</dd></div>
                    <div><dt>Status</dt><dd>{STATUS_LABELS[activeDelivery.status] || activeDelivery.status}</dd></div>
                  </dl>
                  <button
                    className="button-primary"
                    type="submit"
                    disabled={saving || !/^\d{4}$/.test(pin) || !['IN_TRANSIT', 'ARRIVED'].includes(activeDelivery.status)}
                  >
                    <Check size={16} />{saving ? 'Memverifikasi…' : 'Konfirmasi Serah Terima Selesai'}
                  </button>
                  <small className="courier-handover-note">PIN diverifikasi terhadap kode unik yang diterbitkan server setelah QC sekolah disetujui.</small>
                </form>
                ) : (
                  <div className="courier-handover-form courier-handover-note" role="status">
                    Serah terima belum dapat diselesaikan. Minta petugas sekolah melakukan pemeriksaan dan konfirmasi QC terlebih dahulu.
                  </div>
                )}
              </div>
            </section>
          )
        ) : (
          <div className="panel courier-dashboard-empty">
            <PackageCheck size={24} />
            <h2>Tidak ada pengiriman yang perlu diproses</h2>
            <p>Pengiriman yang sudah selesai dapat dilihat pada tab Penugasan.</p>
          </div>
        )}
        <footer className="school-portal-footer">NutriTrack MBG <span>·</span> Program Makanan Bergizi Gratis</footer>
      </main>
      {passwordDialogOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPasswordDialogOpen(false) }}>
          <section className="detail-modal school-modal" role="dialog" aria-modal="true" aria-labelledby="courier-password-title">
            <div className="modal-heading">
              <div><p className="eyebrow">Keamanan akun kurir</p><h2 id="courier-password-title">Ubah password</h2></div>
              <button className="icon-button" type="button" aria-label="Tutup ubah password" onClick={() => setPasswordDialogOpen(false)}><X size={19} /></button>
            </div>
            <p className="school-modal-description">Gunakan password baru minimal 12 karakter.</p>
            {passwordError && <div className="inline-notice error-notice" role="alert">{passwordError}</div>}
            <form className="school-form" onSubmit={changePassword}>
              <label className="form-label" htmlFor="courier-current-password">Password saat ini</label>
              <input className="management-input" id="courier-current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
              <label className="form-label" htmlFor="courier-new-password">Password baru</label>
              <input className="management-input" id="courier-new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              <label className="form-label" htmlFor="courier-confirm-password">Ulangi password baru</label>
              <input className="management-input" id="courier-confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
              <button className="button-primary activation-submit" type="submit" disabled={savingPassword}>{savingPassword ? 'Menyimpan...' : <>Simpan password <LockKeyhole size={15} /></>}</button>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

function CourierMetric({ icon, label, value, note }) {
  return (
    <article className="courier-dashboard-metric">
      <div className="courier-dashboard-metric-heading">
        <span>{label}</span>
        <span className="courier-dashboard-metric-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  )
}

export default CourierDashboard
