import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Bell, CalendarDays, Check, CircleHelp, Clock3, ShieldCheck, Truck } from 'lucide-react'
import { apiRequest } from '../lib/api.js'
import SchoolNavbar from '../components/SchoolNavbar.jsx'

function SchoolPortal({ school, onLogout }) {
  return <SchoolDashboard school={school} onLogout={onLogout} />
}

const DELIVERY_LABELS = {
  PREPARING: 'Persiapan di dapur',
  IN_TRANSIT: 'Dalam perjalanan',
  ARRIVED: 'Tiba di lokasi',
  COMPLETED: 'Sudah diterima',
  ALERT: 'Perlu konfirmasi admin',
}

function SchoolDashboard({ school, onLogout }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    setError('')
    try {
      const result = await apiRequest('/api/school/dashboard', { tokenType: 'school' })
      setData(result)
    } catch (requestError) {
      setError(requestError.message || 'Data distribusi sekolah gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
    const timer = window.setInterval(loadDashboard, 10_000)
    return () => window.clearInterval(timer)
  }, [loadDashboard])

  const delivery = data?.delivery
  const dateLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const eta = delivery?.statusNote?.match(/(?:tiba|estimasi)\s+(?:tiba\s+)?(\d{1,2}[.:]\d{2})/i)?.[1]?.replace('.', ':')
  const departure = delivery?.departureTime?.replace('.', ':')
  const deliveryStatus = delivery ? DELIVERY_LABELS[delivery.status] || delivery.status : 'Belum dijadwalkan'

  return (
    <div className="school-portal-shell school-portal-shell-dashboard">
      <SchoolNavbar school={school} activePage="dashboard" onLogout={onLogout} />

      <main className="school-portal-content">
        <div className="school-portal-heading">
          <div>
            <p className="breadcrumb">Sekolah <span>/</span> Dashboard</p>
            <p className="eyebrow"><span className="eyebrow-line" /> Informasi penerimaan sekolah</p>
            <h1>Dashboard sekolah</h1>
            <p className="page-description">Pantau kedatangan makanan bergizi dan siapkan penerimaan untuk sekolah Anda.</p>
          </div>
          <div className="date-badge"><CalendarDays size={15} />{dateLabel}</div>
        </div>

        {error && <div className="inline-notice error-notice" role="alert"><Bell size={16} />{error}<button type="button" onClick={loadDashboard}>Muat ulang</button></div>}

        <section className="school-portal-metrics" aria-label="Informasi distribusi hari ini">
          <PortalMetric label="Porsi dijadwalkan" value={loading ? '…' : delivery ? delivery.portions.toLocaleString('id-ID') : '—'} note={delivery ? `Menu ${school.name}` : 'Belum ada jadwal untuk hari ini'} />
          <PortalMetric label="Perkiraan kedatangan" value={loading ? '…' : eta ? `${eta} WIB` : '—'} note={eta ? 'Estimasi dari pembaruan pengiriman' : 'Waktu diperbarui setelah kurir berangkat'} />
          <PortalMetric label="Kurir bertugas" value={loading ? '…' : delivery?.driver || '—'} note={delivery ? 'Penugasan dari SPPG' : 'Belum ada kurir yang ditugaskan'} />
        </section>

        <div className="school-portal-grid">
          <section className="panel school-delivery-panel">
            <div className="school-delivery-heading">
              <div><span className="school-delivery-icon"><Truck size={18} /></span><span><h2>Distribusi hari ini</h2><p>{school.name} <span>·</span> Jenjang {school.educationLevel}</p></span></div>
              <span className={`school-live-badge${delivery ? ` school-live-${delivery.status.toLowerCase()}` : ''}`}><span />{deliveryStatus}</span>
            </div>

            {delivery ? (
              <>
                <div className="school-manifest">
                  <div className="school-manifest-heading"><span><strong>Pengiriman MBG</strong><small>SPPG <ArrowRight size={12} /> {school.name}</small></span><span className="school-manifest-id">{delivery.id.slice(-10).toUpperCase()}</span></div>
                  <div className="delivery-timeline">
                    <div className={delivery.departureTime ? 'timeline-step timeline-step-done' : 'timeline-step'}><span /><strong>{departure ? `${departure} · Berangkat` : 'Menunggu keberangkatan'}</strong></div>
                    <div className={delivery.status === 'ARRIVED' || delivery.status === 'COMPLETED' ? 'timeline-step timeline-step-done' : delivery.status === 'IN_TRANSIT' ? 'timeline-step timeline-step-current' : 'timeline-step'}><span /><strong>{delivery.status === 'ARRIVED' ? 'Tiba di lokasi' : delivery.status === 'IN_TRANSIT' ? 'Dalam perjalanan' : delivery.status === 'COMPLETED' ? 'Perjalanan selesai' : 'Menunggu kurir'}</strong></div>
                    <div className={delivery.status === 'COMPLETED' ? 'timeline-step timeline-step-done' : delivery.status === 'ARRIVED' ? 'timeline-step timeline-step-current' : 'timeline-step'}><span /><strong>{delivery.status === 'ARRIVED' ? `Tiba ${delivery.arrivedAt ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(delivery.arrivedAt)) : 'di lokasi'} · Menunggu serah terima` : eta ? `${eta} · Estimasi tiba` : delivery.receivedAt ? `Diterima ${delivery.receivedAt}` : 'Estimasi belum tersedia'}</strong></div>
                  </div>
                  {delivery.status === 'ALERT' && <div className="school-delivery-alert"><Bell size={15} /><p>{delivery.statusNote || 'Silakan hubungi admin SPPG untuk informasi distribusi.'}</p></div>}
                </div>

                <dl className="school-delivery-details">
                  <div><dt>Jumlah porsi</dt><dd>{delivery.portions.toLocaleString('id-ID')} porsi</dd></div>
                  <div><dt>Status penerimaan</dt><dd>{deliveryStatus}</dd></div>
                  <div><dt>Menu hari ini</dt><dd>{data.menu?.name || 'Informasi menu belum tersedia'}</dd></div>
                  <div><dt>Penerimaan sekolah</dt><dd>{delivery.schoolReceivedAt
                    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(delivery.schoolReceivedAt))
                    : delivery.receivedAt || 'Menunggu penerimaan'}</dd></div>
                </dl>

                {data.menu?.ingredients?.length > 0 && <p className="school-menu-ingredients">Menu hari ini: {data.menu.ingredients.join(', ')}</p>}
                <div className="school-qc-hint"><ShieldCheck size={16} /><div><strong>Periksa kondisi saat penerimaan</strong><p>Jika ada porsi atau kondisi makanan yang perlu ditindaklanjuti, ajukan retur melalui menu Pengajuan Retur.</p></div></div>
              </>
            ) : (
              <div className="school-empty-delivery">
                <span><CalendarDays size={22} /></span>
                <h3>{loading ? 'Memuat jadwal distribusi…' : 'Belum ada jadwal distribusi'}</h3>
                <p>{loading ? 'Jadwal hari ini sedang diperiksa.' : 'Jadwal MBG sekolah Anda akan ditampilkan setelah dapur SPPG menambahkan sekolah ini sebagai penerima.'}</p>
                {!loading && !error && <button type="button" onClick={loadDashboard}><Clock3 size={14} /> Periksa kembali</button>}
              </div>
            )}
          </section>

          <aside className="panel school-receipt-guide">
            <div className="school-guide-heading"><span><CircleHelp size={18} /></span><div><h2>Panduan penerimaan</h2><p>Persiapan saat makanan tiba</p></div></div>
            {[
              ['1', 'Pastikan pengiriman sesuai', 'Cocokkan nama sekolah dan jumlah porsi dengan jadwal distribusi.'],
              ['2', 'Periksa kondisi makanan', 'Pastikan kemasan, kebersihan, dan kondisi makanan terjaga saat diterima.'],
              ['3', 'Catat penerimaan', 'Siapkan petugas sekolah yang bertanggung jawab untuk menerima kiriman.'],
              ['4', 'Laporkan kendala', 'Hubungi SPPG melalui saluran yang telah ditentukan apabila ada ketidaksesuaian.'],
            ].map(([number, title, description]) => (
              <article className="school-guide-step" key={number}><span>{number}</span><div><strong>{title}</strong><p>{description}</p></div></article>
            ))}
            <div className="school-guide-notice"><Check size={14} /><p>Retur hanya dapat diajukan untuk pengiriman yang sudah selesai diterima.</p></div>
            {data?.updatedAt && <p className="school-data-updated"><Clock3 size={12} /> Data diperbarui {new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(data.updatedAt))}</p>}
          </aside>
        </div>
        <footer className="school-portal-footer">NutriTrack MBG <span>·</span> Program Makanan Bergizi Gratis</footer>
      </main>
    </div>
  )
}

function PortalMetric({ label, value, note }) {
  return <article className="school-portal-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>
}

export default SchoolPortal
