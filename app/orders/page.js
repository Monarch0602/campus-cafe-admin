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
    const [expandedId, setExpandedId] = useState(null)

    useEffect(() => { fetchOrders() }, [])

    async function fetchOrders() {
        setLoading(true)

        // Get all orders first WITHOUT the FK join
        const { data: ordersData, error } = await supabase
            .from('orders')
            .select('*, order_items(quantity, unit_price, menu_items(name, category))')
            .order('created_at', { ascending: false })

        if (error) {
            console.log('Orders error:', error.message)
            setLoading(false)
            return
        }

        if (!ordersData) { setLoading(false); return }

        // Fetch profiles and children separately, then merge in JS
        const userIds = [...new Set(ordersData.map(o => o.user_id).filter(Boolean))]

        const [profilesResult, childrenResult] = await Promise.all([
            supabase.from('profiles').select('id, full_name, phone, role').in('id', userIds),
            supabase.from('children').select('*').in('parent_id', userIds),
        ])

        const profilesMap = {}
        const childrenMap = {}
        profilesResult.data?.forEach(p => { profilesMap[p.id] = p })
        childrenResult.data?.forEach(c => {
            if (!childrenMap[c.parent_id]) childrenMap[c.parent_id] = c
        })

        // Enrich orders
        const enriched = ordersData.map(order => {
            const role = order.notes?.match(/Role: (\w+)/)?.[1] || 'parent'
            return {
                ...order,
                role,
                profiles: profilesMap[order.user_id] || null,
                childInfo: role === 'parent' ? (childrenMap[order.user_id] || null) : null,
            }
        })

        setOrders(enriched)
        setLoading(false)
    }

    async function updateStatus(id, status) {
        await supabase.from('orders').update({ status }).eq('id', id)
        fetchOrders()
    }

    let filtered = orders
    if (filter !== 'all') filtered = filtered.filter(o => o.status === filter)
    if (slot !== 'all') filtered = filtered.filter(o => o.notes?.includes(`Collection: ${slot}`))

    function parseRollNumber(notes) {
        if (!notes) return null
        const match = notes.match(/Roll: (\S+)/)
        return match ? match[1] : null
    }
    function parseBoard(notes) {
        if (!notes) return null
        const match = notes.match(/Board: (\w+)/)
        return match ? match[1] : null
    }

    return (
        <AdminLayout>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">All Orders</h1>
                    <p className="text-gray-500 text-sm mt-1">{orders.length} total · Tap any order to see student details</p>
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

            <div className="flex gap-2 mb-6 flex-wrap">
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
                        {filtered.map(order => {
                            const isExpanded = expandedId === order.id
                            const rollNumber = parseRollNumber(order.childInfo?.dietary_notes)
                            const board = parseBoard(order.childInfo?.dietary_notes)
                            return (
                                <div key={order.id} className="px-4 md:px-6 py-4">
                                    <div className="flex items-start gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="text-xs font-mono text-gray-400">#{order.id.slice(0, 8).toUpperCase()}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                                    {order.status.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                                                    {order.notes?.includes('morning') ? '🌅 Morning' : '🌞 Evening'}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 capitalize">
                                                    {order.role}
                                                </span>
                                            </div>

                                            <div className="text-sm font-semibold text-gray-900 mb-1">
                                                {order.role === 'parent' && order.childInfo?.full_name
                                                    ? <span>👤 {order.childInfo.full_name} <span className="text-gray-400 font-normal">(ordered by {order.profiles?.full_name || 'Parent'})</span></span>
                                                    : <span>👤 {order.profiles?.full_name || 'User'}</span>
                                                }
                                            </div>

                                            {order.role === 'parent' && order.childInfo && (
                                                <div className="flex items-center gap-3 text-xs text-gray-600 mb-2 flex-wrap">
                                                    {order.childInfo.class && <span>🏫 {order.childInfo.class}</span>}
                                                    {rollNumber && <span>🔢 Roll: {rollNumber}</span>}
                                                    {board && <span>📚 {board}</span>}
                                                </div>
                                            )}

                                            <div className="text-sm text-gray-700 mb-1">
                                                {order.order_items?.map(i => `${i.menu_items?.name} ×${i.quantity}`).join(' · ')}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                📅 {order.delivery_date} · 🕐 {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                · {isExpanded ? '▲ Hide details' : '▼ Show details'}
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-sm font-bold text-orange-600 mb-2">₹{order.total_amount}</div>
                                            {user?.role === 'owner' && NEXT_STATUS[order.status] && (
                                                <button onClick={(e) => { e.stopPropagation(); updateStatus(order.id, NEXT_STATUS[order.status]) }}
                                                    className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700 whitespace-nowrap">
                                                    → {NEXT_STATUS[order.status].replace(/_/g, ' ')}
                                                </button>
                                            )}
                                            {user?.role === 'staff' && order.status === 'preparing' && (
                                                <button onClick={(e) => { e.stopPropagation(); updateStatus(order.id, 'delivered') }}
                                                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 whitespace-nowrap">
                                                    ✓ Mark Collected
                                                </button>
                                            )}
                                            {user?.role === 'owner' && order.status !== 'cancelled' && order.status !== 'delivered' && (
                                                <button onClick={(e) => { e.stopPropagation(); updateStatus(order.id, 'cancelled') }}
                                                    className="block mt-1 text-xs text-red-400 hover:text-red-600 ml-auto">
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-base">🪪</span>
                                                <h4 className="text-sm font-semibold text-blue-900">Collection Verification</h4>
                                            </div>
                                            {order.role === 'parent' && order.childInfo ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Student Name</div><div className="text-sm font-medium text-gray-900">{order.childInfo.full_name}</div></div>
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Class / Grade</div><div className="text-sm font-medium text-gray-900">{order.childInfo.class || 'Not set'}</div></div>
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Roll Number</div><div className="text-sm font-medium text-gray-900">{rollNumber || 'Not set'}</div></div>
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Education Board</div><div className="text-sm font-medium text-gray-900">{board || 'Not set'}</div></div>
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Parent Contact</div><div className="text-sm font-medium text-gray-900">{order.profiles?.phone || 'Not available'}</div></div>
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Parent Name</div><div className="text-sm font-medium text-gray-900">{order.profiles?.full_name || 'Not available'}</div></div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Name</div><div className="text-sm font-medium text-gray-900">{order.profiles?.full_name || 'Not available'}</div></div>
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Phone</div><div className="text-sm font-medium text-gray-900">{order.profiles?.phone || 'Not available'}</div></div>
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Role</div><div className="text-sm font-medium text-gray-900 capitalize">{order.role}</div></div>
                                                </div>
                                            )}
                                            <div className="mt-3 pt-3 border-t border-blue-200">
                                                <p className="text-xs text-blue-800">⚠️ Verify the student's ID card matches these details before handing over the order.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
