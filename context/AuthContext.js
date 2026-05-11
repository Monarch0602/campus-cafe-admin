'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        try {
            const saved = localStorage.getItem('cc_admin_user')
            if (saved) setUser(JSON.parse(saved))
        } catch (e) { }
        setLoading(false)
    }, [])

    function login(userData) {
        setUser(userData)
        localStorage.setItem('cc_admin_user', JSON.stringify(userData))
    }

    function logout() {
        setUser(null)
        localStorage.removeItem('cc_admin_user')
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}