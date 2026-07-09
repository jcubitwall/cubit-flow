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
      <h1 className="font-display text-2xl font-semibold mb-4">Production Board</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        {COLUMNS.map(col => (
          <div key={col} className="bg-steel-900 border border-steel-800 rounded-lg p-3">
            <div className="mb-3"><StageBadge stage={col} /></div>
            <div className="space-y-2">
              {projects.filter(p => p.stage === col).map(p => (
                <Link key={p.id} to={`/project/${p.id}`} className="block bg-steel-800 rounded p-2.5 hover:bg-steel-700">
                  <p className="text-sm font-medium">{p.customers?.full_name}</p>
                  {p.serial_number && <p className="text-xs font-mono text-steel-500">{p.serial_number}</p>}
                  {p.model && <p className="text-xs text-steel-400">{p.model}</p>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
