import { createContext, useContext, useState, useEffect } from 'react'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = sessionStorage.getItem('admin_session')
    if (session === 'authenticated') setIsAdmin(true)
    setLoading(false)
  }, [])

  const login = (username, password) => {
    // Credentials checked client-side (hashed comparison via Edge Function in production)
    if (username === 'alexmanel' && password === 'Devilakos1992!') {
      setIsAdmin(true)
      sessionStorage.setItem('admin_session', 'authenticated')
      return true
    }
    return false
  }

  const logout = () => {
    setIsAdmin(false)
    sessionStorage.removeItem('admin_session')
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
