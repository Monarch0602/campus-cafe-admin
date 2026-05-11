'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout'

export default function Production() {
    const [productionData, setProductionData] = useState([])
    const [loading, setLoading] = useState(true)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    useEffect(() => { fetchProduction() }, [date])

    async function fetchProduction() {
        setLoading(true)
        const { data: orders } = await supabase
            .from('orders')
            .select('id, total_amount, status')
            .eq('delivery_date', date)
            .neq('status', 'cancelled')

        if (!orders || orders.length === 0) {
            setProductionData([])
            setLoading(false)
            return
        }

        const orderIds = orders.map(o => o.id)
        const { data: items } = await supabase
            .from('order_items')
            .select('quantity, unit_price, menu_items(id, name, category, price)')
            .in('order_id', orderIds)

        if (!items) { setLoading(false); return }

        const map = {}
        items.forEach(item => {
            const id = item.menu_items?.id
            const name = item.menu_items?.name
            const cat = item.menu_items?.category
            const rate = Number(item.unit_price)
            const qty = Number(item.quantity)
            if (!id) return
            if (!map[id]) map[id] = { id, name, category: cat, rate, totalQty: 0, totalSales: 0 }
            map[id].totalQty += qty
            map[id].totalSales += qty * rate
        })

        setProductionData(Object.values(map).sort((a, b) => b.totalQty - a.totalQty))
        setLoading(false)
    }

    const totalRevenue = productionData.reduce((s, i) => s + i.totalSales, 0)
    const totalItems = productionData.reduce((s, i) => s + i.totalQty, 0)
    const CAT_EMOJI = { thali: '🍛', rice: '🍚', roti: '🥙', snacks: '🍟', dessert: '🍰', beverage: '☕' }

    return (
        <AdminLayout>
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Production Report</h1>
                    <p className="text-gray-500 text-sm mt-1">Items to prepare · Sales per product</p>
                </div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white" />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Total Items to Prepare', value: totalItems, color: 'text-orange-600' },
                    { label: 'Total Sales', value: `₹${totalRevenue.toLocaleString()}`, color: 'text-green-600' },
                    { label: 'Unique Products', value: productionData.length, color: 'text-blue-600' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100">
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-900">Production per Product</h2>
                    <span className="text-xs text-gray-400">
                        {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : productionData.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No orders found for this date</div>
                ) : (
                    <>
                        <div className="px-6 py-3 bg-gray-50 grid grid-cols-5 gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            <div className="col-span-2">Product</div>
                            <div className="text-center">Rate</div>
                            <div className="text-center">Qty to Prepare</div>
                            <div className="text-right">Total Sales</div>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {productionData.map(item => (
                                <div key={item.id} className="px-6 py-4 grid grid-cols-5 gap-4 items-center">
                                    <div className="col-span-2 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center text-lg flex-shrink-0">
                                            {CAT_EMOJI[item.category] || '🍽️'}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                            <div className="text-xs text-gray-400 capitalize">{item.category}</div>
                                        </div>
                                    </div>
                                    <div className="text-center text-sm font-medium text-gray-700">₹{item.rate}</div>
                                    <div className="text-center">
                                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-700 text-sm font-bold">
                                            {item.totalQty}
                                        </span>
                                    </div>
                                    <div className="text-right text-sm font-bold text-green-600">
                                        ₹{item.totalSales.toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 grid grid-cols-5 gap-4">
                            <div className="col-span-2 text-sm font-bold text-gray-900">Total</div>
                            <div></div>
                            <div className="text-center text-sm font-bold text-orange-600">{totalItems}</div>
                            <div className="text-right text-sm font-bold text-green-600">₹{totalRevenue.toLocaleString()}</div>
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    )
}