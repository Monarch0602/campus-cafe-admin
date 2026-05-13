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

export default function Dashboard() {
    const { user } = useAuth()
    const [orders, setOrders] = useState([])
    const [stats, setStats] = useState({ total: 0, revenue: 0, pending: 0, collected: 0 })
    const [loading, setLoading] = useState(true)
    const [slot, setSlot] = useState('all')
    const [viewMode, setViewMode] = useState('today')
    const [expandedId, setExpandedId] = useState(null)

    useEffect(() => { fetchData() }, [viewMode])

    function getToday() { return new Date().toISOString().split('T')[0] }
    function getTomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] }

    async function fetchData() {
        setLoading(true)
        let query = supabase
            .from('orders')
            .select('*, order_items(quantity, unit_price, menu_items(name, category))')
            .order('created_at', { ascending: false })

        if (viewMode === 'today') query = query.eq('delivery_date', getToday())
        if (viewMode === 'tomorrow') query = query.eq('delivery_date', getTomorrow())

        const { data: ordersData } = await query

        if (!ordersData) { setLoading(false); return }

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
        setStats({
            total: enriched.length,
            revenue: enriched.reduce((s, o) => s + Number(o.total_amount), 0),
            pending: enriched.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length,
            collected: enriched.filter(o => o.status === 'delivered').length,
        })
        setLoading(false)
    }

    async function updateStatus(id, status) {
        // Get the order to know who to notify
        const order = orders.find(o => o.id === id)

        await supabase.from('orders').update({ status }).eq('id', id)

        // Send notification to user based on new status
        if (order?.user_id) {
            const shortId = id.slice(0, 8).toUpperCase()
            const messages = {
                confirmed: {
                    title: '✅ Order Confirmed',
                    body: `Your order #${shortId} has been confirmed and will be prepared soon.`,
                    type: 'order_confirmed'
                },
                preparing: {
                    title: '👨‍🍳 Being Prepared',
                    body: `Your order #${shortId} is being freshly prepared in the kitchen.`,
                    type: 'order_prepared'
                },
                delivered: {
                    title: '✓ Order Collected!',
                    body: `Order #${shortId} has been collected. Thank you for choosing Campus Cafe!`,
                    type: 'order_collected'
                },
                cancelled: {
                    title: '❌ Order Cancelled',
                    body: `Your order #${shortId} has been cancelled. Please contact Campus Cafe for details.`,
                    type: 'general'
                },
            }

            const msg = messages[status]
            if (msg) {
                await supabase.from('notifications').insert({
                    user_id: order.user_id,
                    title: msg.title,
                    body: msg.body,
                    type: msg.type,
                    order_id: id,
                    is_read: false,
                })
            }
        }

        fetchData()
    }

    const filtered = slot === 'all' ? orders : orders.filter(o => o.notes?.includes(`Collection: ${slot}`))

    function parseRollNumber(notes) { const m = notes?.match(/Roll: (\S+)/); return m ? m[1] : null }
    function parseBoard(notes) { const m = notes?.match(/Board: (\w+)/); return m ? m[1] : null }

    return (
        <AdminLayout>
            <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
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

            <div className="flex gap-2 mb-6 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

            <div className="flex gap-2 mb-4 flex-wrap">
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
                    <p className="text-xs text-gray-500 mt-1">Tap any order to see student verification details</p>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No orders</div>
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
                                            </div>

                                            <div className="text-sm font-semibold text-gray-900 mb-1">
                                                {order.role === 'parent' && order.childInfo?.full_name
                                                    ? <>👤 {order.childInfo.full_name}</>
                                                    : <>👤 {order.profiles?.full_name || 'User'}</>
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
                                                {isExpanded ? '▲ Hide details' : '▼ Show student details'}
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
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Student</div><div className="text-sm font-medium">{order.childInfo.full_name}</div></div>
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Class</div><div className="text-sm font-medium">{order.childInfo.class || 'Not set'}</div></div>
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Roll Number</div><div className="text-sm font-medium">{rollNumber || 'Not set'}</div></div>
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Board</div><div className="text-sm font-medium">{board || 'Not set'}</div></div>
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Parent Phone</div><div className="text-sm font-medium">{order.profiles?.phone || 'Not available'}</div></div>
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Parent Name</div><div className="text-sm font-medium">{order.profiles?.full_name || 'Not available'}</div></div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Name</div><div className="text-sm font-medium">{order.profiles?.full_name || 'N/A'}</div></div>
                                                    <div><div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Phone</div><div className="text-sm font-medium">{order.profiles?.phone || 'N/A'}</div></div>
                                                </div>
                                            )}
                                            <div className="mt-3 pt-3 border-t border-blue-200">
                                                <p className="text-xs text-blue-800">⚠️ Verify ID card matches these details before handing over the order.</p>
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
