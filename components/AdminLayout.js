'use client'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'

export default function AdminLayout({ children }) {
    const { user, loading } = useAuth()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    useEffect(() => {
        if (!loading && !user) {
            window.location.href = '/login'
        }
    }, [user, loading])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-gray-400 text-sm">Loading...</div>
        </div>
    )

    if (!user) return null

    return (
        <div className="flex min-h-screen bg-gray-50">

            {/* Sidebar — hidden on mobile by default, shown when toggled */}
            <div className={`
        fixed md:relative inset-y-0 left-0 z-40
        transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        transition-transform duration-200 ease-in-out
      `}>
                <Sidebar onLinkClick={() => setSidebarOpen(false)} />
            </div>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main content */}
            <main className="flex-1 overflow-auto">

                {/* Mobile top bar with menu button */}
                <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg hover:bg-gray-50"
                    >
                        <span className="text-xl">☰</span>
                    </button>
                    <div className="text-base font-bold text-gray-900">☕ Campus Cafe</div>
                    <div className="w-10" />
                </div>

                <div className="p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
