import { useCallback, useEffect, useState } from 'react'
<<<<<<< HEAD
import { ArrowRight, Bell, CalendarDays, Check, CircleHelp, Clock3, ExternalLink, KeyRound, LockKeyhole, LogOut, PackageCheck, Send, ShieldCheck, Truck, X } from 'lucide-react'
import { Link } from 'react-router-dom'
=======
import { ArrowRight, Bell, CalendarDays, Check, CircleHelp, Clock3, ShieldCheck, Truck } from 'lucide-react'
>>>>>>> c5f4a66e2349d5308c5323c5a6e344366abc9926
import { apiRequest } from '../lib/api.js'
import SchoolNavbar from '../components/SchoolNavbar.jsx'

function SchoolPortal({ school, onLogout, view = 'dashboard' }) {
  return <SchoolDashboard school={school} onLogout={onLogout} view={view} />
}

const DELIVERY_LABELS = {
  PREPARING: 'Persiapan di dapur',
  IN_TRANSIT: 'Dalam perjalanan',
  COMPLETED: 'Sudah diterima',
  ALERT: 'Perlu konfirmasi admin',
}

const MAX_RETURN_EVIDENCE_BYTES = 5 * 1024 * 1024
const RETURN_EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('File bukti gagal dibaca. Silakan pilih ulang file tersebut.'))
    }
    reader.onerror = () => reject(reader.error || new Error('File bukti gagal dibaca.'))
    reader.readAsDataURL(file)
  })
}

function SchoolDashboard({ school, onLogout, view }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
<<<<<<< HEAD
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordNotice, setPasswordNotice] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [eligibleDeliveries, setEligibleDeliveries] = useState([])
  const [returnRequests, setReturnRequests] = useState([])
  const [returnForm, setReturnForm] = useState({ deliveryId: '', type: '', portions: '', note: '' })
  const [evidenceFile, setEvidenceFile] = useState(null)
  const [evidenceInputKey, setEvidenceInputKey] = useState(0)
  const [returnError, setReturnError] = useState('')
  const [returnNotice, setReturnNotice] = useState('')
  const [savingReturn, setSavingReturn] = useState(false)

  useBodyScrollLock(passwordDialogOpen)
=======
>>>>>>> c5f4a66e2349d5308c5323c5a6e344366abc9926

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
<<<<<<< HEAD
    if (view === 'dashboard') loadDashboard()
    else loadReturns()
  }, [view, loadDashboard, loadReturns])

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
      const result = await apiRequest('/api/school/password', {
        method: 'PATCH',
        tokenType: 'school',
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

  async function submitReturn(event) {
    event.preventDefault()
    setReturnError('')
    setReturnNotice('')
    setSavingReturn(true)
    try {
      const evidence = evidenceFile
        ? { mimeType: evidenceFile.type, data: await readFileAsDataUrl(evidenceFile) }
        : null
      const result = await apiRequest('/api/school/returns', {
        method: 'POST',
        tokenType: 'school',
        body: JSON.stringify({ ...returnForm, evidence }),
      })
      setReturnNotice(result.message)
      setReturnForm({ deliveryId: '', type: '', portions: '', note: '' })
      setEvidenceFile(null)
      setEvidenceInputKey((key) => key + 1)
      await loadReturns()
    } catch (requestError) {
      setReturnError(requestError.message || 'Pengajuan retur gagal dikirim.')
    } finally {
      setSavingReturn(false)
    }
  }
=======
    loadDashboard()
    const timer = window.setInterval(loadDashboard, 10_000)
    return () => window.clearInterval(timer)
  }, [loadDashboard])
