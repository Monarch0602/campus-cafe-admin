'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout'

const CATEGORIES = ['breakfast', 'lunch', 'snacks', 'beverage']
const CAT_EMOJI = { breakfast: '🥐', lunch: '🍱', snacks: '🍟', beverage: '☕' }

const EMPTY_FORM = {
    name: '', description: '', category: 'breakfast', price: '',
    is_veg: true, is_spicy: false, plan_type: 'breakfast', image_url: ''
}

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
    const [editingId, setEditingId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [form, setForm] = useState(EMPTY_FORM)

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
            .select('item_id, is_special')
            .eq('menu_date', getTomorrow())

        if (itemsData) setItems(itemsData)
        if (tomorrowData) setTomorrowMenu(tomorrowData)
        setLoading(false)
    }

    function showMessage(text) {
        setMessage(text)
        setTimeout(() => setMessage(''), 3000)
    }

    function startEdit(item) {
        setEditingId(item.id)
        setForm({
            name: item.name || '',
            description: item.description || '',
            category: item.category || 'breakfast',
            price: item.price?.toString() || '',
            is_veg: item.is_veg ?? true,
            is_spicy: item.is_spicy ?? false,
            plan_type: item.plan_type || 'breakfast',
            image_url: item.image_url || '',
        })
        setShowForm(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    function cancelForm() {
        setShowForm(false)
        setEditingId(null)
        setForm(EMPTY_FORM)
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

        if (editingId) {
            const { error } = await supabase
                .from('menu_items')
                .update({
                    ...form,
                    price: parseFloat(form.price),
                })
                .eq('id', editingId)

            if (error) {
                showMessage(`Error: ${error.message}`)
                setSaving(false)
                return
            }
            showMessage('✓ Item updated')
        } else {
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

            await supabase.from('daily_menu').upsert({
                menu_date: getTomorrow(),
                item_id: data.id,
                is_special: false,
            })

            showMessage('✓ Item added and available for tomorrow')
        }

        setForm(EMPTY_FORM)
        setShowForm(false)
        setEditingId(null)
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

    async function toggleSpecial(itemId) {
        const current = tomorrowMenu.find(t => t.item_id === itemId)
        if (!current) {
            showMessage('Add item to tomorrow first')
            return
        }

        // If marking this as special, remove special flag from all others first
        if (!current.is_special) {
            await supabase
                .from('daily_menu')
                .update({ is_special: false })
                .eq('menu_date', getTomorrow())
        }

        const { error } = await supabase
            .from('daily_menu')
            .update({ is_special: !current.is_special })
            .eq('menu_date', getTomorrow())
            .eq('item_id', itemId)

        if (error) {
            showMessage(`Error: ${error.message}`)
            return
        }
        showMessage(current.is_special ? '✓ Special removed' : "⭐ Set as tomorrow's special")
        fetchAll()
    }

    async function deleteItem(id) {
        if (!confirm('Remove this item? It will be hidden from the app but past order records will be preserved.')) return

        await supabase.from('daily_menu').delete().eq('item_id', id).gte('menu_date', getTomorrow())

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
                <button onClick={() => { if (showForm) cancelForm(); else setShowForm(true) }}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700">
                    {showForm ? 'Cancel' : '+ Add Item'}
                </button>
            </div>

            {message && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
                    {message}
                </div>
            )}

            {showForm && (
                <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">
                        {editingId ? '✏️ Edit Menu Item' : '➕ New Menu Item'}
                    </h3>
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
                        <div className="md:col-span-2">
                            <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Image URL (optional)</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white" placeholder="https://example.com/image.jpg"
                                value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
                            {form.image_url && (
                                <img src={form.image_url} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-lg border"
                                    onError={(e) => e.target.style.display = 'none'} />
                            )}
                            <p className="text-xs text-gray-400 mt-1">Tip: Upload your image to <a href="https://imgbb.com" target="_blank" className="text-blue-600 underline">imgbb.com</a> for free, then paste the direct link here</p>
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
                                <option value="breakfast">Breakfast</option>
                                <option value="lunch">Lunch</option>
                                <option value="snack">Snack</option>
                                <option value="both">All Plans</option>
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
                            {saving ? 'Saving...' : (editingId ? 'Update Item' : 'Save & Add to Tomorrow')}
                        </button>
                        <button onClick={cancelForm}
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
                            const tomorrowEntry = tomorrowMenu.find(t => t.item_id === item.id)
                            const onTomorrow = !!tomorrowEntry
                            const isSpecial = tomorrowEntry?.is_special

                            return (
                                <div key={item.id} className="px-4 md:px-6 py-4 flex items-center gap-3 md:gap-4 flex-wrap">
                                    <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover"
                                                onError={(e) => { e.target.style.display = 'none' }} />
                                        ) : (
                                            <span>{CAT_EMOJI[item.category] || '🍽️'}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                            {item.is_veg && <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">Veg</span>}
                                            {item.is_spicy && <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Spicy</span>}
                                            {onTomorrow && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold">📅 Tomorrow</span>}
                                            {isSpecial && <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-semibold">⭐ Special</span>}
                                            {!item.is_available && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Hidden</span>}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</div>
                                    </div>
                                    <div className="text-sm font-bold text-orange-600 flex-shrink-0">₹{item.price}</div>

                                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                                        <button onClick={() => startEdit(item)}
                                            className="text-xs text-blue-600 hover:text-blue-700 border border-blue-200 bg-blue-50 px-2 py-1 rounded whitespace-nowrap">
                                            ✏️ Edit
                                        </button>

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

                                        {onTomorrow && (
                                            <button onClick={() => toggleSpecial(item.id)}
                                                className={`text-xs px-2 py-1 rounded whitespace-nowrap font-medium border
                          ${isSpecial
                                                        ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-yellow-50'}`}>
                                                {isSpecial ? '⭐ Special' : '☆ Make Special'}
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
