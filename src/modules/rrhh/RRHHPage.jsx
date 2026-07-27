import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useVacaciones } from './hooks/useVacaciones'
import { PageHeader } from '../../components/ui/PageHeader'
import { Table } from '../../components/ui/Table'
import { GestionRoles } from './components/GestionRoles'
import { PlanillaTab } from './components/PlanillaTab'
import { RotacionTab } from './components/RotacionTab'
import { Shield, CalendarDays, CalendarRange } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n)
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CR') : '—'

// ── Vista del empleado ────────────────────────────────────────
function VistaEmpleado() {
  const { perfil } = useAuth()
  const [empleadoId, setEmpleadoId] = useState(null)
  const [empleado, setEmpleado] = useState(null)
  const [sinFicha, setSinFicha] = useState(false)
  const { vacaciones, totalAcumulado, totalUsado } = useVacaciones(empleadoId)

  useEffect(() => {
    supabase.from('empleados')
      .select(`*, perfil:perfiles(nombre, apellidos, email, telefono), salario_actual:salarios(monto, fecha_inicio, fecha_fin)`)
      .eq('perfil_id', perfil.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setEmpleado(data); setEmpleadoId(data.id) }
        else setSinFicha(true)
      })
  }, [perfil.id])

  if (!empleado && !sinFicha) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (sinFicha) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-4xl mb-3">👋</p>
        <p className="text-lg font-semibold text-gray-800">Hola, {perfil.nombre}</p>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Tu cuenta está activa pero el administrador todavía no ha creado tu ficha de empleado.
          Contactá al dueño para que complete tu registro.
        </p>
      </div>
    )
  }

  const salarioActual = empleado.salario_actual?.find(s => !s.fecha_fin) ?? empleado.salario_actual?.[0]

  const vacCols = [
    { key: 'fecha_inicio', label: 'Desde', render: r => fmtDate(r.fecha_inicio) },
    { key: 'fecha_fin',    label: 'Hasta', render: r => fmtDate(r.fecha_fin) },
    { key: 'dias_acumulados', label: 'Acumulados', render: r => `${r.dias_acumulados} días` },
    { key: 'dias_usados',  label: 'Usados',  render: r => `${r.dias_usados} días` },
    { key: 'disponible',   label: 'Disponible', render: r => `${(r.dias_acumulados - r.dias_usados).toFixed(1)} días` },
  ]

  return (
    <>
      <PageHeader title="Mi perfil" subtitle="Tu información personal y beneficios" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Mis datos</p>
          <p className="font-semibold text-gray-900 text-lg">{empleado.perfil?.nombre} {empleado.perfil?.apellidos}</p>
          <p className="text-sm text-gray-500">{empleado.perfil?.email}</p>
          {empleado.perfil?.telefono && <p className="text-sm text-gray-500">{empleado.perfil.telefono}</p>}
          <p className="text-sm font-medium text-gray-700 mt-2">{empleado.puesto}</p>
        </div>

        <div className="bg-brand-50 rounded-xl border border-brand-100 p-5">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">Salario actual</p>
          <p className="text-2xl font-bold text-brand-800">
            {salarioActual ? fmt(salarioActual.monto) : '—'}
          </p>
          {salarioActual?.fecha_inicio && (
            <p className="text-xs text-brand-600 mt-1">desde {fmtDate(salarioActual.fecha_inicio)}</p>
          )}
        </div>

        <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Vacaciones disponibles</p>
          <p className="text-2xl font-bold text-blue-800">{(totalAcumulado - totalUsado).toFixed(1)} días</p>
          <p className="text-xs text-blue-600 mt-1">{totalAcumulado} acumulados · {totalUsado} usados</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Historial de vacaciones</h3>
        <Table columns={vacCols} data={vacaciones} emptyMessage="Sin historial de vacaciones" />
      </div>
    </>
  )
}

const TABS = [
  { id: 'planilla',  label: 'Planilla',           icon: CalendarDays  },
  { id: 'rotacion',  label: 'Rotación domingos',  icon: CalendarRange },
  { id: 'roles',     label: 'Roles y accesos',    icon: Shield        },
]

// ── Página principal ──────────────────────────────────────────
export default function RRHHPage() {
  const { esDueno } = useAuth()
  const [tab, setTab] = useState('planilla')

  if (!esDueno) {
    return <div className="p-4 sm:p-6"><VistaEmpleado /></div>
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader title="Recursos Humanos" subtitle="Planilla y gestión de roles" />
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'planilla'  && <PlanillaTab />}
      {tab === 'rotacion'  && <RotacionTab />}
      {tab === 'roles' && (
        <>
          <PageHeader title="Roles y accesos" subtitle="Administrá quién es dueño y quién es empleado" />
          <GestionRoles />
        </>
      )}
    </div>
  )
}
