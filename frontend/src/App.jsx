import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { Bell, ChevronDown, ChevronLeft, ChevronRight, Clock3, PackageCheck, RefreshCw, School, Truck, X } from 'lucide-react'
import Login from './pages/login.jsx'
import NutritionPage from './pages/NutritionPage.jsx'
import SchoolManagementPage from './pages/SchoolManagementPage.jsx'
import SchoolActivationPage from './pages/SchoolActivationPage.jsx'
import SchoolPortal from './pages/SchoolPortal.jsx'
import CourierPortal from './pages/CourierPortal.jsx'
import DriverActivationPage from './pages/DriverActivationPage.jsx'
import CourierManagementPage from './pages/CourierManagementPage.jsx'
import ReturnsPage from './pages/ReturnsPage.jsx'
import AdminLayout from './components/AdminLayout.jsx'
import { apiRequest, clearToken, getToken } from './lib/api.js'
import useBodyScrollLock from './hooks/useBodyScrollLock.js'
import './App.css'

function ProtectedRoute({ admin, children }) {
  const location = useLocation()
  if (!admin) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

function AppRoutes() {
  const [admin, setAdmin] = useState(null)
  const [schoolUser, setSchoolUser] = useState(null)
  const [driverUser, setDriverUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [checkingSchoolSession, setCheckingSchoolSession] = useState(true)
  const [checkingDriverSession, setCheckingDriverSession] = useState(true)

  useEffect(() => {
    let active = true
    if (!getToken()) {
      setCheckingSession(false)
      return () => { active = false }
    }

    apiRequest('/api/auth/me')
      .then(({ admin: currentAdmin }) => {
        if (active) setAdmin(currentAdmin)
      })
      .catch(() => {
        clearToken()
        if (active) setAdmin(null)
      })
      .finally(() => {
        if (active) setCheckingSession(false)
      })

    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    if (!getToken('school')) {
      setCheckingSchoolSession(false)
      return () => { active = false }
    }

    apiRequest('/api/auth/school/me', { tokenType: 'school' })
      .then(({ school }) => {
        if (active) setSchoolUser(school)
      })
      .catch(() => {
        clearToken('school')
        if (active) setSchoolUser(null)
      })
      .finally(() => {
        if (active) setCheckingSchoolSession(false)
      })

    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    if (!getToken('driver')) {
      setCheckingDriverSession(false)
      return () => { active = false }
    }

    apiRequest('/api/auth/driver/me', { tokenType: 'driver' })
      .then(({ driver }) => {
        if (active) setDriverUser(driver)
      })
      .catch(() => {
        clearToken('driver')
        if (active) setDriverUser(null)
      })
      .finally(() => {
        if (active) setCheckingDriverSession(false)
      })

    return () => { active = false }
  }, [])

  return (
    checkingSession || checkingSchoolSession || checkingDriverSession
      ? <main className="session-loading"><span className="loading-spinner" />Memeriksa sesi...</main>
      :
    <Routes>
      <Route path="/activate" element={<SchoolActivationPage />} />
      <Route path="/courier/activate" element={<DriverActivationPage />} />
      <Route path="/school/login" element={<Navigate to={schoolUser ? '/school/dashboard' : '/login'} replace />} />
      <Route path="/courier/login" element={<Navigate to={driverUser ? '/courier/dashboard' : '/login'} replace />} />
      <Route path="/school/dashboard" element={schoolUser
        ? <SchoolPortal school={schoolUser} onLogout={() => { clearToken('school'); setSchoolUser(null) }} />
        : <Navigate to="/school/login" replace />} />
      <Route path="/courier/dashboard" element={driverUser
        ? <CourierPortal driver={driverUser} onLogout={() => { clearToken('driver'); setDriverUser(null) }} />
        : <Navigate to="/courier/login" replace />} />
      <Route
        path="/login"
        element={admin
          ? <Navigate to="/dashboard" replace />
          : schoolUser
            ? <Navigate to="/school/dashboard" replace />
            : driverUser
              ? <Navigate to="/courier/dashboard" replace />
              : <Login onAdminLogin={setAdmin} onSchoolLogin={setSchoolUser} onDriverLogin={setDriverUser} />}
      />
      <Route
        path="/dashboard"
        element={(
          <ProtectedRoute admin={admin}>
            <AdminLayout admin={admin} onLogout={() => { clearToken(); setAdmin(null) }}>
              <Dashboard />
            </AdminLayout>
          </ProtectedRoute>
        )}
      />
      <Route path="/nutrition" element={(
        <ProtectedRoute admin={admin}>
          <AdminLayout admin={admin} onLogout={() => { clearToken(); setAdmin(null) }}>
            <NutritionPage />
          </AdminLayout>
        </ProtectedRoute>
      )} />
      <Route path="/schools" element={(
        <ProtectedRoute admin={admin}>
          <AdminLayout admin={admin} onLogout={() => { clearToken(); setAdmin(null) }}>
            <SchoolManagementPage />
          </AdminLayout>
        </ProtectedRoute>
      )} />
      <Route path="/drivers" element={(
        <ProtectedRoute admin={admin}>
          <AdminLayout admin={admin} onLogout={() => { clearToken(); setAdmin(null) }}>
            <CourierManagementPage />
          </AdminLayout>
        </ProtectedRoute>
      )} />
      <Route path="/returns" element={(
        <ProtectedRoute admin={admin}>
          <AdminLayout admin={admin} onLogout={() => { clearToken(); setAdmin(null) }}>
            <ReturnsPage />
          </AdminLayout>
        </ProtectedRoute>
      )} />
      <Route path="*" element={<Navigate to={admin ? '/dashboard' : schoolUser ? '/school/dashboard' : driverUser ? '/courier/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

const STATUS_LABELS = {
  PREPARING: 'Persiapan',
  IN_TRANSIT: 'Dalam perjalanan',
  COMPLETED: 'Selesai',
  ALERT: 'Perlu perhatian',
}

function formatDate(value) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(value)
}

function formatTime(value) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function Dashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [assignableDrivers, setAssignableDrivers] = useState([])
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [savingAssignment, setSavingAssignment] = useState(false)
  const [assignmentError, setAssignmentError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useBodyScrollLock(Boolean(selectedDelivery))

  useEffect(() => {
    if (!selectedDelivery) return undefined
    const controller = new AbortController()
    setSelectedDriverId(selectedDelivery.driverId || '')
    setAssignmentError('')
    apiRequest('/api/admin/drivers', { signal: controller.signal })
      .then(({ drivers }) => setAssignableDrivers(drivers.filter((driver) => driver.accountStatus === 'ACTIVE')))
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setAssignmentError(requestError.message || 'Daftar kurir gagal dimuat.')
      })
    return () => controller.abort()
  }, [selectedDelivery?.id])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 250)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({
      page: String(page),
      limit: '7',
      status: status || 'all',
    })
    if (search) params.set('search', search)

    setLoading(true)
    setError('')
    apiRequest(`/api/admin/dashboard?${params}`, { signal: controller.signal })
      .then(setDashboard)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || 'Data dasbor gagal dimuat.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [page, search, status, refreshKey])

  function changeStatus(value) {
    setStatus(value)
    setPage(1)
  }

  async function assignDriver() {
    setSavingAssignment(true)
    setAssignmentError('')
    try {
      const result = await apiRequest(`/api/admin/deliveries/${selectedDelivery.id}/driver`, {
        method: 'PATCH',
        body: JSON.stringify({ driverId: selectedDriverId }),
      })
      const driverName = assignableDrivers.find((driver) => driver.id === selectedDriverId)?.name
      setSelectedDelivery({
        ...selectedDelivery,
        driverId: selectedDriverId || null,
        driver: driverName || 'Belum ditugaskan',
      })
      setRefreshKey((key) => key + 1)
      setAssignmentError(result.message)
    } catch (requestError) {
      setAssignmentError(requestError.message || 'Penugasan kurir gagal disimpan.')
    } finally {
      setSavingAssignment(false)
    }
  }

  const metrics = dashboard?.metrics
  const pagination = dashboard?.pagination
  const firstRow = pagination?.total ? (page - 1) * pagination.limit + 1 : 0
  const lastRow = Math.min(page * (pagination?.limit || 7), pagination?.total || 0)

  return (
    <>
      <main className="dashboard-content">
        <div className="page-heading">
          <div>
            <p className="breadcrumb">Admin <span>/</span> Dashboard</p>
            <p className="eyebrow"><span className="eyebrow-line" /> Program Makanan Bergizi Gratis</p>
            <h1>Pemantauan distribusi MBG</h1>
            <p className="page-description">Pantau penyiapan makanan, distribusi porsi ke sekolah, dan tindak lanjut operasional SPPG hari ini.</p>
          </div>
          <div className="page-heading-actions">
            <Link className="button-secondary add-school-shortcut" to="/schools?newSchool=1"><School size={15} /> Tambah sekolah</Link>
            <div className="date-badge"><Clock3 size={15} /><span>{formatDate(new Date())}</span></div>
          </div>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setRefreshKey((key) => key + 1)}>Coba lagi</button>
          </div>
        )}

        <section className="metric-grid" aria-label="Ringkasan hari ini">
          <MetricCard icon={<PackageCheck size={18} />} label="Porsi MBG hari ini" value={metrics?.totalPortions} suffix="porsi dalam rencana distribusi hari ini" format />
          <MetricCard icon={<Truck size={18} />} label="Kurir aktif" value={metrics?.activeDrivers} suffix="kurir untuk distribusi MBG" />
          <MetricCard icon={<School size={18} />} label="Sekolah penerima MBG" value={metrics?.schoolsServed} suffix={metrics ? `${metrics.completedSchools} selesai · ${metrics.ongoingSchools} dalam proses` : 'memuat data sekolah'} />
          <MetricCard icon={<Bell size={18} />} label="Klaim MBG menunggu" value={metrics?.pendingClaims} suffix={`${metrics?.pendingClaimPortions?.toLocaleString('id-ID') ?? '—'} porsi perlu verifikasi`} warning />
        </section>

        <div className="dashboard-grid">
          <section className="panel delivery-panel">
            <div className="panel-heading">
              <div>
                <h2>Status distribusi MBG</h2>
                <p>Pemantauan pengiriman porsi ke sekolah penerima</p>
              </div>
              <span className="last-updated">
                {dashboard?.updatedAt ? `Diperbarui ${formatTime(dashboard.updatedAt)}` : 'Mengambil data...'}
              </span>
            </div>

            <div className="table-toolbar">
              <label className="search-field">
                <span className="sr-only">Cari nama sekolah atau kurir</span>
                <School size={16} />
                <input
                  type="search"
                  placeholder="Cari nama sekolah atau kurir..."
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </label>
              <label className="filter-field">
                <span className="sr-only">Filter status pengiriman</span>
                <select className="filter-status-select" required value={status} onChange={(event) => changeStatus(event.target.value)}>
                  <option value="" disabled>Filter status</option>
                  <option value="all">Semua status</option>
                  <option value="PREPARING">Persiapan</option>
                  <option value="IN_TRANSIT">Dalam perjalanan</option>
                  <option value="COMPLETED">Selesai</option>
                  <option value="ALERT">Perlu perhatian</option>
                </select>
                <ChevronDown size={14} />
              </label>
              <button className="button-secondary refresh-button" type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
                <RefreshCw size={14} className={loading ? 'refresh-spinning' : ''} /> <span>Perbarui data</span>
              </button>
            </div>

            <div className="table-scroll" aria-busy={loading}>
              <table className="delivery-table">
                <thead>
                  <tr>
                    <th>Nama sekolah</th>
                    <th>Kurir bertugas</th>
                    <th>Jumlah porsi</th>
                    <th>Jam keberangkatan</th>
                    <th>Status live</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !dashboard ? (
                    <tr><td className="table-message" colSpan="6"><span className="loading-spinner" /> Memuat data pengiriman...</td></tr>
                  ) : dashboard?.deliveries.length ? dashboard.deliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td data-label="Nama sekolah"><span className="school-name">{delivery.school}</span></td>
                      <td data-label="Kurir bertugas">{delivery.driver}</td>
                      <td data-label="Jumlah porsi">{delivery.portions.toLocaleString('id-ID')}</td>
                      <td data-label="Jam keberangkatan">{delivery.departureTime || '—'}</td>
                      <td data-label="Status live">
                        <div className={`delivery-status status-${delivery.status.toLowerCase()}`}>
                          <span className="status-dot" />
                          {STATUS_LABELS[delivery.status] || delivery.status}
                        </div>
                        <span className="status-note">{delivery.statusNote}</span>
                      </td>
                      <td data-label="Aksi">
                        <button className="button-detail" type="button" onClick={() => setSelectedDelivery(delivery)}>Lihat detail <ChevronRight size={13} /></button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td className="table-message" colSpan="6">{error ? 'Data belum dapat ditampilkan.' : 'Tidak ada pengiriman yang sesuai dengan pencarian.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span>Menampilkan <strong>{firstRow}–{lastRow}</strong> dari <strong>{pagination?.total ?? 0}</strong> sekolah</span>
              <div className="pagination" aria-label="Halaman pengiriman">
                <button type="button" aria-label="Halaman sebelumnya" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}>
                  <ChevronLeft size={16} /><span>Sebelumnya</span>
                </button>
                <span className="page-count">{page} / {Math.max(pagination?.totalPages || 0, 1)}</span>
                <button type="button" aria-label="Halaman berikutnya" onClick={() => setPage((current) => current + 1)} disabled={page >= (pagination?.totalPages || 1) || loading}>
                  <span>Berikutnya</span><ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>

          <aside className="panel alerts-panel">
            <div className="panel-heading alert-panel-heading">
              <div>
                <h2><span className="alert-icon"><Bell size={17} /></span> Peringatan real-time</h2>
                <p>{dashboard?.alerts.length ?? 0} notifikasi <span className="bullet-separator">·</span> Operasional hari ini</p>
              </div>
              <span className="alert-count">{dashboard?.alerts.length || 0}</span>
            </div>
            <div className="alerts-list">
              {dashboard?.alerts.map((alert) => (
                <article className="alert-card" key={alert.id}>
                  <div className="alert-card-heading"><span className="alert-mark"><span /></span><h3>{alert.title}</h3></div>
                  <p className="alert-meta"><Clock3 size={12} /> {formatTime(alert.createdAt)} <span>·</span> {alert.school}</p>
                  <p className="alert-message">{alert.message}</p>
                </article>
              ))}
              {!dashboard?.alerts.length && (
                <div className="empty-alerts"><span className="empty-alert-icon"><Bell size={20} /></span><p>Belum ada peringatan aktif.</p></div>
              )}
            </div>
            <p className="alerts-footnote">Periksa status pengiriman dan tindak lanjuti klaim melalui menu Retur &amp; Klaim.</p>
          </aside>
        </div>
        <footer className="dashboard-footer">
          <span>NutriTrack MBG <span>·</span> Makanan Bergizi Gratis · SPPG Batam Center</span>
          <span>Data diperbarui otomatis saat halaman dimuat</span>
        </footer>
      </main>

      {selectedDelivery && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedDelivery(null) }}>
          <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="delivery-detail-title">
            <div className="modal-heading">
              <div><p className="eyebrow">Informasi distribusi</p><h2 id="delivery-detail-title">Detail pengiriman</h2></div>
              <button className="icon-button" type="button" aria-label="Tutup detail" onClick={() => setSelectedDelivery(null)}><X size={19} /></button>
            </div>
            <dl className="detail-list">
              <div><dt>Nama sekolah</dt><dd>{selectedDelivery.school}</dd></div>
              <div><dt>Kurir bertugas</dt><dd>{selectedDelivery.driver}</dd></div>
              <div><dt>Jumlah porsi</dt><dd>{selectedDelivery.portions.toLocaleString('id-ID')} porsi</dd></div>
              <div><dt>Jam keberangkatan</dt><dd>{selectedDelivery.departureTime || 'Belum tercatat'}</dd></div>
              <div><dt>Status pengiriman</dt><dd><span className={`delivery-status status-${selectedDelivery.status.toLowerCase()}`}><span className="status-dot" />{STATUS_LABELS[selectedDelivery.status]}</span></dd></div>
              <div><dt>Pembaruan terakhir</dt><dd>{selectedDelivery.statusNote || 'Belum ada pembaruan'}</dd></div>
              {selectedDelivery.receivedAt && <div><dt>Diterima pada</dt><dd>{selectedDelivery.receivedAt}</dd></div>}
            </dl>
            <div className="delivery-assignment">
              <label className="form-label" htmlFor="delivery-driver">Tugaskan kurir aktif</label>
              <select id="delivery-driver" className="management-input" value={selectedDriverId} onChange={(event) => setSelectedDriverId(event.target.value)}>
                <option value="">Belum ditugaskan</option>
                {assignableDrivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name} · {driver.email}</option>)}
              </select>
              {assignmentError && <p className="school-form-help" role="status">{assignmentError}</p>}
              <button className="button-primary modal-close-button" type="button" disabled={savingAssignment} onClick={assignDriver}>
                {savingAssignment ? 'Menyimpan...' : 'Simpan penugasan'}
              </button>
            </div>
            <button className="button-primary modal-close-button" type="button" onClick={() => setSelectedDelivery(null)}>Tutup</button>
          </section>
        </div>
      )}
    </>
  )
}

function MetricCard({ icon, label, value, suffix, format = false, warning = false }) {
  return (
    <article className={`metric-card${warning ? ' metric-card-warning' : ''}`}>
      <div className="metric-card-top">
        <span className={`metric-icon${warning ? ' metric-icon-warning' : ''}`}>{icon}</span>
        <span className="metric-label">{label}</span>
        {warning && Number(value) > 0 && <span className="metric-indicator" aria-label="Memerlukan tindak lanjut" />}
      </div>
      <strong className="metric-value">{value == null ? <span className="value-placeholder">—</span> : format ? value.toLocaleString('id-ID') : value}</strong>
      <span className="metric-suffix">{suffix}</span>
    </article>
  )
}

export default App
