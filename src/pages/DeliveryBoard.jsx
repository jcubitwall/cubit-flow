import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import StageBadge from '../components/StageBadge'

const COLUMNS = ['delivery_pending', 'delivery_scheduled', 'delivered_installed']

export default function DeliveryBoard() {
  const [projects, setProjects] = useState([])

  useEffect(() => {
    supabase.from('projects').select('*, customers(full_name, address)').in('stage', COLUMNS).order('delivery_date')
      .then(({ data }) => setProjects(data || []))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Delivery Board</h1>
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-4 px-4 pb-2">
        {COLUMNS.map(col => (
          <div key={col} className="snap-center shrink-0 w-[85vw] max-w-sm bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="mb-3"><StageBadge stage={col} /></div>
            <div className="space-y-2">
              {projects.filter(p => p.stage === col).map(p => (
                <Link key={p.id} to={`/project/${p.id}`} className="block bg-slate-800 rounded p-3 min-h-[44px]">
                  <p className="text-sm font-medium">{p.customers?.full_name}</p>
                  <p className="text-xs text-slate-400">{p.customers?.address}</p>
                  {p.delivery_date && <p className="text-xs text-orange-500 mt-1">{p.delivery_date}</p>}
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
