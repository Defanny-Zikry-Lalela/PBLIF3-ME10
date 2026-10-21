import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Check, LoaderCircle, LogOut, PackageCheck, RefreshCw, Truck } from 'lucide-react'
import { apiRequest } from '../lib/api.js'

const STATUS_LABELS = {
  PREPARING: 'Menunggu keberangkatan',
  IN_TRANSIT: 'Dalam perjalanan',
  COMPLETED: 'Selesai diterima',
  ALERT: 'Perlu perhatian admin',
}

function formatDate(value) {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value))
}

function CourierPortal({ driver, onLogout }) {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadDeliveries = useCallback(async () => {
    setError('')
    try {
      const result = await apiRequest('/api/courier/dashboard', { tokenType: 'driver' })
      setDeliveries(result.deliveries)
    } catch (requestError) {
      setError(requestError.message || 'Daftar pengiriman gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDeliveries() }, [loadDeliveries, refreshKey])

  async function updateDelivery(delivery, status) {
    setSavingId(delivery.id)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest(`/api/courier/deliveries/${delivery.id}`, {
        method: 'PATCH',
        tokenType: 'driver',
        body: JSON.stringify({ status }),
      })
      setNotice(result.message)
      await loadDeliveries()
    } catch (requestError) {
      setError(requestError.message || 'Status pengiriman gagal diperbarui.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="courier-portal-shell">
      <header className="school-portal-topbar courier-topbar">
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
      <main className="courier-content">
        <div className="page-heading">
          <div>
            <p className="breadcrumb">Kurir <span>/</span> Pengiriman</p>
            <p className="eyebrow"><span className="eyebrow-line" /> Operasional distribusi</p>
            <h1>Pengiriman saya</h1>
            <p className="page-description">Perbarui status distribusi MBG untuk sekolah yang ditugaskan kepada Anda.</p>
          </div>
          <button className="button-secondary" type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}><RefreshCw size={14} /> Perbarui</button>
        </div>
        {notice && <div className="inline-notice success-notice" role="status"><Check size={16} />{notice}</div>}
        {error && <div className="inline-notice error-notice" role="alert">{error}<button type="button" onClick={() => setRefreshKey((key) => key + 1)}>Coba lagi</button></div>}
        <section className="courier-deliveries" aria-label="Daftar pengiriman kurir">
          {loading && !deliveries.length ? (
            <div className="management-empty"><LoaderCircle size={18} className="refresh-spinning" /> Memuat pengiriman...</div>
          ) : deliveries.length ? deliveries.map((delivery) => (
            <article className="panel courier-delivery-card" key={delivery.id}>
              <div className="courier-delivery-header">
                <span className="courier-delivery-icon"><Truck size={19} /></span>
                <div><h2>{delivery.school}</h2><p><CalendarDays size={13} /> {formatDate(delivery.date)}</p></div>
                <span className={`return-status return-status-${delivery.status === 'COMPLETED' ? 'approved' : delivery.status === 'ALERT' ? 'rejected' : 'pending'}`}>{STATUS_LABELS[delivery.status] || delivery.status}</span>
              </div>
              <dl className="school-delivery-details">
                <div><dt>Jumlah porsi</dt><dd>{delivery.portions.toLocaleString('id-ID')} porsi</dd></div>
                <div><dt>Alamat</dt><dd>{delivery.address || 'Alamat belum tersedia'}</dd></div>
                <div><dt>Berangkat</dt><dd>{delivery.departureTime || 'Belum berangkat'}</dd></div>
                <div><dt>Diterima</dt><dd>{delivery.receivedAt || 'Belum diterima'}</dd></div>
              </dl>
              {delivery.statusNote && <p className="courier-delivery-note">{delivery.statusNote}</p>}
              {delivery.status === 'PREPARING' && (
                <button className="button-primary" type="button" disabled={savingId === delivery.id} onClick={() => updateDelivery(delivery, 'IN_TRANSIT')}>
                  {savingId === delivery.id ? <LoaderCircle size={15} className="refresh-spinning" /> : <Truck size={15} />} Tandai berangkat
                </button>
              )}
              {delivery.status === 'IN_TRANSIT' && (
                <button className="button-primary" type="button" disabled={savingId === delivery.id} onClick={() => updateDelivery(delivery, 'COMPLETED')}>
                  {savingId === delivery.id ? <LoaderCircle size={15} className="refresh-spinning" /> : <Check size={15} />} Konfirmasi diterima sekolah
                </button>
              )}
              {delivery.status === 'ALERT' && (
                <button className="button-primary" type="button" disabled={savingId === delivery.id} onClick={() => updateDelivery(delivery, 'IN_TRANSIT')}>
                  {savingId === delivery.id ? <LoaderCircle size={15} className="refresh-spinning" /> : <Truck size={15} />} Lanjutkan perjalanan
                </button>
              )}
            </article>
          )) : (
            <div className="panel courier-empty">
              <span><Truck size={22} /></span>
              <h2>Belum ada pengiriman yang ditugaskan</h2>
              <p>Pengiriman akan muncul di sini setelah admin SPPG menetapkan Anda sebagai kurir.</p>
            </div>
          )}
        </section>
        <footer className="school-portal-footer">NutriTrack MBG <span>·</span> Program Makanan Bergizi Gratis</footer>
      </main>
    </div>
  )
}

export default CourierPortal
