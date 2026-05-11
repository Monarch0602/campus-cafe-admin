'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout'
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

export default function Orders() {
    const { user } = useAuth()
    const [orders, setOrders] = useState([])
    const [filter, setFilter] = useState('all')
    const [slot, setSlot] = useState('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => { fetchOrders() }, [])

    async function fetchOrders() {
        setLoading(true)
        const { data } = await supabase
            .from('orders')
            .select('*, order_items(quantity, unit_price, menu_items(name, category))')
            .order('created_at', { ascending: false })
        if (data) setOrders(data)
        setLoading(false)
    }

    async function updateStatus(id, status) {
        await supabase.from('orders').update({ status }).eq('id', id)
        fetchOrders()
    }

    let filtered = orders
    if (filter !== 'all') filtered = filtered.filter(o => o.status === filter)
    if (slot !== 'all') filtered = filtered.filter(o => o.notes?.includes(`Collection: ${slot}`))

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">All Orders</h1>
                    <p className="text-gray-500 text-sm mt-1">{orders.length} total orders</p>
                </div>
                <button onClick={fetchOrders} className="text-sm text-orange-600 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-50">
                    ↻ Refresh
                </button>
            </div>

            <div className="flex gap-2 mb-3 flex-wrap">
                {['all', 'pending', 'confirmed', 'preparing', 'delivered', 'cancelled'].map(s => (
                    <button key={s} onClick={() => setFilter(s)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors
              ${filter === s ? 'bg-orange-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {s} {s !== 'all' && `(${orders.filter(o => o.status === s).length})`}
                    </button>
                ))}
            </div>

            <div className="flex gap-2 mb-6">
                {[
                    { key: 'all', label: '📋 All slots' },
                    { key: 'morning', label: '🌅 Morning (9–10AM)' },
                    { key: 'evening', label: '🌞 Evening (12–1PM)' },
                ].map(s => (
                    <button key={s.key} onClick={() => setSlot(s.key)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors
              ${slot === s.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {s.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-100">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No orders found</div>
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
                                    </div>
                                    <div className="text-sm text-gray-700 mb-1">
                                        {order.order_items?.map(i => `${i.menu_items?.name} ×${i.quantity}`).join(' · ')}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        📅 {order.delivery_date} · 🕐 {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
                                    {user?.role === 'owner' && order.status !== 'cancelled' && order.status !== 'delivered' && (
                                        <button onClick={() => updateStatus(order.id, 'cancelled')}
                                            className="block mt-1 text-xs text-red-400 hover:text-red-600 ml-auto">
                                            Cancel
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