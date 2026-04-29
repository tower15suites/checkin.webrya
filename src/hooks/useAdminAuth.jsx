import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session)
      setLoading(false)
    })

    // Listen for auth state changes (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setIsAdmin(false)
  }

  return (
    <AdminAuthContext.Provider value={{ isAdmin, login, logout, loading }}>
      {!loading && children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}
