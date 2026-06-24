import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function ProtectedRoute({ children, onlyDueno = false }) {
  const { session, perfil, loading } = useAuth()

  if (loading || (session && !perfil)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (onlyDueno && perfil?.rol !== 'dueno') return <Navigate to="/" replace />

  return children
}
