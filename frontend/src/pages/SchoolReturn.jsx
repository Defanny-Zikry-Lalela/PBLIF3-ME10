import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CalendarDays, ExternalLink, RefreshCw, Send, Upload, X } from 'lucide-react'
import { apiRequest } from '../lib/api.js'
import SchoolNavbar from '../components/SchoolNavbar.jsx'

const MAX_PROOF_SIZE = 2 * 1024 * 1024
const ALLOWED_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const COMPLETED_DELIVERY_STATUSES = new Set(['COMPLETED', 'DELIVERED', 'SELESAI', 'DITERIMA'])

function SchoolReturn({ school, onLogout }) {
  const [eligibleDeliveries, setEligibleDeliveries] = useState([])
  const [returnRequests, setReturnRequests] = useState([])
  const [returnForm, setReturnForm] = useState({ deliveryId: '', type: '', portions: '', note: '', proofFile: null })
  const [proofPreview, setProofPreview] = useState('')
  const [proofError, setProofError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const proofInputRef = useRef(null)

  useEffect(() => {
    if (!returnForm.proofFile) {
      setProofPreview('')
      return undefined
    }

    const previewUrl = URL.createObjectURL(returnForm.proofFile)
    setProofPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [returnForm.proofFile])

  const loadReturns = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const result = await apiRequest('/api/school/returns', { tokenType: 'school' })
      setEligibleDeliveries(result.eligibleDeliveries)
      setReturnRequests(result.returns)
    } catch (requestError) {
      setLoadError(requestError.message || 'Data pengajuan retur gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadReturns() }, [loadReturns])

  async function submitReturn(event) {
    event.preventDefault()
    setSubmitError('')
    setNotice('')
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('deliveryId', returnForm.deliveryId)
      formData.append('type', returnForm.type)
      formData.append('portions', returnForm.portions)
      formData.append('note', returnForm.note)
      if (returnForm.proofFile) formData.append('proofFile', returnForm.proofFile)
      const result = await apiRequest('/api/school/returns', {
        method: 'POST',
        tokenType: 'school',
        body: formData,
      })
      setNotice(result.message)
      setReturnForm({ deliveryId: '', type: '', portions: '', note: '', proofFile: null })
      setProofError('')
      if (proofInputRef.current) proofInputRef.current.value = ''
      await loadReturns()
    } catch (requestError) {
      setSubmitError(requestError.message || 'Pengajuan retur gagal dikirim.')
    } finally {
      setSaving(false)
    }
  }

  function selectProofFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > MAX_PROOF_SIZE) {
      setProofError('Ukuran foto terlalu besar. Maksimal 2MB.')
      setReturnForm((current) => ({ ...current, proofFile: null }))
      event.target.value = ''
      return
    }
    if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
      setProofError('Format foto tidak didukung. Unggah file JPG, PNG, atau WEBP.')
      setReturnForm((current) => ({ ...current, proofFile: null }))
      event.target.value = ''
      return
    }

    setProofError('')
    setReturnForm((current) => ({ ...current, proofFile: file }))
  }

  function removeProofFile() {
    setReturnForm((current) => ({ ...current, proofFile: null }))
    setProofError('')
    if (proofInputRef.current) proofInputRef.current.value = ''
  }

  const completedDeliveries = eligibleDeliveries.filter((delivery) => (
    COMPLETED_DELIVERY_STATUSES.has(String(delivery.status || '').trim().toUpperCase())
  ))
  const selectedDelivery = completedDeliveries.find((item) => item.id === returnForm.deliveryId)
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="school-portal-shell school-portal-shell-return">
      <SchoolNavbar school={school} activePage="returns" onLogout={onLogout} />

      <main className="school-portal-content school-return-content">
        <div className="school-portal-heading school-return-heading">
          <div>
            <p className="breadcrumb">Sekolah <span>/</span> Pengajuan Retur</p>
            <p className="eyebrow"><span className="eyebrow-line" /> Tindak lanjut distribusi MBG</p>
            <h1>Pengajuan Retur MBG</h1>
            <p className="page-description">Ajukan retur porsi dari pengiriman yang selesai diterima untuk ditinjau admin SPPG.</p>
          </div>
          <div className="date-badge"><CalendarDays size={15} />{dateLabel}</div>
        </div>

        <div className="school-return-grid">
          <section className="panel school-return-card" aria-labelledby="school-return-form-title">
            <div className="school-return-card-heading">
              <div><h2 id="school-return-form-title">Form Pengajuan Retur</h2><p>Lengkapi detail kondisi pengiriman yang perlu ditindaklanjuti.</p></div>
            </div>
            {notice && <div className="inline-notice success-notice" role="status">{notice}</div>}
            {submitError && <div className="inline-notice error-notice" role="alert"><Bell size={15} />{submitError}</div>}
            <form className="school-return-form school-return-form-fit" onSubmit={submitReturn}>
              <label className="form-label" htmlFor="return-delivery">Pengiriman selesai</label>
              <select className="management-input" id="return-delivery" required value={returnForm.deliveryId} onChange={(event) => {
                const selected = eligibleDeliveries.find((item) => item.id === event.target.value)
                setReturnForm({ ...returnForm, deliveryId: event.target.value, portions: selected ? String(selected.portions) : '' })
              }}>
                <option value="" disabled>Pilih pengiriman</option>
                {completedDeliveries.map((item) => <option key={item.id} value={item.id}>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(item.date))} · {item.portions.toLocaleString('id-ID')} porsi</option>)}
              </select>
              <label className="form-label" htmlFor="return-type">Kategori retur</label>
              <select className="management-input" id="return-type" required value={returnForm.type} onChange={(event) => setReturnForm({ ...returnForm, type: event.target.value })}>
                <option value="" disabled>Pilih kategori retur</option>
                {['Kualitas makanan', 'Kemasan rusak', 'Jumlah tidak sesuai', 'Keterlambatan', 'Lainnya'].map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <label className="form-label" htmlFor="return-portions">Jumlah porsi diretur</label>
              <input className="management-input" id="return-portions" type="number" min="1" max={selectedDelivery?.portions || 100000} required value={returnForm.portions} onChange={(event) => setReturnForm({ ...returnForm, portions: event.target.value })} />
              <label className="form-label" htmlFor="return-note">Keterangan</label>
              <textarea className="management-input school-address-input" id="return-note" rows="3" minLength="10" maxLength="1000" required placeholder="Jelaskan kondisi retur dan tindak lanjut yang dibutuhkan" value={returnForm.note} onChange={(event) => setReturnForm({ ...returnForm, note: event.target.value })} />
              <span className="form-label" id="return-proof-label">Unggah Bukti Foto (Opsional)</span>
              <div className="school-proof-upload">
                <input
                  ref={proofInputRef}
                  className="school-proof-input"
                  id="return-proof"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  aria-labelledby="return-proof-label"
                  aria-describedby="return-proof-help"
                  onChange={selectProofFile}
                />
                <label className="school-proof-picker" htmlFor="return-proof">
                  <Upload size={17} />
                  <span>{returnForm.proofFile ? 'Ganti foto bukti' : 'Pilih foto bukti'}</span>
                </label>
                <p id="return-proof-help" className="school-proof-help">Format: JPG, PNG, WEBP (Maksimal 2MB)</p>
                {proofError && <p className="school-proof-error" role="alert">{proofError}</p>}
                {returnForm.proofFile && (
                  <div className="school-proof-preview">
                    <img src={proofPreview} alt="Preview bukti foto retur" />
                    <span title={returnForm.proofFile.name}>{returnForm.proofFile.name}</span>
                    <button type="button" onClick={removeProofFile} aria-label="Hapus foto bukti"><X size={15} /></button>
                  </div>
                )}
              </div>
              <button className="button-primary" type="submit" disabled={saving || loading || !completedDeliveries.length}>
                {saving ? 'Mengirim pengajuan...' : <><Send size={15} /> Kirim pengajuan retur</>}
              </button>
            </form>
            {!loading && !loadError && !completedDeliveries.length && <p className="school-return-empty">Belum ada pengiriman selesai yang dapat diajukan untuk retur.</p>}
            <p className="school-return-note">Catatan: Retur hanya dapat diajukan setelah proses penerimaan porsi di menu QC &amp; Penerimaan selesai.</p>
          </section>

          <section className="panel school-return-card school-return-history-card" aria-labelledby="school-return-history-title">
            <div className="school-return-card-heading">
              <div><h2 id="school-return-history-title">Riwayat Pengajuan Retur</h2><p>Status dan catatan tindak lanjut pengajuan Anda.</p></div>
              <button className="school-qc-refresh" type="button" onClick={loadReturns} disabled={loading} aria-label="Muat ulang riwayat retur"><RefreshCw size={14} /> Muat ulang</button>
            </div>
            {loadError && <div className="inline-notice error-notice" role="alert"><Bell size={15} />{loadError}</div>}
            <div className="school-return-history-list" aria-live="polite">
              {loading ? <p className="school-return-empty">Memuat riwayat pengajuan…</p> : returnRequests.length ? returnRequests.map((item) => (
                <article className="school-return-row" key={item.id}>
                  <div>
                    <strong>{item.type} · {item.portions.toLocaleString('id-ID')} porsi</strong>
                    <span>{item.delivery?.date ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(item.delivery.date)) : 'Pengiriman'}</span>
                    <p>{item.note}</p>
                    {item.adminNote && <small>Catatan admin: {item.adminNote}</small>}
                  </div>
                  <span className={`return-status return-status-${item.status.toLowerCase()}`}>{item.status === 'PENDING' ? 'Menunggu tinjauan' : item.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}</span>
                  {item.evidenceUrl && <a href={item.evidenceUrl} target="_blank" rel="noreferrer">Buka bukti <ExternalLink size={12} /></a>}
                </article>
              )) : <p className="school-return-empty">{loadError ? 'Riwayat belum dapat ditampilkan.' : 'Belum ada pengajuan retur.'}</p>}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default SchoolReturn
