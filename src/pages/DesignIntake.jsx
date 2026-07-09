import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

export default function DesignIntake() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', address: '', email: '', phone: '', notes: '' })
  const [meetingDate, setMeetingDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      // 1. create the customer record
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .insert({ ...form, created_by: profile.id })
        .select()
        .single()
      if (custErr) throw custErr

      // 2. create the project shell, stage = new_lead
      const { data: project, error: projErr } = await supabase
        .from('projects')
        .insert({ customer_id: customer.id, stage: 'new_lead', assigned_designer: profile.id })
        .select()
        .single()
      if (projErr) throw projErr

      // 3. log the very first stage entry for the audit trail
      await supabase.from('stage_history').insert({
        project_id: project.id, from_stage: null, to_stage: 'new_lead', changed_by: profile.id,
      })

      // 4. optional: book the design meeting on the calendar
      if (meetingDate) {
        await supabase.from('appointments').insert({
          project_id: project.id,
          customer_id: customer.id,
          kind: 'design_meeting',
          scheduled_for: meetingDate,
          assigned_to: profile.id,
        })
      }

      navigate(`/project/${project.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-semibold mb-1">New Lead — First Contact</h1>
      <p className="text-steel-400 text-sm mb-6">Capture what you have. Nothing here is required except a name — you can fill the rest in as the conversation happens, and add spec details, photos, and the meeting once the project is created.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Customer name" required value={form.full_name} onChange={v => set('full_name', v)} />
        <Field label="Address" value={form.address} onChange={v => set('address', v)} />
        <Field label="Email" type="email" value={form.email} onChange={v => set('email', v)} />
        <Field label="Cell phone" type="tel" value={form.phone} onChange={v => set('phone', v)} />

        <div>
          <label className="block text-sm text-steel-300 mb-1">Notes / comments</label>
          <textarea
            value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
            className="w-full px-3 py-2 rounded bg-steel-800 border border-steel-700 text-steel-50 focus:border-signal outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-steel-300 mb-1">Book design meeting (optional)</label>
          <input
            type="datetime-local" value={meetingDate} onChange={e => setMeetingDate(e.target.value)}
            className="w-full px-3 py-2 rounded bg-steel-800 border border-steel-700 text-steel-50 focus:border-signal outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit" disabled={busy || !form.full_name}
          className="px-5 py-2.5 rounded bg-signal text-white font-medium disabled:opacity-40"
        >
          {busy ? 'Creating…' : 'Create lead'}
        </button>
        <p className="text-xs text-steel-500">Property photos and the full spec sheet can be added on the next screen.</p>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="block text-sm text-steel-300 mb-1">{label}{required && ' *'}</label>
      <input
        type={type} value={value} required={required} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded bg-steel-800 border border-steel-700 text-steel-50 focus:border-signal outline-none"
      />
    </div>
  )
}
