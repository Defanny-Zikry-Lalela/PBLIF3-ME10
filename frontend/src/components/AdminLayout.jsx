import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, LayoutDashboard, LogOut, Menu, PackageCheck, School, Truck, Wheat, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import useBodyScrollLock from '../hooks/useBodyScrollLock.js'

function AdminLayout({ admin, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const topbarRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  useBodyScrollLock(menuOpen)
  const links = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/nutrition', label: 'Menu & Gizi', icon: Wheat },
    { path: '/schools', label: 'Sekolah', icon: School },
    { path: '/drivers', label: 'Kurir', icon: Truck },
    { path: '/returns', label: 'Retur & Klaim', icon: Bell },
  ]

  function go(path) {
    setMenuOpen(false)
    navigate(path)
  }

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return undefined

    function handlePointerDown(event) {
      if (!topbarRef.current?.contains(event.target)) setMenuOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    function handleResize() {
      if (window.innerWidth > 820) setMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
    }
  }, [menuOpen])

  return (
    <div className="dashboard-shell">
      <header className="topbar" ref={topbarRef}>
        <button
          className="mobile-menu-button"
          type="button"
          aria-label={menuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
          aria-expanded={menuOpen}
          aria-controls="admin-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <button className="brand brand-button" type="button" onClick={() => go('/dashboard')}>
          <span className="brand-mark"><PackageCheck size={19} strokeWidth={1.9} /></span>
          <span className="brand-copy">
            <strong>NutriTrack <span>MBG</span></strong>
            <small>ADMIN SPPG BATAM CENTER</small>
          </span>
        </button>

        {menuOpen && <button className="mobile-navigation-backdrop" type="button" aria-label="Tutup navigasi" onClick={() => setMenuOpen(false)} />}

        <nav id="admin-navigation" className={`top-navigation${menuOpen ? ' top-navigation-open' : ''}`} aria-label="Navigasi utama">
          <div className="mobile-navigation-heading">
            <strong>Menu navigasi</strong>
            <button type="button" aria-label="Tutup navigasi" onClick={() => setMenuOpen(false)}><X size={18} /></button>
          </div>
          {links.map(({ path, label, icon: Icon }) => (
            <button
              className={`navigation-link${location.pathname === path ? ' navigation-link-active' : ''}`}
              key={path}
              type="button"
              aria-current={location.pathname === path ? 'page' : undefined}
              onClick={() => go(path)}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </nav>

        <div className="topbar-right">
          <span className="system-status"><span className="online-dot" /> Sistem online</span>
          <span className="topbar-divider" />
          <details className="account-menu">
            <summary>
              <span className="avatar">{admin.name.trim().charAt(0).toUpperCase()}</span>
              <span className="account-copy"><strong>{admin.name}</strong><small>Administrator</small></span>
              <ChevronDown size={14} className="account-chevron" />
            </summary>
            <button type="button" className="logout-button" onClick={onLogout}><LogOut size={16} /> Keluar</button>
          </details>
        </div>
      </header>
      {children}
    </div>
  )
}

export default AdminLayout
