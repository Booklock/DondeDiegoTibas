import { useAuth } from '../../context/AuthContext'
import { PageHeader } from '../../components/ui/PageHeader'
import { Users, Calendar, DollarSign, Package, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'

const modulesDueno = [
  { to: '/rrhh',       label: 'RRHH',        icon: Users,       desc: 'Empleados, salarios y vacaciones', color: 'bg-purple-50 text-purple-600' },
  { to: '/horarios',   label: 'Horarios',    icon: Calendar,    desc: 'Turnos y asignaciones semanales',  color: 'bg-blue-50 text-blue-600'   },
  { to: '/finanzas',   label: 'Finanzas',    icon: DollarSign,  desc: 'Cierres de caja e ingresos',       color: 'bg-green-50 text-green-600'  },
  { to: '/inventario', label: 'Inventario',  icon: Package,     desc: 'Stock y movimientos de productos', color: 'bg-orange-50 text-orange-600' },
  { to: '/proveedores',label: 'Proveedores', icon: Truck,       desc: 'Proveedores y contactos',          color: 'bg-red-50 text-red-600'      },
]

const modulesEmpleado = [
  { to: '/rrhh',     label: 'Mi perfil',  icon: Users,    desc: 'Tu información, salario y vacaciones', color: 'bg-purple-50 text-purple-600' },
  { to: '/horarios', label: 'Mi horario', icon: Calendar, desc: 'Tu horario semanal asignado',           color: 'bg-blue-50 text-blue-600'   },
]

export default function DashboardPage() {
  const { perfil, esDueno } = useAuth()
  const modules = esDueno ? modulesDueno : modulesEmpleado

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={`Bienvenido, ${perfil?.nombre} 👋`}
        subtitle={esDueno ? 'Panel de administración — acceso completo' : 'Portal del empleado'}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(({ to, label, icon: Icon, desc, color }) => (
          <Link
            key={to}
            to={to}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
          >
            <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${color} mb-4 group-hover:scale-105 transition-transform`}>
              <Icon size={22} />
            </div>
            <h3 className="font-semibold text-gray-900">{label}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
