import { STAGES } from '../lib/pipeline'

const COLOR_CLASSES = {
  steel:  'bg-steel-700 text-steel-100',
  wait:   'bg-wait/20 text-wait border border-wait/40',
  signal: 'bg-signal/20 text-signal border border-signal/40',
  go:     'bg-go/20 text-go border border-go/40',
}

export default function StageBadge({ stage }) {
  const s = STAGES.find(s => s.key === stage)
  if (!s) return null
  return (
    <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium uppercase tracking-wide ${COLOR_CLASSES[s.color]}`}>
      {s.label}
    </span>
  )
}
