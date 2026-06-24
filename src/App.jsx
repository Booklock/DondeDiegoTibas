import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './modules/auth/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './modules/auth/LoginPage'
import RegisterPage from './modules/auth/RegisterPage'
import DashboardPage from './modules/dashboard/DashboardPage'
import RRHHPage from './modules/rrhh/RRHHPage'
import SchedulePage from './modules/schedule/SchedulePage'
import FinanzasPage from './modules/finanzas/FinanzasPage'
import InventarioPage from './modules/inventario/InventarioPage'
import ProveedoresPage from './modules/proveedores/ProveedoresPage'

export default function App() {
  return (
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
  )
}
