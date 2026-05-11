'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../context/AuthContext'

const NAV_OWNER = [
    { href: '/dashboard', icon: '📊', label: 'Dashboard' },
    { href: '/orders', icon: '🧾', label: 'Orders' },
    { href: '/menu', icon: '🍽️', label: 'Menu Manager' },
    { href: '/production', icon: '📦', label: 'Production' },
    { href: '/subscriptions', icon: '📅', label: 'Subscriptions' },
    { href: '/payments', icon: '💳', label: 'Payments' },
]

const NAV_STAFF = [
    { href: '/dashboard', icon: '📊', label: 'Dashboard' },
    { href: '/orders', icon: '🧾', label: 'Orders' },
]

export default function Sidebar({ onLinkClick }) {
    const path = usePathname()
    const { user, logout } = useAuth()

    const nav = user?.role === 'owner' ? NAV_OWNER : NAV_STAFF

    function handleLogout() {
        logout()
        window.location.href = '/login'
    }

    return (
        <aside className="w-56 h-full min-h-screen bg-white border-r border-gray-100 flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100">
                <div className="text-lg font-bold text-gray-900">☕ Campus Cafe</div>
                <div className="text-xs text-orange-600 font-medium mt-0.5">Admin Panel</div>
            </div>

            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-sm">
                        {user?.role === 'owner' ? '👑' : '👤'}
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-gray-900">{user?.name || 'Admin'}</div>
                        <div className="text-xs text-gray-500 capitalize">{user?.role || 'staff'}</div>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
                {nav.map(n => {
                    const active = path === n.href
                    return (
                        <Link key={n.href} href={n.href}
                            onClick={onLinkClick}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${active ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <span className="text-base">{n.icon}</span>
                            {n.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="px-4 py-4 border-t border-gray-100">
                <div className="text-xs text-gray-400 mb-1">Collection times</div>
                <div className="text-xs text-gray-600 mb-1">🌅 Morning: 9AM–10AM</div>
                <div className="text-xs text-gray-600 mb-3">🌞 Evening: 12PM–1PM</div>
                <button
                    onClick={handleLogout}
                    className="w-full text-xs text-red-500 hover:text-red-700 text-left font-medium"
                >
                    🚪 Sign Out
                </button>
            </div>
        </aside>
    )
}
