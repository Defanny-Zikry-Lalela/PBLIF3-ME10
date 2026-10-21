import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock3,
  LogOut,
  MapPin,
  PackageCheck,
  QrCode,
  Route,
  School,
  Truck,
} from 'lucide-react'
import { apiRequest } from '../lib/api.js'

const STATUS_LABELS = {
  PREPARING: 'Menunggu keberangkatan',
  IN_TRANSIT: 'Dalam perjalanan',
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
  const [arrivedIds, setArrivedIds] = useState([])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')

    apiRequest('/api/courier/dashboard', {
      tokenType: 'driver',
      signal: controller.signal,
    })
      .then(({ deliveries: assigned }) => {
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

  const selectedDelivery = deliveries.find((delivery) => delivery.id === selectedId)
  const activeDeliveries = deliveries.filter((delivery) => delivery.status !== 'COMPLETED')
  const totalPortions = activeDeliveries.reduce((total, delivery) => total + delivery.portions, 0)

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

  function confirmArrival(delivery) {
    setArrivedIds((currentIds) => (
      currentIds.includes(delivery.id) ? currentIds : [...currentIds, delivery.id]
    ))
    setNotice('Konfirmasi tiba dicatat pada tampilan ini. Status pengiriman di server tidak berubah.')
    setError('')
  }

  function submitIssue(event) {
    event.preventDefault()
    if (!selectedDelivery) return
    updateDelivery(selectedDelivery, 'ALERT', issueNote.trim())
  }

  async function submitHandover(event) {
    event.preventDefault()
    if (!selectedDelivery || !/^\d{4}$/.test(pin)) return
    if (await updateDelivery(selectedDelivery, 'COMPLETED')) setPin('')
  }

  return (
    <div className="courier-dashboard-shell">
      <header className="school-portal-topbar courier-dashboard-topbar">
        <a className="school-portal-brand" href="/courier/dashboard">
          <span><PackageCheck size={19} /></span>
          <span><strong>NutriTrack <b>MBG</b></strong><small>PORTAL KURIR</small></span>
        </a>
        <div className="courier-profile">
          <span className="school-user-avatar">{driver.name.trim().charAt(0).toUpperCase()}</span>
          <span><strong>{driver.name}</strong><small>Kurir MBG</small></span>
          <button type="button" onClick={onLogout}><LogOut size={14} /> Keluar</button>
        </div>
      </header>

      <main className="courier-dashboard-content">
        <div className="courier-dashboard-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-line" /> Operasional distribusi</p>
            <h1>Dashboard kurir</h1>
            <p className="page-description">Kelola rute dan serah terima penugasan MBG Anda.</p>
          </div>
          <div className="courier-manifest-total">
            <PackageCheck size={19} />
            <span><strong>{totalPortions.toLocaleString('id-ID')}</strong><small>porsi dibawa</small></span>
          </div>
        </div>

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

        {loading ? (
          <div className="panel courier-dashboard-empty">Memuat penugasan...</div>
        ) : activeTab === 'assignments' ? (
          <section className="courier-tab-content" aria-label="Penugasan kurir">
            <div className="courier-welcome-panel">
              <span className="courier-welcome-icon"><Truck size={22} /></span>
              <div>
                <p>Selamat bertugas,</p>
                <h2>{driver.name}</h2>
              </div>
              <div className="courier-welcome-portions">
                <strong>{totalPortions.toLocaleString('id-ID')}</strong>
                <span>total porsi</span>
              </div>
            </div>

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
          </section>
        ) : selectedDelivery ? (
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
                  <span><small>Estimasi waktu tiba (ETA)</small><strong>Belum tersedia dari server</strong></span>
                </div>
                <div className="courier-action-stack">
                  {selectedDelivery.status === 'PREPARING' && (
                    <button className="button-primary" type="button" disabled={saving} onClick={() => updateDelivery(selectedDelivery, 'IN_TRANSIT')}>
                      <Truck size={16} /> Tandai mulai perjalanan
                    </button>
                  )}
                  {selectedDelivery.status === 'IN_TRANSIT' && (
                    <button className="button-primary" type="button" onClick={() => confirmArrival(selectedDelivery)}>
                      <Check size={16} /> {arrivedIds.includes(selectedDelivery.id) ? 'Tiba dikonfirmasi' : 'Konfirmasi Tiba di Lokasi'}
                    </button>
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
                <div><p className="courier-card-overline">Serah terima ke sekolah</p><h2>{selectedDelivery.school}</h2></div>
                <span className="courier-destination-icon"><PackageCheck size={20} /></span>
              </div>
              <div className="courier-handover-grid">
                <div className="courier-qr-area">
                  <QrCode size={54} strokeWidth={1.4} />
                  <strong>Kode QR belum tersedia</strong>
                  <span>ID manifest: {selectedDelivery.id}</span>
                  <small>Server belum menyediakan QR untuk manifest ini.</small>
                </div>
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
                    <div><dt>Sekolah tujuan</dt><dd>{selectedDelivery.school}</dd></div>
                    <div><dt>Jumlah porsi manifest</dt><dd>{selectedDelivery.portions.toLocaleString('id-ID')} porsi</dd></div>
                    <div><dt>Status</dt><dd>{STATUS_LABELS[selectedDelivery.status] || selectedDelivery.status}</dd></div>
                  </dl>
                  <button
                    className="button-primary"
                    type="submit"
                    disabled={saving || !/^\d{4}$/.test(pin) || !['IN_TRANSIT', 'ALERT'].includes(selectedDelivery.status)}
                  >
                    <Check size={16} /> Konfirmasi Serah Terima Selesai
                  </button>
                  <small className="courier-handover-note">PIN diperiksa formatnya di halaman ini; server saat ini belum memvalidasi PIN atau kode QR.</small>
                </form>
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
    </div>
  )
}

export default CourierDashboard
