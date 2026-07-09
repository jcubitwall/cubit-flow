import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import StageBadge from '../components/StageBadge'

const COLUMNS = ['production_pending', 'in_production', 'production_complete']

export default function ProductionBoard() {
  const [projects, setProjects] = useState([])

  useEffect(() => {
    supabase.from('projects').select('*, customers(full_name)').in('stage', COLUMNS).order('updated_at')
      .then(({ data }) => setProjects(data || []))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Production Board</h1>
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-4 px-4 pb-2">
        {COLUMNS.map(col => (
          <div key={col} className="snap-center shrink-0 w-[85vw] max-w-sm bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="mb-3"><StageBadge stage={col} /></div>
            <div className="space-y-2">
              {projects.filter(p => p.stage === col).map(p => (
                <Link key={p.id} to={`/project/${p.id}`} className="block bg-slate-800 rounded p-3 min-h-[44px]">
                  <p className="text-sm font-medium">{p.customers?.full_name}</p>
                  {p.serial_number && <p className="text-xs font-mono text-slate-500">{p.serial_number}</p>}
                  {p.model && <p className="text-xs text-slate-400">{p.model}</p>}
                </Link>
              ))}
              {projects.filter(p => p.stage === col).length === 0 && (
                <p className="text-sm text-slate-500 py-4 text-center">Nothing here</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 text-center mt-2">Swipe to see more stages →</p>
    </div>
  )
}
