import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Users, Calendar, DollarSign, Package, Truck, LogOut, Home
} from 'lucide-react'

const navItems = [
  { to: '/',           label: 'Inicio',       icon: Home,       onlyDueno: false },
  { to: '/rrhh',       label: 'RRHH',         icon: Users,      onlyDueno: false },
  { to: '/horarios',   label: 'Horarios',     icon: Calendar,   onlyDueno: false },
  { to: '/finanzas',   label: 'Finanzas',     icon: DollarSign, onlyDueno: true  },
  { to: '/inventario', label: 'Inventario',   icon: Package,    onlyDueno: true  },
  { to: '/proveedores',label: 'Proveedores',  icon: Truck,      onlyDueno: true  },
]

export default function Sidebar() {
  const { perfil, esDueno, logout } = useAuth()
  const navigate = useNavigate()

  const visibleItems = navItems.filter(item => !item.onlyDueno || esDueno)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="w-60 shrink-0 bg-gray-900 text-white flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🥩</span>
          <div>
            <p className="font-bold text-sm leading-none">DondeDiego</p>
            <p className="text-gray-400 text-xs">Tibás</p>
          </div>
        </div>
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
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-2">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-white truncate">
            {perfil?.nombre} {perfil?.apellidos}
          </p>
          <p className="text-xs text-gray-400 capitalize">{perfil?.rol}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={17} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
