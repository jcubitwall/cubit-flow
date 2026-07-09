// ============================================================
// The pipeline state machine.
// This file is the one place that defines "what stage comes next"
// and "who is allowed to move a project there". Both the UI and
// any future backend validation should read from here rather than
// hardcoding stage logic elsewhere.
// ============================================================

export const STAGES = [
  { key: 'new_lead',            label: 'New Lead',            dept: 'design',     color: 'steel' },
  { key: 'design',              label: 'Design & Spec',        dept: 'design',     color: 'steel' },
  { key: 'deposit_pending',     label: 'Deposit Pending',      dept: 'design',     color: 'wait'  },
  { key: 'production_pending',  label: 'Production Pending',   dept: 'design',     color: 'wait'  },
  { key: 'in_production',       label: 'In Production',        dept: 'production', color: 'signal'},
  { key: 'production_complete', label: 'Production Complete',  dept: 'production', color: 'wait'  },
  { key: 'delivery_pending',    label: 'Delivery Pending',     dept: 'delivery',   color: 'wait'  },
  { key: 'delivery_scheduled',  label: 'Delivery Scheduled',   dept: 'delivery',   color: 'signal'},
  { key: 'delivered_installed', label: 'Delivered & Installed',dept: 'delivery',   color: 'go'    },
]

export const stageIndex = (key) => STAGES.findIndex(s => s.key === key)
export const stageLabel = (key) => STAGES.find(s => s.key === key)?.label ?? key

// Forward-only transitions, plus the two explicit "back to design pending"
// loops your workflow described (change orders while production_pending).
export const ALLOWED_TRANSITIONS = {
  new_lead:            ['design'],
  design:              ['deposit_pending'],
  deposit_pending:     ['production_pending'],
  production_pending:  ['in_production', 'production_pending'], // change order re-signs, stays in this stage
  in_production:       ['production_complete'],
  production_complete: ['delivery_pending'],
  delivery_pending:    ['delivery_scheduled'],
  delivery_scheduled:  ['delivered_installed'],
  delivered_installed: [],
}

// Guard conditions — what must be true on the project record before a
// transition is allowed. The UI checks these and disables the action
// with an explanation if unmet; treat this as UX guidance, not a security
// boundary (RLS in schema.sql is the real enforcement layer).
export function canTransition(project, toStage) {
  const from = project.stage
  if (!ALLOWED_TRANSITIONS[from]?.includes(toStage)) {
    return { ok: false, reason: `Cannot move from ${stageLabel(from)} to ${stageLabel(toStage)}.` }
  }
  if (toStage === 'production_pending' && from === 'deposit_pending') {
    if (!project.deposit_paid_at) return { ok: false, reason: '25% deposit has not been recorded as paid yet.' }
  }
  if (toStage === 'in_production') {
    // once here, design fields lock — the UI should confirm this explicitly
  }
  if (toStage === 'delivery_pending') {
    if (!project.balance_75_paid_at) return { ok: false, reason: '75% payment has not been recorded yet.' }
  }
  if (toStage === 'delivery_scheduled') {
    if (!project.delivery_date) return { ok: false, reason: 'No delivery date has been scheduled yet.' }
  }
  if (toStage === 'delivered_installed') {
    if (!project.final_payment_paid_at) return { ok: false, reason: 'Final payment has not been recorded as paid yet.' }
  }
  return { ok: true }
}

export function isLocked(project) {
  // Design/spec fields become read-only once the shop starts building.
  return stageIndex(project.stage) >= stageIndex('in_production')
}

// The spec sheet fields captured during the design meeting.
// Kept as a flat schema so it's trivial to add a field later —
// just add it here and to the DesignIntake form; it's all stored
// in the single projects.spec jsonb column.
export const SPEC_FIELDS = [
  { key: 'home_type',        label: 'Home Type / Model', type: 'select', options: ['LifePod','Nest','Panorama','Cove','Haven','Expanse','Kargo Pod'] },
  { key: 'siding_color',     label: 'Siding Colour',     type: 'text' },
  { key: 'countertop',       label: 'Countertop Selection', type: 'text' },
  { key: 'wall_panels',      label: 'Wall Panel Selection', type: 'text' },
  { key: 'package',          label: 'Package Design', type: 'text' },
  { key: 'floor_color',      label: 'Floor Colour', type: 'text' },
  { key: 'floor_type',       label: 'Floor Type', type: 'text' },
  { key: 'wall_type',        label: 'Wall Type', type: 'text' },
  { key: 'ceiling_design',   label: 'Ceiling Design', type: 'text' },
]

export const DEPARTMENTS = ['design', 'production', 'delivery', 'admin']
