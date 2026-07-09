import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import StageBadge from '../components/StageBadge'
import { STAGES } from '../lib/pipeline'

// Which stages are relevant to land on the dashboard for each department —
// mirrors the RLS policies, just for display grouping/emphasis.
const RELEVANT_STAGES = {
  design:     ['new_lead', 'design', 'deposit_pending', 'production_pending'],
  production: ['production_pending', 'in_production', 'production_complete'],
  delivery:   ['delivery_pending', 'delivery_scheduled', 'delivered_installed'],
  admin:      STAGES.map(s => s.key),
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*, customers(full_name, address, phone)')
      .order('updated_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  const relevant = RELEVANT_STAGES[profile?.department] || []
  const shown = projects.filter(p => relevant.includes(p.stage))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-semibold">Active Projects</h1>
        {loading && <span className="text-steel-400 text-sm">Loading…</span>}
      </div>

      {!loading && shown.length === 0 && (
        <div className="border border-dashed border-steel-700 rounded-lg p-8 text-center text-steel-400">
          Nothing in your queue right now.
        </div>
      )}

      <div className="grid gap-3">
        {shown.map(p => (
          <Link
            key={p.id}
            to={`/project/${p.id}`}
            className="block bg-steel-900 border border-steel-800 rounded-lg p-4 hover:border-signal transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-steel-50">{p.customers?.full_name || 'Unnamed customer'}</p>
                <p className="text-sm text-steel-400">{p.customers?.address}</p>
                {p.serial_number && <p className="text-xs text-steel-500 font-mono mt-1">{p.serial_number}</p>}
              </div>
              <StageBadge stage={p.stage} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
