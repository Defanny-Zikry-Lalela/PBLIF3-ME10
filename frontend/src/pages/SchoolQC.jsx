import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Bell, CalendarDays, Check, CheckCircle2, ClipboardCheck, PackageCheck, RefreshCw, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { apiRequest } from '../lib/api.js'
import SchoolNavbar from '../components/SchoolNavbar.jsx'

function SchoolQC({ school, onLogout }) {
  const [searchParams] = useSearchParams()
  const verificationDeliveryId = searchParams.get('deliveryId')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [qualityStatus, setQualityStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const qualityDeliveryId = useRef('')

  const loadDelivery = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    setError('')
    try {
      const result = await apiRequest('/api/school/dashboard', { tokenType: 'school' })
      setData(result)
      const deliveryId = result.delivery?.id || ''
      const isNewDelivery = deliveryId !== qualityDeliveryId.current
      qualityDeliveryId.current = deliveryId
      setQualityStatus((current) => (
        isNewDelivery || result.delivery?.qcStatus === 'QC_APPROVED'
          ? result.delivery?.qcCondition || ''
          : current || result.delivery?.qcCondition || ''
      ))
    } catch (requestError) {
      setError(requestError.message || 'Data penerimaan hari ini gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDelivery(true)
    const timer = window.setInterval(() => loadDelivery(), 10_000)
    return () => window.clearInterval(timer)
  }, [loadDelivery])

  const delivery = data?.delivery
  const qrMatchesDelivery = Boolean(verificationDeliveryId && delivery?.id === verificationDeliveryId)
  const confirmed = delivery?.qcStatus === 'QC_APPROVED'
  const qcRejected = delivery?.qcStatus === 'QC_REJECTED'
  const schoolReceived = Boolean(delivery?.schoolReceivedAt)
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
  const menuItems = data?.menu?.ingredients || []

  function chooseQuality(condition) {
    setQualityStatus(condition)
    setError('')
    setNotice('')
  }

  async function confirmQC() {
    if (!delivery || !qualityStatus) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest(`/api/school/deliveries/${delivery.id}/qc`, {
        method: 'POST',
        tokenType: 'school',
        body: JSON.stringify({ condition: qualityStatus }),
      })
      setData((current) => current?.delivery ? {
        ...current,
        delivery: {
          ...current.delivery,
          qcStatus: result.qcStatus,
          qcCondition: result.qcCondition,
          handoverPin: result.handoverPin,
          ...(result.statusNote && { statusNote: result.statusNote }),
        },
      } : current)
      setQualityStatus(result.qcCondition || qualityStatus)
      setNotice(result.message)
    } catch (requestError) {
      setError(requestError.message || 'Konfirmasi QC gagal disimpan.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmReceipt() {
    if (!delivery) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest(`/api/school/deliveries/${delivery.id}/receive`, {
        method: 'POST',
        tokenType: 'school',
      })
      setData((current) => current?.delivery ? {
        ...current,
        delivery: { ...current.delivery, schoolReceivedAt: result.schoolReceivedAt },
      } : current)
      setNotice(result.message)
    } catch (requestError) {
      setError(requestError.message || 'Konfirmasi penerimaan gagal disimpan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="school-portal-shell school-portal-shell-qc">
      <SchoolNavbar school={school} activePage="qc" onLogout={onLogout} />

      <main className="school-portal-content">
        <div className="school-portal-heading">
          <div>
            <p className="breadcrumb">Sekolah <span>/</span> QC &amp; Penerimaan</p>
            <p className="eyebrow"><span className="eyebrow-line" /> Penerimaan dan pemeriksaan kualitas</p>
            <h1>Kontrol Kualitas &amp; Penerimaan Makanan (QC)</h1>
            <p className="page-description">Konfirmasi pengiriman diterima terlebih dahulu, lalu periksa kondisi fisik makanan.</p>
          </div>
          <div className="date-badge"><CalendarDays size={15} />{dateLabel}</div>
        </div>

        {error && <div className="inline-notice error-notice" role="alert"><Bell size={16} />{error}<button type="button" onClick={loadDelivery}>Muat ulang</button></div>}
        {verificationDeliveryId && !loading && (
          qrMatchesDelivery
            ? <div className="inline-notice success-notice" role="status"><Check size={16} />QR sesuai dengan pengiriman untuk {school.name}. Cocokkan jumlah porsi sebelum menerima.</div>
            : <div className="inline-notice error-notice" role="alert"><Bell size={16} />QR tidak sesuai dengan pengiriman aktif untuk akun {school.name}.</div>
        )}
        {confirmed && <div className="inline-notice success-notice" role="status"><Check size={16} />Pemeriksaan QC pengiriman telah dikonfirmasi.</div>}

        <section className="panel school-qc-panel" aria-labelledby="school-qc-heading">
          <div className="school-qc-panel-heading">
            <div>
              <span className="school-qc-icon"><ClipboardCheck size={18} /></span>
              <span><h2 id="school-qc-heading">Makanan dan porsi hari ini</h2><p>{school.name} <span>·</span> Jenjang {school.educationLevel}</p></span>
            </div>
            <button className="school-qc-refresh" type="button" onClick={() => loadDelivery(true)} disabled={loading || saving} aria-label="Muat ulang data pengiriman">
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
                      <td><span className={`school-qc-status${delivery.status === 'COMPLETED' || delivery.status === 'ARRIVED' ? ' school-qc-status-done' : ''}`}>{delivery.status === 'COMPLETED' ? 'Sudah diterima' : delivery.status === 'ARRIVED' ? 'Tiba di lokasi' : delivery.status === 'IN_TRANSIT' ? 'Dalam perjalanan' : delivery.status === 'ALERT' ? 'Perlu konfirmasi' : 'Persiapan'}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {!schoolReceived ? (
                <section className="school-qc-check" aria-labelledby="school-receive-heading">
                  <div className="school-qc-check-title">
                    <PackageCheck size={18} />
                    <div>
                      <h3 id="school-receive-heading">Konfirmasi Penerimaan Pengiriman</h3>
                      <p>Pastikan jumlah porsi pada manifest sesuai. Setelah penerimaan dicatat, sekolah dapat melanjutkan pemeriksaan fisik makanan.</p>
                    </div>
                  </div>
                  <div className="school-qc-check-actions">
                    <button
                      className="school-qc-confirm"
                      type="button"
                      disabled={saving || delivery.status !== 'ARRIVED'}
                      onClick={confirmReceipt}
                    ><Check size={16} />{saving ? 'Menyimpan…' : 'Konfirmasi Pengiriman Diterima'}</button>
                  </div>
                  {delivery.status !== 'ARRIVED' && <p className="school-qc-prompt">Tombol konfirmasi tersedia setelah kurir mencatat tiba di lokasi.</p>}
                </section>
              ) : (
                <section className="school-qc-check" aria-labelledby="school-qc-check-heading">
                <div className="school-qc-check-title">
                  <ShieldCheck size={18} />
                  <div><h3 id="school-qc-check-heading">Cek Fisik Makanan</h3><p>Penerimaan dikonfirmasi {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(delivery.schoolReceivedAt))}. Periksa kemasan, kebersihan, aroma, dan kondisi makanan.</p></div>
                </div>
                <div className="school-qc-check-actions">
                  <button
                    className={`school-qc-choice${qualityStatus === 'GOOD' ? ' school-qc-choice-selected' : ''}`}
                    type="button"
                    aria-pressed={qualityStatus === 'GOOD'}
                    disabled={confirmed || saving}
                    onClick={() => chooseQuality('GOOD')}
                  ><CheckCircle2 size={16} />Baik / Layak</button>
                  <button
                    className={`school-qc-choice school-qc-choice-poor${qualityStatus === 'POOR' ? ' school-qc-choice-selected' : ''}`}
                    type="button"
                    aria-pressed={qualityStatus === 'POOR'}
                    disabled={confirmed || saving}
                    onClick={() => chooseQuality('POOR')}
                  ><AlertTriangle size={16} />Kurang</button>
                  <button
                    className="school-qc-confirm"
                    type="button"
                    disabled={!qualityStatus || confirmed || saving || delivery.status !== 'ARRIVED'}
                    onClick={confirmQC}
                  ><Check size={16} />{saving ? 'Menyimpan…' : confirmed ? 'QC Disetujui' : qcRejected ? 'Simpan Hasil Pemeriksaan' : 'Konfirmasi QC'}</button>
                </div>
                {!qualityStatus && <p className="school-qc-prompt">Pilih hasil pemeriksaan fisik untuk melanjutkan konfirmasi.</p>}
                {qualityStatus === 'POOR' && <p className="school-qc-warning" role="status">{qcRejected ? 'Hasil QC terakhir: Kurang. Konfirmasi ulang untuk mencatat kondisi kurang; PIN serah terima tidak diterbitkan.' : 'Kondisi makanan dipilih Kurang. Konfirmasi akan mencatat hasil ini; PIN serah terima tidak diterbitkan.'} Catat temuan dan tindak lanjuti melalui pengajuan retur.</p>}
                {qcRejected && qualityStatus === 'GOOD' && <p className="school-qc-session-note" role="status">Periksa ulang makanan. Konfirmasi Baik / Layak akan memperbarui hasil QC dan menerbitkan PIN serah terima.</p>}
                {notice && <p className="school-qc-session-note" role="status">{notice}</p>}
                {confirmed && delivery.handoverPin && (
                  <div className="school-qc-pin" role="status">
                    <strong>PIN Serah Terima</strong>
                    <span aria-label="PIN serah terima">{delivery.handoverPin}</span>
                    <small>Berikan PIN ini kepada kurir untuk menyelesaikan serah terima.</small>
                  </div>
                )}
                {confirmed && !delivery.handoverPin && <p className="school-qc-session-note">QC disetujui. Serah terima telah selesai atau sedang diperbarui.</p>}
                {delivery.status !== 'ARRIVED' && !confirmed && <p className="school-qc-prompt">Pemeriksaan QC tersedia setelah pengiriman tiba di sekolah.</p>}
                </section>
              )}
            </>
          ) : (
            <div className="school-qc-empty">
              <span><CalendarDays size={22} /></span>
              <h3>{error ? 'Data belum dapat ditampilkan' : 'Belum ada pengiriman hari ini'}</h3>
              <p>{error ? 'Periksa koneksi lalu muat ulang data.' : 'Daftar makanan dan porsi akan muncul setelah pengiriman dijadwalkan untuk sekolah Anda.'}</p>
              {!error && <button type="button" onClick={() => loadDelivery(true)}><RefreshCw size={14} /> Periksa kembali</button>}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default SchoolQC
