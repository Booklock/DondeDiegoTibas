import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { PageHeader } from '../../components/ui/PageHeader'
import { Users, DollarSign, CreditCard, ClipboardList, Calculator } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function DashboardPage() {
  const { perfil, esDueno } = useAuth()
  const [badges, setBadges] = useState({ pagos: 0, encargos: 0 })

  useEffect(() => {
    if (!esDueno) return
    Promise.all([
      supabase
        .from('pagos_pendientes')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'pendiente'),
      supabase
        .from('encargos')
        .select('id', { count: 'exact', head: true })
        .eq('pagado', false),
    ]).then(([{ count: pagos }, { count: encargos }]) => {
      setBadges({ pagos: pagos ?? 0, encargos: encargos ?? 0 })
    })
  }, [esDueno])

  const modulesDueno = [
    {
      to: '/rrhh',
      label: 'RRHH',
      icon: Users,
      desc: 'Empleados, salarios y vacaciones',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      to: '/finanzas',
      label: 'Finanzas',
      icon: DollarSign,
      desc: 'Cierres de caja e ingresos',
      color: 'bg-green-50 text-green-600',
    },
    {
      to: '/pagos',
      label: 'Pagos',
      icon: CreditCard,
      desc: 'Pagos pendientes a proveedores',
      color: 'bg-blue-50 text-blue-600',
      badge: badges.pagos,
    },
    {
      to: '/encargos',
      label: 'Encargos',
      icon: ClipboardList,
      desc: 'Pedidos de clientes pendientes',
      color: 'bg-amber-50 text-amber-600',
      badge: badges.encargos,
    },
    {
      to: '/contadora',
      label: 'Contadora',
      icon: Calculator,
      desc: 'Reportes mensuales contables',
      color: 'bg-teal-50 text-teal-600',
    },
  ]

  const modulesEmpleado = [
    {
      to: '/rrhh',
      label: 'Mi perfil',
      icon: Users,
      desc: 'Tu información, salario y vacaciones',
      color: 'bg-purple-50 text-purple-600',
    },
  ]

  const modules = esDueno ? modulesDueno : modulesEmpleado

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={`Bienvenido, ${perfil?.nombre} 👋`}
        subtitle={esDueno ? 'Panel de administración — acceso completo' : 'Portal del empleado'}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(({ to, label, icon: Icon, desc, color, badge }) => (
          <Link
            key={to}
            to={to}
            className="relative bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
          >
            {badge > 0 && (
              <span className="absolute top-3 right-3 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 bg-red-500 text-white text-xs font-bold rounded-full leading-none">
                {badge}
              </span>
            )}
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
