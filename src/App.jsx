import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DesignIntake from './pages/DesignIntake'
import ProjectDetail from './pages/ProjectDetail'
import ProductionBoard from './pages/ProductionBoard'
import DeliveryBoard from './pages/DeliveryBoard'
import Inventory from './pages/Inventory'
import InvoiceScanner from './pages/InvoiceScanner'
import Calendar from './pages/Calendar'

function Gate({ children, allow }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-steel-950 flex items-center justify-center text-steel-400">Loading…</div>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <div className="min-h-screen bg-steel-950 flex items-center justify-center text-steel-400">No profile found — ask your admin to set one up for this account.</div>
  if (allow && !allow.includes(profile.department)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/cubit-flow">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Gate><Layout /></Gate>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/intake" element={<Gate allow={['design', 'admin']}><DesignIntake /></Gate>} />
            <Route path="/production" element={<Gate allow={['production', 'admin']}><ProductionBoard /></Gate>} />
            <Route path="/delivery" element={<Gate allow={['delivery', 'admin']}><DeliveryBoard /></Gate>} />
            <Route path="/inventory" element={<Gate allow={['production', 'admin']}><Inventory /></Gate>} />
            <Route path="/invoices" element={<Gate allow={['admin']}><InvoiceScanner /></Gate>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
