import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import CheckInPortal from './pages/CheckInPortal.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import { AdminAuthProvider, useAdminAuth } from './hooks/useAdminAuth.jsx'

function ProtectedRoute({ children }) {
  const { isAdmin } = useAdminAuth()
  return isAdmin ? children : <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <div className="grain">
          <Routes>
            {/* Guest Check-In Portal */}
            <Route path="/" element={<CheckInPortal />} />
            <Route path="/checkin" element={<CheckInPortal />} />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </AdminAuthProvider>
    </BrowserRouter>
  )
}
