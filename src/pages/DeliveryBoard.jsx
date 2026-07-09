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
      <h1 className="font-display text-2xl font-semibold mb-4">Delivery Board</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        {COLUMNS.map(col => (
          <div key={col} className="bg-steel-900 border border-steel-800 rounded-lg p-3">
            <div className="mb-3"><StageBadge stage={col} /></div>
            <div className="space-y-2">
              {projects.filter(p => p.stage === col).map(p => (
                <Link key={p.id} to={`/project/${p.id}`} className="block bg-steel-800 rounded p-2.5 hover:bg-steel-700">
                  <p className="text-sm font-medium">{p.customers?.full_name}</p>
                  <p className="text-xs text-steel-400">{p.customers?.address}</p>
                  {p.delivery_date && <p className="text-xs text-signal mt-1">{p.delivery_date}</p>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
