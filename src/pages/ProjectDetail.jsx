import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import StageBadge from '../components/StageBadge'
import SignaturePad from '../components/SignaturePad'
import PhotoUpload from '../components/PhotoUpload'
import { SPEC_FIELDS, canTransition, isLocked, stageLabel } from '../lib/pipeline'

export default function ProjectDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [project, setProject] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [notes, setNotes] = useState([])
  const [photos, setPhotos] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [showSignature, setShowSignature] = useState(null) // 'deposit_agreement' | 'change_order' | 'delivery_signoff'

  const load = useCallback(async () => {
    const { data: p } = await supabase.from('projects').select('*, customers(*)').eq('id', id).single()
    setProject(p)
    setCustomer(p?.customers)
    const { data: n } = await supabase.from('project_notes').select('*, profiles(full_name)').eq('project_id', id).order('created_at', { ascending: false })
    setNotes(n || [])
    const { data: ph } = await supabase.from('project_photos').select('*').eq('project_id', id).order('created_at', { ascending: false })
    setPhotos(ph || [])
    const { data: h } = await supabase.from('stage_history').select('*, profiles(full_name)').eq('project_id', id).order('created_at', { ascending: true })
    setHistory(h || [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading || !project) return <p className="text-steel-400">Loading…</p>

  const locked = isLocked(project)
  const canEditSpec = ['design', 'admin'].includes(profile.department) && !locked
  const canActProduction = profile.department === 'production' && ['in_production', 'production_complete'].includes(project.stage)
  const canActDelivery = profile.department === 'delivery' && ['delivery_pending', 'delivery_scheduled', 'delivered_installed'].includes(project.stage)

  async function updateSpec(key, value) {
    const spec = { ...project.spec, [key]: value }
    const { data } = await supabase.from('projects').update({ spec, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    setProject(data)
  }

  async function transitionTo(toStage, extra = {}) {
    const check = canTransition(project, toStage)
    if (!check.ok) { alert(check.reason); return }
    const updates = { stage: toStage, updated_at: new Date().toISOString(), ...extra }
    if (toStage === 'in_production') updates.locked = true
    const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single()
    if (error) { alert(error.message); return }
    await supabase.from('stage_history').insert({
      project_id: id, from_stage: project.stage, to_stage: toStage, changed_by: profile.id,
    })
    setProject(data)
    load()
  }

  async function addNote() {
    if (!newNote.trim()) return
    await supabase.from('project_notes').insert({
      project_id: id, author: profile.id, department: profile.department, stage_at_time: project.stage, body: newNote.trim(),
    })
    setNewNote('')
    load()
  }

  async function recordPayment(field, amount) {
    await supabase.from('projects').update({ [field]: new Date().toISOString(), quoted_price: project.quoted_price }).eq('id', id)
    load()
  }

  async function saveSignature(kind, blob) {
    const path = `${id}/${kind}-${Date.now()}.png`
    const { error: upErr } = await supabase.storage.from('signatures').upload(path, blob)
    if (upErr) { alert(upErr.message); return }
    const signerName = window.prompt('Type the signer\'s full name to confirm:')
    if (!signerName) return
    await supabase.from('signatures').insert({
      project_id: id, kind, signed_by_name: signerName, signed_by_profile: profile.id,
      image_path: path, spec_snapshot: project.spec,
    })
    setShowSignature(null)
    if (kind === 'deposit_agreement') transitionTo('production_pending', { deposit_paid_at: project.deposit_paid_at || new Date().toISOString() })
    if (kind === 'delivery_signoff') transitionTo('delivered_installed')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{customer?.full_name}</h1>
          <p className="text-steel-400 text-sm">{customer?.address}</p>
          {project.serial_number && <p className="text-xs font-mono text-steel-500 mt-1">{project.serial_number}</p>}
        </div>
        <StageBadge stage={project.stage} />
      </div>

      {/* CUSTOMER CONTACT INFO */}
      <Section title="Customer Info">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Email" value={customer?.email} />
          <Info label="Phone" value={customer?.phone} />
        </div>
        {customer?.notes && <p className="text-sm text-steel-300 mt-2">{customer.notes}</p>}
      </Section>

      {/* SPEC SHEET */}
      <Section title="Home Spec" note={locked ? 'Locked — build is in production. Contact design to submit a signed change order before this stage.' : null}>
        <div className="grid sm:grid-cols-2 gap-3">
          {SPEC_FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-xs text-steel-400 mb-1">{f.label}</label>
              {f.type === 'select' ? (
                <select
                  disabled={!canEditSpec}
                  value={project.spec?.[f.key] || ''}
                  onChange={e => updateSpec(f.key, e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-steel-800 border border-steel-700 text-steel-50 disabled:opacity-50 text-sm"
                >
                  <option value="">—</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  disabled={!canEditSpec}
                  value={project.spec?.[f.key] || ''}
                  onChange={e => updateSpec(f.key, e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-steel-800 border border-steel-700 text-steel-50 disabled:opacity-50 text-sm"
                />
              )}
            </div>
          ))}
        </div>
      </Section>
      {['design', 'admin'].includes(profile.department) && project.stage === 'new_lead' && (
        <Section title="Start Design">
          <p className="text-sm text-slate-400 mb-3">Once the customer arrives and you begin filling out the spec sheet, move this lead into Design.</p>
          <button onClick={() => transitionTo('design')} className="px-3 py-2 text-sm rounded bg-orange-600 text-white font-medium">
            Start Design Meeting →
          </button>
        </Section>
      )}


      {/* DEPOSIT + SIGNING — design dept, while in design/deposit_pending */}
      {['design', 'admin'].includes(profile.department) && ['design', 'deposit_pending'].includes(project.stage) && (
        <Section title="Deposit & Sign-Off (25%)">
          <div className="flex items-end gap-3 mb-3">
            <div>
              <label className="block text-xs text-steel-400 mb-1">Quoted price ($)</label>
              <input type="number" value={project.quoted_price || ''} onChange={async e => {
                const { data } = await supabase.from('projects').update({ quoted_price: e.target.value || null }).eq('id', id).select().single()
                setProject(data)
              }} className="px-2 py-1.5 rounded bg-steel-800 border border-steel-700 text-steel-50 text-sm w-32" />
            </div>
            <div>
              <label className="block text-xs text-steel-400 mb-1">Deposit due (25%)</label>
              <input type="number" value={project.deposit_amount || (project.quoted_price ? (project.quoted_price * 0.25).toFixed(2) : '')} onChange={async e => {
                const { data } = await supabase.from('projects').update({ deposit_amount: e.target.value || null }).eq('id', id).select().single()
                setProject(data)
              }} className="px-2 py-1.5 rounded bg-steel-800 border border-steel-700 text-steel-50 text-sm w-32" />
            </div>
          </div>
          {!project.deposit_paid_at ? (
       <button onClick={() => transitionTo('deposit_pending', { deposit_paid_at: new Date().toISOString() })} className="px-3 py-2 text-sm rounded bg-wait text-steel-950 font-medium">
              Mark deposit as paid
            </button>
          ) : (
            <p className="text-sm text-go mb-3">Deposit recorded paid {new Date(project.deposit_paid_at).toLocaleString()}.</p>
          )}
          {project.deposit_paid_at && !showSignature && (
            <button onClick={() => setShowSignature('deposit_agreement')} className="px-3 py-2 text-sm rounded bg-signal text-white font-medium">
              Collect customer signature
            </button>
          )}
          {showSignature === 'deposit_agreement' && (
            <SignaturePad label="Customer signature — deposit agreement" onSave={blob => saveSignature('deposit_agreement', blob)} />
          )}
        </Section>
      )}

      {/* CHANGE ORDER while production_pending */}
      {['design', 'admin'].includes(profile.department) && project.stage === 'production_pending' && (
        <Section title="Change Order">
          <p className="text-sm text-steel-400 mb-2">Customer can still request changes. Edit the spec above, then both parties re-sign below.</p>
          {!showSignature && (
            <button onClick={() => setShowSignature('change_order')} className="px-3 py-2 text-sm rounded bg-signal text-white font-medium">
              Collect change-order signature
            </button>
          )}
          {showSignature === 'change_order' && (
            <SignaturePad label="Customer signature — change order" onSave={blob => saveSignature('change_order', blob)} />
          )}
          <div className="mt-3">
            <button onClick={() => transitionTo('in_production')} className="px-3 py-2 text-sm rounded bg-steel-700 text-steel-50 font-medium">
              Send to Production →
            </button>
          </div>
        </Section>
      )}

      {/* PRODUCTION */}
      {(profile.department === 'production' || profile.department === 'admin') && ['in_production', 'production_complete'].includes(project.stage) && (
        <Section title="Production">
          {project.stage === 'in_production' && (
            <button onClick={() => transitionTo('production_complete')} className="px-3 py-2 text-sm rounded bg-go text-steel-950 font-medium mb-3">
              Mark production complete
            </button>
          )}
          <PhotoUpload projectId={id} department="production" stage={project.stage} uploadedBy={profile.id} onUploaded={load} />
        </Section>
      )}

      {/* 75% PAYMENT + move to delivery_pending */}
      {profile.department === 'admin' && project.stage === 'production_complete' && (
        <Section title="75% Payment">
          {!project.balance_75_paid_at ? (
            <button onClick={() => recordPayment('balance_75_paid_at')} className="px-3 py-2 text-sm rounded bg-wait text-steel-950 font-medium">
              Mark 75% paid
            </button>
          ) : (
            <>
              <p className="text-sm text-go mb-3">75% payment recorded {new Date(project.balance_75_paid_at).toLocaleString()}.</p>
              <button onClick={() => transitionTo('delivery_pending')} className="px-3 py-2 text-sm rounded bg-signal text-white font-medium">
                Move to Delivery Pending →
              </button>
            </>
          )}
        </Section>
      )}

      {/* DELIVERY SCHEDULING */}
      {canActDelivery && project.stage === 'delivery_pending' && (
        <Section title="Schedule Delivery">
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs text-steel-400 mb-1">Delivery date</label>
              <input type="date" value={project.delivery_date || ''} onChange={async e => {
                const { data } = await supabase.from('projects').update({ delivery_date: e.target.value }).eq('id', id).select().single()
                setProject(data)
              }} className="px-2 py-1.5 rounded bg-steel-800 border border-steel-700 text-steel-50 text-sm" />
            </div>
            <button onClick={() => transitionTo('delivery_scheduled')} className="px-3 py-2 text-sm rounded bg-signal text-white font-medium">
              Confirm schedule
            </button>
          </div>
        </Section>
      )}

      {/* FINAL PAYMENT + DELIVERY SIGN-OFF */}
      {canActDelivery && project.stage === 'delivery_scheduled' && (
        <Section title="Final Payment & Delivery">
          {!project.final_payment_paid_at ? (
            <button onClick={() => recordPayment('final_payment_paid_at')} className="px-3 py-2 text-sm rounded bg-wait text-steel-950 font-medium mb-3">
              Mark final payment received
            </button>
          ) : (
            <p className="text-sm text-go mb-3">Final payment recorded {new Date(project.final_payment_paid_at).toLocaleString()}.</p>
          )}
          <PhotoUpload projectId={id} department="delivery" stage={project.stage} uploadedBy={profile.id} caption="Site / foundation / placement" onUploaded={load} />
          {project.final_payment_paid_at && (
            <div className="mt-3">
              {!showSignature ? (
                <button onClick={() => setShowSignature('delivery_signoff')} className="px-3 py-2 text-sm rounded bg-signal text-white font-medium">
                  Collect customer sign-off
                </button>
              ) : (
                <SignaturePad label="Customer signature — home installed successfully" onSave={blob => saveSignature('delivery_signoff', blob)} />
              )}
            </div>
          )}
        </Section>
      )}

      {project.stage === 'delivered_installed' && (
        <Section title="Delivered & Installed">
          <p className="text-sm text-go">This home is complete. Upload any final install photos below.</p>
          <div className="mt-2">
            <PhotoUpload projectId={id} department={profile.department} stage={project.stage} uploadedBy={profile.id} onUploaded={load} />
          </div>
        </Section>
      )}

      {/* PHOTOS GALLERY */}
      {photos.length > 0 && (
        <Section title={`Photos (${photos.length})`}>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map(p => <PhotoThumb key={p.id} photo={p} />)}
          </div>
        </Section>
      )}

      {/* NOTES */}
      <Section title="Notes">
        <div className="flex gap-2 mb-3">
          <input
            value={newNote} onChange={e => setNewNote(e.target.value)}
            placeholder="Add a note…"
            className="flex-1 px-3 py-2 rounded bg-steel-800 border border-steel-700 text-steel-50 text-sm"
          />
          <button onClick={addNote} className="px-3 py-2 text-sm rounded bg-steel-700 text-steel-50 font-medium">Add</button>
        </div>
        <div className="space-y-2">
          {notes.map(n => (
            <div key={n.id} className="text-sm border-l-2 border-steel-700 pl-3">
              <p className="text-steel-200">{n.body}</p>
              <p className="text-xs text-steel-500">{n.profiles?.full_name} · {n.department} · {new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* AUDIT TRAIL */}
      <Section title="Stage History">
        <ol className="space-y-1 text-sm text-steel-400">
          {history.map(h => (
            <li key={h.id}>
              {new Date(h.created_at).toLocaleString()} — {stageLabel(h.to_stage)} <span className="text-steel-600">({h.profiles?.full_name})</span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  )
}

function Section({ title, note, children }) {
  return (
    <section className="bg-steel-900 border border-steel-800 rounded-lg p-4">
      <h2 className="font-display text-lg font-semibold mb-3">{title}</h2>
      {note && <p className="text-xs text-wait mb-3">{note}</p>}
      {children}
    </section>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-steel-500">{label}</p>
      <p className="text-steel-200">{value || '—'}</p>
    </div>
  )
}

function PhotoThumb({ photo }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    supabase.storage.from('project-photos').createSignedUrl(photo.storage_path, 3600).then(({ data }) => setUrl(data?.signedUrl))
  }, [photo.storage_path])
  if (!url) return <div className="aspect-square bg-steel-800 rounded animate-pulse" />
  return <img src={url} alt={photo.caption || ''} className="aspect-square object-cover rounded" />
}
