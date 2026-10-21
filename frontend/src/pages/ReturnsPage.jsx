import { useCallback, useEffect, useState } from 'react'
import { Bell, Check, ExternalLink, LoaderCircle, RefreshCw, RotateCcw, X } from 'lucide-react'
import { apiRequest } from '../lib/api.js'

const RETURN_STATUS = {
  PENDING: 'Menunggu tinjauan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
}

function formatDate(value) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function ReturnsPage() {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [notes, setNotes] = useState({})

  const loadReturns = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiRequest('/api/admin/returns')
      setReturns(result.returns)
    } catch (requestError) {
      setError(requestError.message || 'Daftar retur gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadReturns() }, [loadReturns])

  async function reviewReturn(item, status) {
    if (status === 'REJECTED' && (notes[item.id] || '').trim().length < 5) {
      setError('Tambahkan alasan penolakan minimal 5 karakter pada catatan untuk sekolah.')
      return
    }
    setSavingId(item.id)
    setError('')
    setNotice('')
    try {
      const result = await apiRequest(`/api/admin/returns/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNote: notes[item.id] || '' }),
      })
      setNotice(result.message)
      await loadReturns()
    } catch (requestError) {
      setError(requestError.message || 'Status retur gagal diperbarui.')
    } finally {
      setSavingId(null)
    }
  }

  const pendingCount = returns.filter((item) => item.status === 'PENDING').length

  return (
    <main className="dashboard-content management-page">
      <div className="page-heading">
        <div>
          <p className="breadcrumb">Admin <span>/</span> Retur &amp; Klaim</p>
          <p className="eyebrow"><span className="eyebrow-line" /> Tindak lanjut sekolah</p>
          <h1>Retur MBG</h1>
          <p className="page-description">Tinjau pengajuan retur dari sekolah dan catat keputusan admin SPPG.</p>
        </div>
        <button className="button-secondary" type="button" onClick={loadReturns} disabled={loading}><RefreshCw size={14} /> Perbarui data</button>
      </div>

      {notice && <div className="inline-notice success-notice" role="status"><Check size={16} />{notice}</div>}
      {error && <div className="inline-notice error-notice" role="alert"><Bell size={16} />{error}</div>}

      <section className="school-summary-grid" aria-label="Ringkasan retur">
        <article className="school-summary-card"><span className="school-summary-icon"><RotateCcw size={18} /></span><div><span>Total pengajuan</span><strong>{returns.length}</strong><small>retur dari sekolah</small></div></article>
        <article className="school-summary-card"><span className="school-summary-icon"><Bell size={18} /></span><div><span>Perlu ditinjau</span><strong>{pendingCount}</strong><small>menunggu keputusan admin</small></div></article>
        <article className="school-summary-card"><span className="school-summary-icon"><Check size={18} /></span><div><span>Sudah diproses</span><strong>{returns.length - pendingCount}</strong><small>disetujui atau ditolak</small></div></article>
      </section>

      <section className="panel school-list-panel returns-list-panel">
        <div className="panel-heading school-list-heading">
          <div><h2>Daftar pengajuan retur</h2><p>Keterangan, bukti, jumlah porsi, dan status tinjauan</p></div>
          <span className="school-total"><RotateCcw size={14} /> {pendingCount} menunggu</span>
        </div>
        <div className="school-list">
          {loading && !returns.length ? (
            <div className="management-empty"><LoaderCircle size={18} className="refresh-spinning" /> Memuat pengajuan...</div>
          ) : returns.length ? returns.map((item) => (
            <article className="school-row return-admin-row" key={item.id}>
              <span className="school-row-icon"><RotateCcw size={18} /></span>
              <div className="school-row-main">
                <strong>{item.school.name} · {item.type}</strong>
                <span className="school-row-meta">
                  {item.portions.toLocaleString('id-ID')} porsi
                  <span>·</span>
                  {item.delivery?.date ? `Pengiriman ${formatDate(item.delivery.date)}` : 'Pengiriman tidak tersedia'}
                  <span>·</span>
                  {formatDate(item.createdAt)}
                </span>
                <p className="return-admin-note">{item.note}</p>
                {item.adminNote && <small className="return-admin-review-note">Catatan admin: {item.adminNote}</small>}
                {item.evidenceUrl && <a className="return-evidence-link" href={item.evidenceUrl} target="_blank" rel="noreferrer">Lihat bukti <ExternalLink size={12} /></a>}
                {item.status === 'PENDING' && (
                  <div className="return-review-controls">
                    <textarea className="management-input" rows="2" maxLength="1000" placeholder="Catatan untuk sekolah (wajib jika menolak)" value={notes[item.id] || ''} onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })} />
                    <button className="button-primary" type="button" disabled={savingId === item.id} onClick={() => reviewReturn(item, 'APPROVED')}>
                      {savingId === item.id ? <LoaderCircle size={14} className="refresh-spinning" /> : <Check size={14} />} Setujui
                    </button>
                    <button className="button-secondary return-reject-button" type="button" disabled={savingId === item.id} onClick={() => reviewReturn(item, 'REJECTED')}>
                      <X size={14} /> Tolak
                    </button>
                  </div>
                )}
              </div>
              <span className={`return-status return-status-${item.status.toLowerCase()}`}>{RETURN_STATUS[item.status] || item.status}</span>
            </article>
          )) : (
            <div className="management-empty"><RotateCcw size={22} /> Belum ada pengajuan retur dari sekolah.</div>
          )}
        </div>
      </section>
    </main>
  )
}

export default ReturnsPage
