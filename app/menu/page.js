'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout'

const CATEGORIES = ['thali', 'rice', 'roti', 'snacks', 'dessert', 'beverage']
const CAT_EMOJI = { thali: '🍛', rice: '🍚', roti: '🥙', snacks: '🍟', dessert: '🍰', beverage: '☕' }

function getTomorrow() {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
}

export default function MenuManager() {
    const [items, setItems] = useState([])
    const [tomorrowMenu, setTomorrowMenu] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [form, setForm] = useState({
        name: '', description: '', category: 'thali', price: '',
        is_veg: true, is_spicy: false, plan_type: 'both'
    })

    useEffect(() => { fetchAll() }, [])

    async function fetchAll() {
        setLoading(true)
        const { data: itemsData } = await supabase
            .from('menu_items')
            .select('*')
            .not('name', 'ilike', '%(Deleted)%')
            .order('display_order')

        const { data: tomorrowData } = await supabase
            .from('daily_menu')
            .select('item_id')
            .eq('menu_date', getTomorrow())

        if (itemsData) setItems(itemsData)
        if (tomorrowData) setTomorrowMenu(tomorrowData.map(d => d.item_id))
        setLoading(false)
    }

    function showMessage(text) {
        setMessage(text)
        setTimeout(() => setMessage(''), 3000)
    }

    async function toggleAvailable(id, currentVal) {
        const newVal = !currentVal
        const { error } = await supabase
            .from('menu_items')
            .update({ is_available: newVal })
            .eq('id', id)

        if (error) {
            showMessage(`Error: ${error.message}`)
            return
        }

        // Also remove from daily_menu if hiding it
        if (!newVal) {
            await supabase
                .from('daily_menu')
                .delete()
                .eq('item_id', id)
                .gte('menu_date', getTomorrow())
        }

        showMessage(newVal ? '✓ Item enabled' : '✓ Item hidden from app')
        fetchAll()
    }

    async function saveItem() {
        if (!form.name || !form.price) {
            showMessage('Please fill in name and price')
            return
        }
        setSaving(true)
        const { data, error } = await supabase
            .from('menu_items')
            .insert({
                ...form,
                price: parseFloat(form.price),
                display_order: items.length + 1,
                is_available: true,
            })
            .select()
            .single()

        if (error) {
            showMessage(`Error: ${error.message}`)
            setSaving(false)
            return
        }

        // Auto-add to tomorrow's menu so it appears in app immediately
        await supabase.from('daily_menu').upsert({
            menu_date: getTomorrow(),
            item_id: data.id,
            is_special: false,
        })

        setForm({ name: '', description: '', category: 'thali', price: '', is_veg: true, is_spicy: false, plan_type: 'both' })
        setShowForm(false)
        showMessage('✓ Item added and available for tomorrow')
        fetchAll()
        setSaving(false)
    }

    async function addToTomorrowMenu(itemId) {
        const { error } = await supabase
            .from('daily_menu')
            .upsert({
                menu_date: getTomorrow(),
                item_id: itemId,
                is_special: false,
            }, { onConflict: 'menu_date,item_id' })

        if (error) {
            showMessage(`Error: ${error.message}`)
            return
        }
        showMessage("✓ Added to tomorrow's menu")
        fetchAll()
    }

    async function removeFromTomorrow(itemId) {
        const { error } = await supabase
            .from('daily_menu')
            .delete()
            .eq('item_id', itemId)
            .eq('menu_date', getTomorrow())

        if (error) {
            showMessage(`Error: ${error.message}`)
            return
        }
        showMessage("✓ Removed from tomorrow's menu")
        fetchAll()
    }

    async function deleteItem(id) {
        if (!confirm('Remove this item? It will be hidden from the app but past order records will be preserved.')) return

        // Remove from upcoming daily_menu entries
        await supabase.from('daily_menu').delete().eq('item_id', id).gte('menu_date', getTomorrow())

        // Soft delete: mark as unavailable and tag as deleted
        const { error } = await supabase
            .from('menu_items')
            .update({
                is_available: false,
                name: items.find(i => i.id === id)?.name + ' (Deleted)',
            })
            .eq('id', id)

        if (error) {
            showMessage(`Error: ${error.message}`)
            return
        }
        showMessage('✓ Item removed from menu')
        fetchAll()
    }

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Menu Manager</h1>
                    <p className="text-gray-500 text-sm mt-1">{items.length} items · {tomorrowMenu.length} on tomorrow's menu</p>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700">
                    + Add Item
                </button>
            </div>

            {/* Toast message */}
            {message && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
                    {message}
                </div>
            )}

            {showForm && (
                <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">New Menu Item</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Name *</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white" placeholder="Item name"
                                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Price (₹) *</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white" placeholder="150" type="number"
                                value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Description</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white" placeholder="What's in it?"
                                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Category</label>
                            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
                                value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Plan Type</label>
                            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
                                value={form.plan_type} onChange={e => setForm({ ...form, plan_type: e.target.value })}>
                                <option value="both">Both (Lunch & Snack)</option>
                                <option value="lunch">Lunch only</option>
                                <option value="snack">Snack only</option>
                            </select>
                        </div>
                        <div className="flex gap-6 items-center pt-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={form.is_veg}
                                    onChange={e => setForm({ ...form, is_veg: e.target.checked })}
                                    className="accent-green-600" />
                                Vegetarian
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={form.is_spicy}
                                    onChange={e => setForm({ ...form, is_spicy: e.target.checked })}
                                    className="accent-orange-600" />
                                Spicy
                            </label>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={saveItem} disabled={saving}
                            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save & Add to Tomorrow'}
                        </button>
                        <button onClick={() => setShowForm(false)}
                            className="border border-gray-200 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">All Items</h2>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {items.map(item => {
                            const onTomorrow = tomorrowMenu.includes(item.id)
                            return (
                                <div key={item.id} className="px-4 md:px-6 py-4 flex items-center gap-3 md:gap-4 flex-wrap">
                                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-xl flex-shrink-0">
                                        {CAT_EMOJI[item.category] || '🍽️'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                            {item.is_veg && <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">Veg</span>}
                                            {item.is_spicy && <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Spicy</span>}
                                            {onTomorrow && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold">📅 Tomorrow</span>}
                                            {!item.is_available && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Hidden</span>}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</div>
                                    </div>
                                    <div className="text-sm font-bold text-orange-600 flex-shrink-0">₹{item.price}</div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {onTomorrow ? (
                                            <button onClick={() => removeFromTomorrow(item.id)}
                                                className="text-xs text-red-600 hover:text-red-700 border border-red-200 px-2 py-1 rounded whitespace-nowrap">
                                                − Remove Tomorrow
                                            </button>
                                        ) : (
                                            <button onClick={() => addToTomorrowMenu(item.id)}
                                                className="text-xs text-blue-600 hover:underline border border-blue-200 px-2 py-1 rounded whitespace-nowrap">
                                                + Tomorrow
                                            </button>
                                        )}

                                        <button
                                            onClick={() => toggleAvailable(item.id, item.is_available)}
                                            className={`text-xs px-2 py-1 rounded whitespace-nowrap font-medium
                        ${item.is_available
                                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                                    : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                            {item.is_available ? '✓ Visible' : '✕ Hidden'}
                                        </button>

                                        <button onClick={() => deleteItem(item.id)} className="text-xs text-red-400 hover:text-red-600 px-2">✕</button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
