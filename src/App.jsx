import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './modules/auth/ProtectedRoute'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { supabaseMisconfigured } from './lib/supabase'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './modules/auth/LoginPage'
import RegisterPage from './modules/auth/RegisterPage'
import ForgotPasswordPage from './modules/auth/ForgotPasswordPage'
import ResetPasswordPage from './modules/auth/ResetPasswordPage'

const DashboardPage  = lazy(() => import('./modules/dashboard/DashboardPage'))
const RRHHPage       = lazy(() => import('./modules/rrhh/RRHHPage'))
const SchedulePage   = lazy(() => import('./modules/schedule/SchedulePage'))
const FinanzasPage   = lazy(() => import('./modules/finanzas/FinanzasPage'))
const InventarioPage = lazy(() => import('./modules/inventario/InventarioPage'))
const ProveedoresPage = lazy(() => import('./modules/proveedores/ProveedoresPage'))
const PedidosPage     = lazy(() => import('./modules/pedidos/PedidosPage'))
const IdeasPage       = lazy(() => import('./modules/ideas/IdeasPage'))
const PreciosPage     = lazy(() => import('./modules/precios/PreciosPage'))
const PagosPage       = lazy(() => import('./modules/pagos/PagosPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
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
                  <ProtectedRoute onlyDueno><FinanzasPage /></ProtectedRoute>
                } />
                <Route path="inventario" element={
                  <ProtectedRoute onlyDueno><InventarioPage /></ProtectedRoute>
                } />
                <Route path="proveedores" element={
                  <ProtectedRoute onlyDueno><ProveedoresPage /></ProtectedRoute>
                } />
                <Route path="pedidos" element={
                  <ProtectedRoute onlyDueno><PedidosPage /></ProtectedRoute>
                } />
                <Route path="ideas" element={
                  <ProtectedRoute onlyDueno><IdeasPage /></ProtectedRoute>
                } />
                <Route path="precios" element={<PreciosPage />} />
                <Route path="pagos" element={<PagosPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