>>>>>>> c5f4a66e2349d5308c5323c5a6e344366abc9926

  const delivery = data?.delivery
  const dateLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const eta = delivery?.statusNote?.match(/(?:tiba|estimasi)\s+(?:tiba\s+)?(\d{1,2}[.:]\d{2})/i)?.[1]?.replace('.', ':')
  const departure = delivery?.departureTime?.replace('.', ':')
  const deliveryStatus = delivery ? DELIVERY_LABELS[delivery.status] || delivery.status : 'Belum dijadwalkan'

  return (
<<<<<<< HEAD
    <div className="school-portal-shell">
      <header className="school-portal-topbar">
        <a className="school-portal-brand" href="/school/dashboard">
          <span><PackageCheck size={19} /></span>
          <span><strong>NutriTrack <b>MBG</b></strong><small>SEKOLAH <i>·</i> {school.name}</small></span>
        </a>
        <nav className="school-portal-nav" aria-label="Navigasi sekolah">
          <Link className={view === 'dashboard' ? 'school-portal-nav-active' : ''} aria-current={view === 'dashboard' ? 'page' : undefined} to="/school/dashboard">Dashboard</Link>
          <span aria-disabled="true" title="Fitur QC dan penerimaan akan hadir berikutnya">QC &amp; Penerimaan</span>
          <Link className={`school-portal-return-link${view === 'returns' ? ' school-portal-nav-active' : ''}`} aria-current={view === 'returns' ? 'page' : undefined} to="/school/returns">Pengajuan Retur</Link>
        </nav>
        <div className="school-portal-profile">
          <span className="school-user-avatar">{school.name.trim().charAt(0).toUpperCase()}</span>
          <span><strong>{school.name}</strong><small>Petugas sekolah</small></span>
          <button type="button" aria-label="Ubah password" onClick={() => { setPasswordNotice(''); setPasswordError(''); setPasswordDialogOpen(true) }}><KeyRound size={14} /><span>Ubah password</span></button>
          <button type="button" aria-label="Keluar dari akun sekolah" onClick={onLogout}><LogOut size={14} /><span>Keluar</span></button>
        </div>
      </header>

      <main className="school-portal-content">
        {passwordNotice && <div className="inline-notice success-notice" role="status"><Check size={16} />{passwordNotice}</div>}
        {view === 'returns' ? (
          <div className="school-portal-heading">
            <div>
              <p className="breadcrumb">Sekolah <span>/</span> Pengajuan retur</p>
              <p className="eyebrow"><span className="eyebrow-line" /> Tindak lanjut penerimaan MBG</p>
              <h1>Pengajuan retur</h1>
              <p className="page-description">Ajukan retur porsi dari pengiriman selesai dan pantau status tinjauan admin SPPG.</p>
            </div>
            <Link className="button-secondary" to="/school/dashboard"><PackageCheck size={14} /> Kembali ke dashboard</Link>
          </div>
        ) : (
          <>
=======
    <div className="school-portal-shell school-portal-shell-dashboard">
      <SchoolNavbar school={school} activePage="dashboard" onLogout={onLogout} />

      <main className="school-portal-content">
>>>>>>> c5f4a66e2349d5308c5323c5a6e344366abc9926
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
                    <div className={delivery.status === 'IN_TRANSIT' || delivery.status === 'COMPLETED' ? 'timeline-step timeline-step-current' : 'timeline-step'}><span /><strong>{delivery.status === 'IN_TRANSIT' ? 'Dalam perjalanan' : delivery.status === 'COMPLETED' ? 'Perjalanan selesai' : 'Menunggu kurir'}</strong></div>
                    <div className={delivery.status === 'COMPLETED' ? 'timeline-step timeline-step-done' : 'timeline-step'}><span /><strong>{eta ? `${eta} · Estimasi tiba` : delivery.receivedAt ? `Diterima ${delivery.receivedAt}` : 'Estimasi belum tersedia'}</strong></div>
                  </div>
                  {delivery.status === 'ALERT' && <div className="school-delivery-alert"><Bell size={15} /><p>{delivery.statusNote || 'Silakan hubungi admin SPPG untuk informasi distribusi.'}</p></div>}
                </div>

                <dl className="school-delivery-details">
                  <div><dt>Jumlah porsi</dt><dd>{delivery.portions.toLocaleString('id-ID')} porsi</dd></div>
                  <div><dt>Status penerimaan</dt><dd>{deliveryStatus}</dd></div>
                  <div><dt>Menu hari ini</dt><dd>{data.menu?.name || 'Informasi menu belum tersedia'}</dd></div>
                  <div><dt>Waktu diterima</dt><dd>{delivery.receivedAt || 'Menunggu penerimaan'}</dd></div>
                </dl>

                {data.menu?.ingredients?.length > 0 && <p className="school-menu-ingredients">Menu hari ini: {data.menu.ingredients.join(', ')}</p>}
<<<<<<< HEAD
                <div className="school-qc-hint"><ShieldCheck size={16} /><div><strong>Periksa kondisi saat penerimaan</strong><p>Jika ada porsi atau kondisi makanan yang perlu ditindaklanjuti, <Link to="/school/returns">ajukan retur melalui halaman Pengajuan Retur</Link>.</p></div></div>
=======
                <div className="school-qc-hint"><ShieldCheck size={16} /><div><strong>Periksa kondisi saat penerimaan</strong><p>Jika ada porsi atau kondisi makanan yang perlu ditindaklanjuti, ajukan retur melalui menu Pengajuan Retur.</p></div></div>
>>>>>>> c5f4a66e2349d5308c5323c5a6e344366abc9926
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
<<<<<<< HEAD
          </>
        )}
        {view === 'returns' && (
        <section className="panel school-returns-panel">
          <div className="panel-heading">
            <div><h2>Pengajuan retur MBG</h2><p>Ajukan retur porsi dari pengiriman selesai untuk ditinjau admin SPPG.</p></div>
          </div>
          {returnNotice && <div className="inline-notice success-notice" role="status"><Check size={16} />{returnNotice}</div>}
          {returnError && <div className="inline-notice error-notice" role="alert"><Bell size={16} />{returnError}</div>}
          <form className="school-return-form" onSubmit={submitReturn}>
            <label className="form-label" htmlFor="return-delivery">Pengiriman selesai</label>
            <select className="management-input" id="return-delivery" required value={returnForm.deliveryId} onChange={(event) => {
              const selected = eligibleDeliveries.find((item) => item.id === event.target.value)
              setReturnForm({ ...returnForm, deliveryId: event.target.value, portions: selected ? String(selected.portions) : '' })
            }}>
              <option value="" disabled>Pilih pengiriman</option>
              {eligibleDeliveries.map((item) => <option key={item.id} value={item.id}>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(item.date))} · {item.portions.toLocaleString('id-ID')} porsi</option>)}
            </select>
            <label className="form-label" htmlFor="return-type">Kategori retur</label>
            <select className="management-input" id="return-type" required value={returnForm.type} onChange={(event) => setReturnForm({ ...returnForm, type: event.target.value })}>
              <option value="" disabled>Pilih kategori retur</option>
              {['Kualitas makanan', 'Kemasan rusak', 'Jumlah tidak sesuai', 'Keterlambatan', 'Lainnya'].map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <label className="form-label" htmlFor="return-portions">Jumlah porsi diretur</label>
            <input className="management-input" id="return-portions" type="number" min="1" max={eligibleDeliveries.find((item) => item.id === returnForm.deliveryId)?.portions || 100000} required value={returnForm.portions} onChange={(event) => setReturnForm({ ...returnForm, portions: event.target.value })} />
            <label className="form-label" htmlFor="return-note">Keterangan</label>
            <textarea className="management-input school-address-input" id="return-note" rows="3" minLength="10" maxLength="1000" required placeholder="Jelaskan kondisi retur dan tindak lanjut yang dibutuhkan" value={returnForm.note} onChange={(event) => setReturnForm({ ...returnForm, note: event.target.value })} />
            <label className="form-label" htmlFor="return-evidence">File bukti <span className="optional-label">Opsional · maksimal 5 MB</span></label>
            <input
              key={evidenceInputKey}
              className="management-input return-evidence-input"
              id="return-evidence"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0] || null
                setReturnError('')
                if (file && file.size > MAX_RETURN_EVIDENCE_BYTES) {
                  setEvidenceFile(null)
                  setEvidenceInputKey((key) => key + 1)
                  setReturnError('Ukuran file bukti maksimal 5 MB.')
                  return
                }
                if (file && !RETURN_EVIDENCE_TYPES.includes(file.type)) {
                  setEvidenceFile(null)
                  setEvidenceInputKey((key) => key + 1)
                  setReturnError('Pilih file JPG, PNG, WebP, atau PDF.')
                  return
                }
                setEvidenceFile(file)
              }}
            />
            <p className="school-form-help"><CircleHelp size={13} /> Format yang didukung: JPG, PNG, WebP, atau PDF.</p>
            {evidenceFile && <p className="return-evidence-selected" role="status">{evidenceFile.name} · {(evidenceFile.size / (1024 * 1024)).toFixed(2)} MB</p>}
            <button className="button-primary" type="submit" disabled={savingReturn || !eligibleDeliveries.length}>
              {savingReturn ? 'Mengirim pengajuan...' : <><Send size={15} /> Kirim pengajuan retur</>}
            </button>
          </form>
          {!eligibleDeliveries.length && <p className="school-return-empty">Belum ada pengiriman selesai yang dapat diajukan untuk retur.</p>}
          <div className="school-return-history">
            <h3>Riwayat pengajuan</h3>
            {returnRequests.length ? returnRequests.map((item) => (
              <article className="school-return-row" key={item.id}>
                <div><strong>{item.type} · {item.portions.toLocaleString('id-ID')} porsi</strong><span>{item.delivery?.date ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(item.delivery.date)) : 'Pengiriman'}</span><p>{item.note}</p>{item.adminNote && <small>Catatan admin: {item.adminNote}</small>}</div>
                <span className={`return-status return-status-${item.status.toLowerCase()}`}>{item.status === 'PENDING' ? 'Menunggu tinjauan' : item.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}</span>
                {item.evidenceUrl && <a href={item.evidenceUrl} target="_blank" rel="noreferrer">Buka bukti <ExternalLink size={12} /></a>}
              </article>
            )) : <p className="school-return-empty">Belum ada pengajuan retur.</p>}
          </div>
        </section>
        )}
=======
>>>>>>> c5f4a66e2349d5308c5323c5a6e344366abc9926
        <footer className="school-portal-footer">NutriTrack MBG <span>·</span> Program Makanan Bergizi Gratis</footer>
      </main>
    </div>
  )
}

function PortalMetric({ label, value, note }) {
  return <article className="school-portal-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>
}

export default SchoolPortal
