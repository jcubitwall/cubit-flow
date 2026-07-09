import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Simple inline icons — no extra dependency needed.
const icons = {
  home: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#e0672a' : '#8695a8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" />
    </svg>
  ),
  plus: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#e0672a' : '#8695a8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
    </svg>
  ),
  calendar: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#e0672a' : '#8695a8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  hammer: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#e0672a' : '#8695a8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 12l-8.5 8.5a2.1 2.1 0 1 1-3-3L12 9" /><path d="M17.64 15 22 10.64" /><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91" />
    </svg>
  ),
  truck: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#e0672a' : '#8695a8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  box: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#e0672a' : '#8695a8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="M3.3 7 12 12l8.7-5M12 22V12" />
    </svg>
  ),
  receipt: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#e0672a' : '#8695a8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  ),
}

const NAV_BY_DEPT = {
  design:     [['/', 'Home', 'home'], ['/intake', 'New Lead', 'plus'], ['/calendar', 'Calendar', 'calendar']],
  production: [['/', 'Home', 'home'], ['/production', 'Board', 'hammer']],
  delivery:   [['/', 'Home', 'home'], ['/delivery', 'Board', 'truck']],
  admin:      [['/', 'Home', 'home'], ['/production', 'Prod', 'hammer'], ['/delivery', 'Deliv', 'truck'], ['/inventory', 'Stock', 'box'], ['/invoices', 'Invoices', 'receipt']],
}

export default function BottomNav() {
  const { profile } = useAuth()
  const links = NAV_BY_DEPT[profile?.department] || []

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
    >
      {links.map(([to, label, icon]) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className="flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[64px] min-h-[52px]"
        >
          {({ isActive }) => (
            <>
              {icons[icon](isActive)}
              <span className={`text-[11px] font-medium ${isActive ? 'text-orange-500' : 'text-slate-400'}`}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
