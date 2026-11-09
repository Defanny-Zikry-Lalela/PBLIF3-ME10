import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Check, LoaderCircle, MapPin, PackageCheck, RefreshCw, School, Send, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api.js'

function localDateValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(value) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function AssignmentsPage() {
  const [schools, setSchools] = useState([])
  const [drivers, setDrivers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [form, setForm] = useState({ schoolId: '', driverId: '', date: localDateValue() })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadAssignments = useCallback(async () => {
    setError('')
    try {
      const result = await apiRequest('/api/admin/assignments')
      setSchools(result.schools)
      setDrivers(result.drivers)
      setAssignments(result.assignments)
    } catch (requestError) {
      setError(requestError.message || 'Data penugasan gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAssignments() }, [loadAssignments])

  async function createAssignment(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)
    try {
      const result = await apiRequest('/api/admin/assignments', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setNotice(result.message)
      setForm((current) => ({ ...current, schoolId: '' }))
      await loadAssignments()
    } catch (requestError) {
      setError(requestError.message || 'Penugasan kurir gagal disimpan.')
    } finally {
      setSaving(false)
    }
  }

  const selectedSchool = schools.find((school) => school.id === form.schoolId)

  return (
    <main className="dashboard-content management-page">
      <div className="page-heading">
        <div>
          <p className="breadcrumb">Admin <span>/</span> Penugasan kurir</p>
          <p className="eyebrow"><span className="eyebrow-line" /> Perencanaan distribusi</p>
          <h1>Penugasan kurir</h1>
          <p className="page-description">Pilih sekolah tujuan, tanggal distribusi, dan kurir yang bertugas.</p>
        </div>
        <button className="button-secondary" type="button" onClick={loadAssignments} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'refresh-spinning' : ''} /> Perbarui data
        </button>
      </div>

      {notice && <div className="inline-notice success-notice" role="status"><Check size={16} />{notice}</div>}
      {error && <div className="inline-notice error-notice" role="alert">{error}<button type="button" onClick={loadAssignments}>Coba lagi</button></div>}

      <section className="panel assignment-create-panel">
        <div className="panel-heading">
          <div>
            <h2>Jadwalkan kurir ke sekolah</h2>
            <p>Jika belum ada jadwal menu, distribusi dibuat menggunakan target porsi sekolah.</p>
          </div>
          <span className="assignment-panel-icon"><Truck size={19} /></span>
        </div>
        <form className="assignment-create-form" onSubmit={createAssignment}>
          <div>
            <label className="form-label" htmlFor="assignment-school">Sekolah tujuan</label>
            <select
              className="management-input management-select"
              id="assignment-school"
              required
              value={form.schoolId}
              onChange={(event) => setForm((current) => ({ ...current, schoolId: event.target.value }))}
            >
              <option value="" disabled>Pilih sekolah aktif</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name} · {school.targetPupils.toLocaleString('id-ID')} porsi{school.targetPupils < 1 ? ' · atur target porsi dahulu' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="assignment-date">Tanggal distribusi</label>
            <input
              className="management-input"
              id="assignment-date"
              type="date"
              required
              min={localDateValue()}
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="assignment-driver">Kurir bertugas</label>
            <select
              className="management-input management-select"
              id="assignment-driver"
              required
              value={form.driverId}
              onChange={(event) => setForm((current) => ({ ...current, driverId: event.target.value }))}
            >
              <option value="" disabled>Pilih kurir</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} · {driver.email}{driver.accountStatus === 'PENDING' ? ' · menunggu login pertama' : ''}
                </option>
              ))}
            </select>
          </div>
          <button className="button-primary assignment-submit" type="submit" disabled={saving || !schools.length || !drivers.length}>
            {saving ? <><LoaderCircle size={15} className="refresh-spinning" /> Menyimpan...</> : <><Send size={15} /> Simpan penugasan</>}
          </button>
        </form>
        {selectedSchool && (
          <p className="school-form-help assignment-form-help">
            {selectedSchool.targetPupils > 0
              ? <><PackageCheck size={13} /> Distribusi untuk {selectedSchool.name} berjumlah {selectedSchool.targetPupils.toLocaleString('id-ID')} porsi.</>
              : <><School size={13} /> Target porsi belum diatur. <Link to="/schools">Atur target sekolah</Link> sebelum membuat jadwal baru.</>}
          </p>
        )}
        {!loading && schools.length > 0 && schools.every((school) => school.targetPupils < 1) && (
          <div className="assignment-inline-empty">
            <PackageCheck size={15} /> Target porsi seluruh sekolah belum diatur. <Link to="/schools">Atur target porsi</Link> sebelum membuat jadwal baru.
          </div>
        )}
        {!loading && !drivers.length && (
          <div className="assignment-inline-empty">
            <Truck size={15} /> Belum ada akun kurir. <Link to="/drivers">Buat akun kurir</Link> terlebih dahulu.
          </div>
        )}
        {!loading && !schools.length && (
          <div className="assignment-inline-empty">
            <School size={15} /> Belum ada sekolah aktif. <Link to="/schools">Tambahkan sekolah</Link> terlebih dahulu.
          </div>
        )}
      </section>

      <section className="panel assignment-list-panel">
        <div className="panel-heading">
          <div><h2>Jadwal distribusi mendatang</h2><p>Penugasan dan pengiriman yang belum selesai</p></div>
          <span className="school-total"><CalendarDays size={14} /> {assignments.length} jadwal</span>
        </div>
        {loading ? (
          <div className="management-empty"><LoaderCircle size={18} className="refresh-spinning" /> Memuat jadwal distribusi...</div>
        ) : assignments.length ? (
          <div className="assignment-list">
            {assignments.map((assignment) => (
              <article className="assignment-row" key={assignment.id}>
                <span className="school-row-icon"><School size={18} /></span>
                <div className="assignment-row-main">
                  <strong>{assignment.school}</strong>
                  <span><CalendarDays size={13} /> {formatDate(assignment.date)}</span>
                  <span><MapPin size={13} /> {assignment.address || 'Alamat belum tersedia'}</span>
                </div>
                <div className="assignment-row-detail">
                  <strong>{assignment.portions.toLocaleString('id-ID')} porsi</strong>
                  <span className={`delivery-status status-${assignment.status.toLowerCase()}`}>{assignment.statusLabel}</span>
                </div>
                <div className="assignment-row-driver">
                  <Truck size={15} />
                  <span>{assignment.driver || 'Belum ada kurir'}</span>
                  {assignment.driverAccountStatus === 'PENDING' && <small>Akun menunggu login pertama</small>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="management-empty assignment-empty">
            <CalendarDays size={22} />
            <p>Belum ada jadwal distribusi mendatang.</p>
            <span>Pilih sekolah, tanggal, dan kurir di atas untuk membuat penugasan.</span>
          </div>
        )}
      </section>
    </main>
  )
}

export default AssignmentsPage
