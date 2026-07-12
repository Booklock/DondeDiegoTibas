import { useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Users, Calendar, DollarSign, Package, Truck, LogOut, Home, ShoppingCart,
  Lightbulb, Tag, X, CreditCard
} from 'lucide-react'

const navItems = [
  { to: '/',            label: 'Inicio',           icon: Home,       onlyDueno: false },
  { to: '/rrhh',        label: 'RRHH',             icon: Users,      onlyDueno: false },
  { to: '/finanzas',    label: 'Finanzas',         icon: DollarSign, onlyDueno: true  },
  { to: '/pagos',       label: 'Pagos',            icon: CreditCard, onlyDueno: false },
  { to: '/proveedores', label: 'Proveedores',      icon: Truck,      onlyDueno: true  },
  { to: '/ideas',       label: 'Ideas',            icon: Lightbulb,  onlyDueno: true  },
  { to: '/precios',     label: 'Lista de precios', icon: Tag,        onlyDueno: false },
  // Temporalmente ocultos:
  // { to: '/horarios',   label: 'Horarios',   icon: Calendar,     onlyDueno: false },
  // { to: '/inventario', label: 'Inventario', icon: Package,      onlyDueno: true  },
  // { to: '/pedidos',    label: 'Pedidos',    icon: ShoppingCart, onlyDueno: true  },
]

export default function Sidebar({ open, onClose }) {
  const { perfil, esDueno, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Close drawer on navigation (mobile)
  useEffect(() => { onClose?.() }, [location.pathname])

  const visibleItems = navItems.filter(item => !item.onlyDueno || esDueno)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          // Base
          'flex flex-col h-screen shrink-0',
          // Mobile: fixed drawer, slide in/out
          'fixed inset-y-0 left-0 z-50 w-64',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
          // Desktop: static sidebar, always visible
          'md:static md:translate-x-0 md:w-60',
        ].join(' ')}
        style={{ background: '#1e0505' }}
      >
        {/* Logo + mobile close */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <img src="/logo.jpg" alt="Donde Diego Chicharronera" className="h-20 w-auto object-contain rounded-xl" />
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-red-200/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-white/10 space-y-2">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-white truncate">
              {perfil?.nombre} {perfil?.apellidos}
            </p>
            <p className="text-xs text-red-300/60 capitalize">{perfil?.rol}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-200/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
