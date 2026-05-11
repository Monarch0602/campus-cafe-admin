'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/AdminLayout_mobile'

const STATUS_COLOR = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
    expired: 'bg-gray-100 text-gray-600',
}

export default function Subscriptions() {
    const [subs, setSubs] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false })
            .then(({ data }) => { if (data) setSubs(data); setLoading(false) })
    }, [])

    const activeRevenue = subs.filter(s => s.status === 'active').reduce((sum, s) => sum + Number(s.price_paid), 0)
    const activeCount = subs.filter(s => s.status === 'active').length

    return (
        <AdminLayout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
                <p className="text-gray-500 text-sm mt-1">{subs.length} total</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                    <div className="text-2xl font-bold text-green-600">{activeCount}</div>
                    <div className="text-xs text-gray-500 mt-1">Active Subscriptions</div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                    <div className="text-2xl font-bold text-orange-600">₹{activeRevenue.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-1">Active Revenue</div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                    <div className="text-2xl font-bold text-blue-600">{subs.length}</div>
                    <div className="text-xs text-gray-500 mt-1">All Time</div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">All Subscriptions</h2>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : subs.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No subscriptions yet. Plans open from June 1, 2026.</div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {subs.map(sub => (
                            <div key={sub.id} className="px-6 py-4 flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-sm font-medium text-gray-900">
                                            {sub.notes?.split('Plan: ')[1] || sub.duration}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[sub.status]}`}>
                                            {sub.status}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 capitalize">
                                            {sub.plan_type || 'lunch'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {sub.start_date} → {sub.end_date} · {sub.meals_per_day} meal/day
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-orange-600">₹{Number(sub.price_paid).toLocaleString()}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        {Math.max(0, Math.ceil((new Date(sub.end_date) - new Date()) / 86400000))} days left
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}