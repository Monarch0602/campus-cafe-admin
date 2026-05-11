'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout_mobile'

const CATEGORIES = ['thali', 'rice', 'roti', 'snacks', 'dessert', 'beverage']
const CAT_EMOJI = { thali: '🍛', rice: '🍚', roti: '🥙', snacks: '🍟', dessert: '🍰', beverage: '☕' }

export default function MenuManager() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        name: '', description: '', category: 'thali', price: '',
        is_veg: true, is_spicy: false, plan_type: 'both'
    })

    useEffect(() => { fetchItems() }, [])

    async function fetchItems() {
        const { data } = await supabase.from('menu_items').select('*').order('display_order')
        if (data) setItems(data)
        setLoading(false)
    }

    async function toggleAvailable(id, val) {
        await supabase.from('menu_items').update({ is_available: val }).eq('id', id)
        fetchItems()
    }

    async function saveItem() {
        if (!form.name || !form.price) return
        setSaving(true)
        await supabase.from('menu_items').insert({
            ...form,
            price: parseFloat(form.price),
            display_order: items.length + 1
        })
        setForm({ name: '', description: '', category: 'thali', price: '', is_veg: true, is_spicy: false, plan_type: 'both' })
        setShowForm(false)
        fetchItems()
        setSaving(false)
    }

    async function addToTomorrowMenu(itemId) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const date = tomorrow.toISOString().split('T')[0]
        await supabase.from('daily_menu').upsert({ menu_date: date, item_id: itemId, is_special: false })
        alert("Added to tomorrow's menu!")
    }

    async function deleteItem(id) {
        if (!confirm('Delete this item?')) return
        await supabase.from('menu_items').delete().eq('id', id)
        fetchItems()
    }

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Menu Manager</h1>
                    <p className="text-gray-500 text-sm mt-1">{items.length} items total</p>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700">
                    + Add Item
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">New Menu Item</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Name *</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Item name"
                                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Price (₹) *</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="150" type="number"
                                value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Description</label>
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="What's in it?"
                                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Category</label>
                            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Plan Type</label>
                            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
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
                            {saving ? 'Saving...' : 'Save Item'}
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
                        {items.map(item => (
                            <div key={item.id} className="px-6 py-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-xl flex-shrink-0">
                                    {CAT_EMOJI[item.category] || '🍽️'}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                        {item.is_veg && <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">Veg</span>}
                                        {item.is_spicy && <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Spicy</span>}
                                        {item.plan_type && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded capitalize">{item.plan_type}</span>}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
                                </div>
                                <div className="text-sm font-bold text-orange-600">₹{item.price}</div>
                                <button onClick={() => addToTomorrowMenu(item.id)} className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                                    + Tomorrow
                                </button>
                                <div onClick={() => toggleAvailable(item.id, !item.is_available)}
                                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${item.is_available ? 'bg-green-400' : 'bg-gray-200'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${item.is_available ? 'left-5' : 'left-0.5'}`} />
                                </div>
                                <button onClick={() => deleteItem(item.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}