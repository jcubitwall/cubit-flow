import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Calendar() {
  const [appointments, setAppointments] = useState([])

  useEffect(() => {
    supabase
      .from('appointments')
      .select('*, customers(full_name), projects(id)')
      .gte('scheduled_for', new Date(Date.now() - 86400000).toISOString())
      .order('scheduled_for')
      .then(({ data }) => setAppointments(data || []))
  }, [])

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-4">Upcoming Appointments</h1>
      <div className="space-y-2">
        {appointments.map(a => (
          <div key={a.id} className="bg-steel-900 border border-steel-800 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="font-medium">{a.customers?.full_name} — {a.kind.replace('_', ' ')}</p>
              <p className="text-sm text-steel-400">{new Date(a.scheduled_for).toLocaleString()}</p>
            </div>
            {a.projects?.id && (
              <Link to={`/project/${a.projects.id}`} className="text-sm text-signal hover:underline">View project</Link>
            )}
          </div>
        ))}
        {appointments.length === 0 && <p className="text-steel-400">No upcoming appointments.</p>}
      </div>
    </div>
  )
}
