import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

export default function InvoiceScanner() {
  const { profile } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [projects, setProjects] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    load()
    supabase.from('projects').select('id, serial_number, customers(full_name)').then(({ data }) => setProjects(data || []))
  }, [])

  async function load() {
    const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false })
    setInvoices(data || [])
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      // 1. upload the photo
      const path = `${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('invoices').upload(path, file)
      if (upErr) throw upErr

      // 2. call the edge function that sends the image to Claude for extraction
      // (see supabase/functions/extract-invoice — deploy with `supabase functions deploy extract-invoice`)
      const { data: signedUrl } = await supabase.storage.from('invoices').createSignedUrl(path, 300)
      const { data: extraction, error: fnErr } = await supabase.functions.invoke('extract-invoice', {
        body: { imageUrl: signedUrl.signedUrl },
      })
      if (fnErr) throw fnErr

      // 3. store the invoice with raw extraction for review — nothing is auto-confirmed
      const { data: invoice, error: invErr } = await supabase.from('invoices').insert({
        vendor: extraction.vendor,
        invoice_date: extraction.date,
        total_amount: extraction.total,
        storage_path: path,
        raw_extraction: extraction,
        status: 'needs_review',
        uploaded_by: profile.id,
      }).select().single()
      if (invErr) throw invErr

      if (extraction.line_items?.length) {
        await supabase.from('invoice_line_items').insert(
          extraction.line_items.map(li => ({
            invoice_id: invoice.id, description: li.description, quantity: li.quantity, unit_cost: li.unit_cost,
          }))
        )
      }
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  async function assignToProject(invoiceId, projectId) {
    await supabase.from('invoices').update({ project_id: projectId || null, status: 'confirmed' }).eq('id', invoiceId)
    load()
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">Invoice Scanner</h1>
      <p className="text-steel-400 text-sm mb-4">Photograph a receipt. Claude reads the vendor, total, and line items automatically — review before it's confirmed and assigned to a project's cost tracking.</p>

      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-signal text-white font-medium cursor-pointer mb-6">
        <span>{busy ? 'Reading invoice…' : 'Scan invoice'}</span>
        <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy} onChange={handleFile} />
      </label>
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <div className="space-y-3">
        {invoices.map(inv => (
          <div key={inv.id} className="bg-steel-900 border border-steel-800 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{inv.vendor || 'Unknown vendor'} — ${inv.total_amount ?? '—'}</p>
                <p className="text-xs text-steel-500">{inv.invoice_date} · {inv.status}</p>
              </div>
              <select
                defaultValue={inv.project_id || ''}
                onChange={e => assignToProject(inv.id, e.target.value)}
                className="px-2 py-1.5 rounded bg-steel-800 border border-steel-700 text-steel-50 text-sm"
              >
                <option value="">Assign to project…</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.serial_number || p.customers?.full_name}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
