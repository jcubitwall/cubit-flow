import { Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import BottomNav from './BottomNav'

export default function Layout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header
        className="border-b border-slate-800 bg-slate-900 sticky top-0 z-40"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-wide">CUBIT <span className="text-orange-500">FLOW</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 uppercase tracking-widest">{profile?.department}</span>
            <button onClick={signOut} className="text-sm text-slate-400 min-h-[44px] px-2">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="px-4 py-4 pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
