import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Bell, CalendarDays, Check, CheckCircle2, ClipboardCheck, RefreshCw, ShieldCheck } from 'lucide-react'
import { apiRequest } from '../lib/api.js'
import SchoolNavbar from '../components/SchoolNavbar.jsx'

function SchoolQC({ school, onLogout }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [qualityStatus, setQualityStatus] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const loadDelivery = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiRequest('/api/school/dashboard', { tokenType: 'school' })
      setData(result)
    } catch (requestError) {
      setError(requestError.message || 'Data penerimaan hari ini gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDelivery() }, [loadDelivery])

  const delivery = data?.delivery
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
  const menuItems = data?.menu?.ingredients || []

  return (
    <div className="school-portal-shell school-portal-shell-qc">
      <SchoolNavbar school={school} activePage="qc" onLogout={onLogout} />

      <main className="school-portal-content">
        <div className="school-portal-heading">
          <div>
            <p className="breadcrumb">Sekolah <span>/</span> QC &amp; Penerimaan</p>
            <p className="eyebrow"><span className="eyebrow-line" /> Pemeriksaan sebelum penerimaan</p>
            <h1>Kontrol Kualitas &amp; Penerimaan Makanan (QC)</h1>
            <p className="page-description">Periksa kondisi makanan dan catat penerimaan porsi sekolah Anda.</p>
          </div>
          <div className="date-badge"><CalendarDays size={15} />{dateLabel}</div>
        </div>

        {error && <div className="inline-notice error-notice" role="alert"><Bell size={16} />{error}<button type="button" onClick={loadDelivery}>Muat ulang</button></div>}
        {confirmed && <div className="inline-notice success-notice" role="status"><Check size={16} />Penerimaan terkonfirmasi dengan status QC: {qualityStatus}.</div>}

        <section className="panel school-qc-panel" aria-labelledby="school-qc-heading">
          <div className="school-qc-panel-heading">
            <div>
              <span className="school-qc-icon"><ClipboardCheck size={18} /></span>
              <span><h2 id="school-qc-heading">Makanan dan porsi hari ini</h2><p>{school.name} <span>·</span> Jenjang {school.educationLevel}</p></span>
            </div>
            <button className="school-qc-refresh" type="button" onClick={loadDelivery} disabled={loading} aria-label="Muat ulang data pengiriman">
              <RefreshCw size={15} /> Muat ulang
            </button>
          </div>

          {loading ? (
            <div className="school-qc-empty"><span className="loading-spinner" />Memuat data pengiriman hari ini…</div>
          ) : delivery ? (
            <>
              <div className="school-qc-table-wrap">
                <table className="school-qc-table">
                  <thead>
                    <tr><th>Pengiriman / Menu</th><th>Rincian makanan</th><th>Jumlah porsi</th><th>Status pengiriman</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>{data.menu?.name || 'Paket makanan MBG'}</strong><small>ID {delivery.id.slice(-10).toUpperCase()}</small></td>
                      <td>{menuItems.length ? menuItems.join(', ') : 'Rincian menu belum tersedia'}</td>
                      <td>{delivery.portions.toLocaleString('id-ID')} porsi</td>
                      <td><span className={`school-qc-status${delivery.status === 'COMPLETED' ? ' school-qc-status-done' : ''}`}>{delivery.status === 'COMPLETED' ? 'Sudah diterima' : delivery.status === 'IN_TRANSIT' ? 'Dalam perjalanan' : delivery.status === 'ALERT' ? 'Perlu konfirmasi' : 'Persiapan'}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <section className="school-qc-check" aria-labelledby="school-qc-check-heading">
                <div className="school-qc-check-title">
                  <ShieldCheck size={18} />
                  <div><h3 id="school-qc-check-heading">Cek Fisik Makanan</h3><p>Periksa kemasan, kebersihan, aroma, dan kondisi makanan sebelum diterima.</p></div>
                </div>
                <div className="school-qc-check-actions">
                  <button
                    className={`school-qc-choice${qualityStatus === 'Baik / Layak' ? ' school-qc-choice-selected' : ''}`}
                    type="button"
                    aria-pressed={qualityStatus === 'Baik / Layak'}
                    onClick={() => { setQualityStatus('Baik / Layak'); setConfirmed(false) }}
                  ><CheckCircle2 size={16} />Baik / Layak</button>
                  <button
                    className={`school-qc-choice school-qc-choice-poor${qualityStatus === 'Kurang' ? ' school-qc-choice-selected' : ''}`}
                    type="button"
                    aria-pressed={qualityStatus === 'Kurang'}
                    onClick={() => { setQualityStatus('Kurang'); setConfirmed(false) }}
                  ><AlertTriangle size={16} />Kurang</button>
                  <button
                    className="school-qc-confirm"
                    type="button"
                    disabled={!qualityStatus || confirmed}
                    onClick={() => setConfirmed(true)}
                  ><Check size={16} />{confirmed ? 'Penerimaan Terkonfirmasi' : 'Konfirmasi Terima'}</button>
                </div>
                {!qualityStatus && <p className="school-qc-prompt">Pilih hasil pemeriksaan fisik untuk melanjutkan konfirmasi.</p>}
                {qualityStatus === 'Kurang' && <p className="school-qc-warning" role="status">Kondisi makanan ditandai kurang. Catat temuan dan tindak lanjuti melalui pengajuan retur.</p>}
                {confirmed && <p className="school-qc-session-note">Konfirmasi ini ditampilkan selama halaman QC dibuka.</p>}
              </section>
            </>
          ) : (
            <div className="school-qc-empty">
              <span><CalendarDays size={22} /></span>
              <h3>{error ? 'Data belum dapat ditampilkan' : 'Belum ada pengiriman hari ini'}</h3>
              <p>{error ? 'Periksa koneksi lalu muat ulang data.' : 'Daftar makanan dan porsi akan muncul setelah pengiriman dijadwalkan untuk sekolah Anda.'}</p>
              {!error && <button type="button" onClick={loadDelivery}><RefreshCw size={14} /> Periksa kembali</button>}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default SchoolQC
