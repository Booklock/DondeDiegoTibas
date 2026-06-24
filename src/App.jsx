import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './modules/auth/ProtectedRoute'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { supabaseMisconfigured } from './lib/supabase'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './modules/auth/LoginPage'
import RegisterPage from './modules/auth/RegisterPage'
import DashboardPage from './modules/dashboard/DashboardPage'
import RRHHPage from './modules/rrhh/RRHHPage'
import SchedulePage from './modules/schedule/SchedulePage'
import FinanzasPage from './modules/finanzas/FinanzasPage'
import InventarioPage from './modules/inventario/InventarioPage'
import ProveedoresPage from './modules/proveedores/ProveedoresPage'

function MissingConfig() {
  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-amber-200 p-8 max-w-lg w-full">
        <p className="text-4xl mb-4">⚙️</p>
        <h1 className="text-xl font-bold text-amber-700 mb-2">Variables de entorno faltantes</h1>
        <p className="text-sm text-gray-600 mb-4">
          La aplicación no puede conectarse a Supabase porque faltan las variables de entorno.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 text-xs text-green-400 font-mono space-y-1 mb-4">
          <p>VITE_SUPABASE_URL=https://xxxx.supabase.co</p>
          <p>VITE_SUPABASE_ANON_KEY=eyJ...</p>
        </div>
        <p className="text-sm text-gray-500">
          En Netlify: <strong>Site configuration → Environment variables</strong>, agregá las dos variables y hacé un nuevo deploy.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  if (supabaseMisconfigured) return <MissingConfig />

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="rrhh" element={<RRHHPage />} />
              <Route path="horarios" element={<SchedulePage />} />
              <Route path="finanzas" element={
                <ProtectedRoute onlyDueno>
                  <FinanzasPage />
                </ProtectedRoute>
              } />
              <Route path="inventario" element={
                <ProtectedRoute onlyDueno>
                  <InventarioPage />
                </ProtectedRoute>
              } />
              <Route path="proveedores" element={
                <ProtectedRoute onlyDueno>
                  <ProveedoresPage />
                </ProtectedRoute>
              } />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
