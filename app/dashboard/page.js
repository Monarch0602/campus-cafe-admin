'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout_mobile'
import { useAuth } from '../../context/AuthContext'

const STATUS_COLOR = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
}

const NEXT_STATUS = {
    pending: 'confirmed',
    confirmed: 'preparing',
    preparing: 'delivered',
}

export default function Dashboard() {
    const { user } = useAuth()
    const [orders, setOrders] = useState([])
    const [allOrders, setAll] = useState([])
    const [stats, setStats] = useState({ total: 0, revenue: 0, pending: 0, collected: 0 })
    const [loading, setLoading] = useState(true)
    const [slot, setSlot] = useState('all')
    const [viewMode, setViewMode] = useState('today') // 'today' = collect today, 'tomorrow' = collect tomorrow, 'all'

    useEffect(() => { fetchData() }, [viewMode])

    function getToday() {
        return new Date().toISOString().split('T')[0]
    }
    function getTomorrow() {
        const d = new Date(); d.setDate(d.getDate() + 1)
        return d.toISOString().split('T')[0]
    }

    async function fetchData() {
        setLoading(true)

        // Pick date based on view mode
        let query = supabase
            .from('orders')
            .select('*, order_items(quantity, unit_price, menu_items(name, category))')
            .order('created_at', { ascending: false })

        if (viewMode === 'today') query = query.eq('delivery_date', getToday())
        if (viewMode === 'tomorrow') query = query.eq('delivery_date', getTomorrow())

        const { data } = await query

        if (data) {
            setOrders(data)
            setStats({
                total: data.length,
                revenue: data.reduce((s, o) => s + Number(o.total_amount), 0),
                pending: data.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing').length,
                collected: data.filter(o => o.status === 'delivered').length,
            })
        }
        setLoading(false)
    }

    async function updateStatus(id, status) {
        await supabase.from('orders').update({ status }).eq('id', id)
        fetchData()
    }

    const filtered = slot === 'all' ? orders : orders.filter(o => o.notes?.includes(`Collection: ${slot}`))

    return (
        <AdminLayout>
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <button onClick={fetchData} className="text-sm text-orange-600 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-50">
                    ↻ Refresh
                </button>
            </div>

            {/* View mode tabs */}
            <div className="flex gap-2 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
                <button onClick={() => setViewMode('today')}
                    className={`text-xs px-4 py-2 rounded-md font-medium transition-all
            ${viewMode === 'today' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600'}`}>
                    📅 Collect Today
                </button>
                <button onClick={() => setViewMode('tomorrow')}
                    className={`text-xs px-4 py-2 rounded-md font-medium transition-all
            ${viewMode === 'tomorrow' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600'}`}>
                    ⏭️ Collect Tomorrow
                </button>
                <button onClick={() => setViewMode('all')}
                    className={`text-xs px-4 py-2 rounded-md font-medium transition-all
            ${viewMode === 'all' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600'}`}>
                    📋 All Orders
                </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Orders', value: stats.total, icon: '🧾', color: 'text-blue-600' },
                    { label: 'Revenue', value: `₹${stats.revenue}`, icon: '💰', color: 'text-green-600' },
                    { label: 'In Progress', value: stats.pending, icon: '⏳', color: 'text-yellow-600' },
                    { label: 'Collected', value: stats.collected, icon: '✅', color: 'text-green-600' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100">
                        <div className="text-2xl mb-2">{s.icon}</div>
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="flex gap-2 mb-4">
                {['all', 'morning', 'evening'].map(f => (
                    <button key={f} onClick={() => setSlot(f)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize
              ${slot === f ? 'bg-orange-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {f === 'all' ? '📋 All slots' : f === 'morning' ? '🌅 Morning (9–10AM)' : '🌞 Evening (12–1PM)'}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">
                        {viewMode === 'today' ? "Today's Collections" : viewMode === 'tomorrow' ? "Tomorrow's Collections" : 'All Orders'}
                    </h2>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        {viewMode === 'today' ? 'No orders to collect today' : viewMode === 'tomorrow' ? 'No orders for tomorrow yet' : 'No orders found'}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.map(order => (
                            <div key={order.id} className="px-6 py-4 flex items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-xs font-mono text-gray-400">#{order.id.slice(0, 8).toUpperCase()}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {order.status.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                                            {order.notes?.includes('morning') ? '🌅 Morning' : '🌞 Evening'}
                                        </span>
                                        <span className="text-xs text-gray-400">📅 {order.delivery_date}</span>
                                    </div>
                                    <div className="text-sm text-gray-700 mb-1">
                                        {order.order_items?.map(i => `${i.menu_items?.name} ×${i.quantity}`).join(' · ')}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="text-sm font-bold text-orange-600 mb-2">₹{order.total_amount}</div>
                                    {user?.role === 'owner' && NEXT_STATUS[order.status] && (
                                        <button onClick={() => updateStatus(order.id, NEXT_STATUS[order.status])}
                                            className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700 whitespace-nowrap">
                                            → {NEXT_STATUS[order.status].replace(/_/g, ' ')}
                                        </button>
                                    )}
                                    {user?.role === 'staff' && order.status === 'preparing' && (
                                        <button onClick={() => updateStatus(order.id, 'delivered')}
                                            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 whitespace-nowrap">
                                            ✓ Mark Collected
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
