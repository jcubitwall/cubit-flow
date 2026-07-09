import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV_BY_DEPT = {
  design:     [['/', 'Dashboard'], ['/intake', 'New Lead'], ['/calendar', 'Calendar']],
  production: [['/', 'Dashboard'], ['/production', 'Production Board']],
  delivery:   [['/', 'Dashboard'], ['/delivery', 'Delivery Board']],
  admin:      [['/', 'Dashboard'], ['/intake', 'New Lead'], ['/production', 'Production'], ['/delivery', 'Delivery'], ['/inventory', 'Inventory'], ['/invoices', 'Invoices'], ['/calendar', 'Calendar']],
}

export default function Layout() {
  const { profile, signOut } = useAuth()
  const links = NAV_BY_DEPT[profile?.department] || []

  return (
    <div className="min-h-screen bg-steel-950 text-steel-50">
      <header className="border-b border-steel-800 bg-steel-900">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl font-semibold tracking-wide">CUBIT <span className="text-signal">FLOW</span></span>
            <span className="text-xs text-steel-400 uppercase tracking-widest">{profile?.department}</span>
          </div>
          <nav className="flex items-center gap-1">
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 text-sm rounded font-medium ${isActive ? 'bg-signal text-white' : 'text-steel-200 hover:bg-steel-800'}`
                }
              >
                {label}
              </NavLink>
            ))}
            <button onClick={signOut} className="ml-2 px-3 py-2 text-sm rounded text-steel-400 hover:text-steel-100">
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
