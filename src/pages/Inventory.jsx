import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

export default function Inventory() {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('')
  const [newItem, setNewItem] = useState({ name: '', category: '', sku: '' })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('inventory_items').select('*').order('category').order('name')
    setItems(data || [])
  }

  async function adjust(item, delta) {
    const qty = Number(item.quantity_on_hand) + delta
    await supabase.from('inventory_items').update({ quantity_on_hand: qty, updated_at: new Date().toISOString() }).eq('id', item.id)
    await supabase.from('inventory_movements').insert({
      item_id: item.id, change_qty: delta, reason: 'adjustment', created_by: profile.id,
    })
    load()
  }

  async function addItem(e) {
    e.preventDefault()
    if (!newItem.name) return
    await supabase.from('inventory_items').insert(newItem)
    setNewItem({ name: '', category: '', sku: '' })
    load()
  }

  const shown = items.filter(i => !filter || i.category === filter)
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))]

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-4">Inventory</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilter('')} className={`px-3 py-1.5 text-sm rounded ${!filter ? 'bg-signal text-white' : 'bg-steel-800 text-steel-300'}`}>All</button>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 text-sm rounded ${filter === c ? 'bg-signal text-white' : 'bg-steel-800 text-steel-300'}`}>{c}</button>
        ))}
      </div>

      <div className="bg-steel-900 border border-steel-800 rounded-lg overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-steel-800 text-steel-400 text-left">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">On hand</th>
              <th className="px-3 py-2">Cost/unit</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {shown.map(i => (
              <tr key={i.id} className={`border-t border-steel-800 ${Number(i.quantity_on_hand) <= Number(i.reorder_threshold || 0) ? 'bg-signal/10' : ''}`}>
                <td className="px-3 py-2">{i.name}</td>
                <td className="px-3 py-2 font-mono text-steel-500">{i.sku}</td>
                <td className="px-3 py-2">{i.quantity_on_hand} {i.unit}</td>
                <td className="px-3 py-2">{i.cost_per_unit ? `$${i.cost_per_unit}` : '—'}</td>
                <td className="px-3 py-2 flex gap-1">
                  <button onClick={() => adjust(i, -1)} className="px-2 py-1 bg-steel-700 rounded">−</button>
                  <button onClick={() => adjust(i, 1)} className="px-2 py-1 bg-steel-700 rounded">+</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={addItem} className="flex gap-2 flex-wrap items-end">
        <div>
          <label className="block text-xs text-steel-400 mb-1">New item name</label>
          <input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="px-2 py-1.5 rounded bg-steel-800 border border-steel-700 text-steel-50 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-steel-400 mb-1">Category</label>
          <input value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className="px-2 py-1.5 rounded bg-steel-800 border border-steel-700 text-steel-50 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-steel-400 mb-1">SKU</label>
          <input value={newItem.sku} onChange={e => setNewItem({ ...newItem, sku: e.target.value })} className="px-2 py-1.5 rounded bg-steel-800 border border-steel-700 text-steel-50 text-sm" />
        </div>
        <button type="submit" className="px-3 py-2 text-sm rounded bg-signal text-white font-medium">Add item</button>
      </form>
    </div>
  )
}
