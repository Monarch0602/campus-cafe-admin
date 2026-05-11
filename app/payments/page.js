'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout'

export default function Payments() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.from('orders').select('*, order_items(quantity, menu_items(name))').order('created_at', { ascending: false })
            .then(({ data }) => { if (data) setOrders(data); setLoading(false) })
    }, [])

    const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount), 0)

    function exportCSV() {
        const rows = [
            ['Order ID', 'Date', 'Type', 'Amount', 'Status', 'Collection Slot'],
            ...orders.map(o => [
                o.id,
                o.delivery_date,
                o.order_type,
                o.total_amount,
                o.status,
                o.notes?.includes('morning') ? 'Morning' : 'Evening'
            ])
        ]
        const csv = rows.map(r => r.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'campus-cafe-payments.csv'
        a.click()
    }

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
                    <p className="text-gray-500 text-sm mt-1">{orders.length} transactions</p>
                </div>
                <button onClick={exportCSV} className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                    Export CSV
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                    <div className="text-2xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-1">Total Revenue (Inclusive of GST)</div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                    <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
                    <div className="text-xs text-gray-500 mt-1">Total Orders</div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Transaction History</h2>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : orders.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No transactions yet</div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {orders.map(order => (
                            <div key={order.id} className="px-6 py-4 flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-sm flex-shrink-0">💰</div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">
                                        {order.order_items?.map(i => i.menu_items?.name).filter(Boolean).join(', ') || 'Order'}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        {order.order_type?.replace(/_/g, ' ')} · {order.delivery_date} · {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        · {order.notes?.includes('morning') ? '🌅 Morning' : '🌞 Evening'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-gray-900">₹{order.total_amount}</div>
                                    <div className="text-xs text-gray-400">Incl. GST</div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'}`}>
                                    {order.status?.replace(/_/g, ' ')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}