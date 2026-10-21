import { useState } from 'react'
import { Bell, ChevronDown, LayoutDashboard, LogOut, Menu, PackageCheck, School, Truck, Wheat, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

function AdminLayout({ admin, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
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

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <button className="brand brand-button" type="button" onClick={() => go('/dashboard')}>
          <span className="brand-mark"><PackageCheck size={19} strokeWidth={1.9} /></span>
          <span className="brand-copy">
            <strong>NutriTrack <span>MBG</span></strong>
            <small>ADMIN SPPG BATAM CENTER</small>
          </span>
        </button>

        <button
          className="mobile-menu-button"
          type="button"
          aria-label={menuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={`top-navigation${menuOpen ? ' top-navigation-open' : ''}`} aria-label="Navigasi utama">
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
