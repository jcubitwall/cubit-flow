import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Uploads one or more photos to the 'project-photos' storage bucket and
 * records a row in project_photos for each. Works from a camera (mobile)
 * or file picker (desktop) — the capture="environment" attribute opens
 * the rear camera directly on phones/tablets.
 */
export default function PhotoUpload({ projectId, department, stage, uploadedBy, caption, onUploaded }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setBusy(true)
    setError(null)
    try {
      for (const file of files) {
        const path = `${projectId}/${Date.now()}-${file.name}`
        const { error: upErr } = await supabase.storage.from('project-photos').upload(path, file)
        if (upErr) throw upErr
        const { error: rowErr } = await supabase.from('project_photos').insert({
          project_id: projectId,
          uploaded_by: uploadedBy,
          department,
          stage_at_time: stage,
          storage_path: path,
          caption: caption || null,
        })
        if (rowErr) throw rowErr
      }
      onUploaded?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      <label className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded border border-steel-400 text-steel-700 cursor-pointer hover:bg-steel-50">
        <span>{busy ? 'Uploading…' : 'Add photo'}</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          disabled={busy}
          onChange={handleFiles}
        />
      </label>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  )
}
