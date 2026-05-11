'use client'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'
import Sidebar from './Sidebar'

export default function AdminLayout({ children }) {
    const { user, loading } = useAuth()

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
            <Sidebar />
            <main className="flex-1 p-8 overflow-auto">{children}</main>
        </div>
    )
}