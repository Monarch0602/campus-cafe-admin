'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
    const { login } = useAuth()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleLogin(e) {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const { data, error: dbError } = await supabase
                .from('staff_accounts')
                .select('*')
                .eq('username', username.trim())
                .eq('password', password.trim())
                .eq('is_active', true)
                .single()

            if (dbError || !data) {
                setError('Invalid username or password. Please try again.')
                setLoading(false)
                return
            }

            login({ id: data.id, name: data.name, role: data.role, username: data.username })
            // Use window.location for reliable redirect
            window.location.href = '/dashboard'
        } catch (err) {
            setError('Something went wrong. Please try again.')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">

                <div className="text-center mb-8">
                    <div className="text-5xl mb-3">☕</div>
                    <h1 className="text-2xl font-bold text-gray-900">Campus Cafe</h1>
                    <p className="text-gray-500 text-sm mt-1">Admin Panel</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-orange-400"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-orange-400"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange-600 text-white rounded-lg py-3 text-sm font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 font-medium mb-2">Staff Accounts:</p>
                        <p className="text-xs text-gray-600">👑 Owner: owner@campuscafe</p>
                        <p className="text-xs text-gray-600">👤 Staff: staff@campuscafe</p>
                    </div>
                </div>
            </div>
        </div>
    )
}