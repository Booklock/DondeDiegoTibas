import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useEmpleados } from './hooks/useEmpleados'
import { useVacaciones } from './hooks/useVacaciones'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { EmpleadoCreateForm, EmpleadoEditForm } from './components/EmpleadoForm'
import { EmpleadoDetalle } from './components/EmpleadoDetalle'
import { GestionRoles } from './components/GestionRoles'
import { PlanillaTab } from './components/PlanillaTab'
import { Plus, Eye, Edit2, UserMinus, Users, Shield, CalendarDays } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n)
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CR') : '—'

// ── Vista del dueño ───────────────────────────────────────────
function VistaDueno() {
  const { empleados, loading, crearEmpleadoNuevo, crearFichaEmpleado, actualizarEmpleado, desactivarEmpleado } = useEmpleados()
  const [showCreate, setShowCreate] = useState(false)
  const [editando, setEditando] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [toastMsg, setToastMsg] = useState('')

  function toast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  async function handleCrearNuevo(data) {
    const { error } = await crearEmpleadoNuevo(data)
    if (error) { toast('Error: ' + error.message); return }
    setShowCreate(false)
    toast('Empleado creado exitosamente.')
  }

  async function handleCrearExistente(data) {
    const { error } = await crearFichaEmpleado(data)
    if (error) { toast('Error: ' + error.message); return }
    setShowCreate(false)
    toast('Ficha de empleado creada.')
  }

  async function handleEdit(data) {
    const { error } = await actualizarEmpleado(editando.id, editando.perfil_id, data)
    if (error) { toast('Error al actualizar.'); return }
    setEditando(null)
    toast('Empleado actualizado.')
  }

  async function handleDesactivar(emp) {
    if (!confirm(`¿Desactivar a ${emp.perfil?.nombre}?`)) return
    await desactivarEmpleado(emp.id)
    toast('Empleado desactivado.')
  }

  const columns = [
    { key: 'nombre', label: 'Empleado', render: r => (
      <div>
        <p className="font-medium text-gray-900">{r.perfil?.nombre} {r.perfil?.apellidos}</p>
        <p className="text-xs text-gray-400">{r.perfil?.email}</p>
      </div>
    )},
    { key: 'puesto', label: 'Puesto', render: r => r.puesto },
    { key: 'fecha_ingreso', label: 'Ingreso', render: r => fmtDate(r.fecha_ingreso) },
    { key: 'salario', label: 'Salario', render: r => {
      const s = r.salario_actual?.find(s => !s.fecha_fin) ?? r.salario_actual?.[0]
      return s ? fmt(s.monto) : <span className="text-gray-400">—</span>
    }},
    { key: 'estado', label: 'Estado', render: r => (
      <Badge color={r.estado === 'activo' ? 'green' : 'gray'}>{r.estado}</Badge>
    )},
    { key: 'acciones', label: '', render: r => (
      <div className="flex items-center gap-1">
        <button onClick={() => setDetalle(r)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Ver detalle">
          <Eye size={15} className="text-gray-500" />
        </button>
        <button onClick={() => setEditando(r)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
          <Edit2 size={15} className="text-gray-500" />
        </button>
        {r.estado === 'activo' && (
          <button onClick={() => handleDesactivar(r)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Desactivar">
            <UserMinus size={15} className="text-red-400" />
          </button>
        )}
      </div>
    )},
  ]

  return (
    <>
      <PageHeader
        title="Recursos Humanos"
        subtitle={`${empleados.filter(e => e.estado === 'activo').length} empleados activos`}
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Nuevo empleado
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Table columns={columns} data={empleados} emptyMessage="No hay empleados registrados. Creá uno o asignale una ficha a un usuario existente." />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Agregar empleado" size="lg">
        <EmpleadoCreateForm
          onSubmitNuevo={handleCrearNuevo}
          onSubmitExistente={handleCrearExistente}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      {editando && (
        <Modal open onClose={() => setEditando(null)} title="Editar empleado" size="lg">
          <EmpleadoEditForm
            inicial={{
              nombre: editando.perfil?.nombre ?? '',
              apellidos: editando.perfil?.apellidos ?? '',
              telefono: editando.perfil?.telefono ?? '',
              cedula: editando.cedula ?? '',
              puesto: editando.puesto,
              fecha_ingreso: editando.fecha_ingreso,
              estado: editando.estado,
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditando(null)}
          />
        </Modal>
      )}

      {detalle && (
        <Modal open onClose={() => setDetalle(null)} title={`${detalle.perfil?.nombre} ${detalle.perfil?.apellidos}`} size="xl">
          <EmpleadoDetalle empleado={detalle} esDueno onClose={() => setDetalle(null)} />
        </Modal>
      )}

      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toastMsg}
        </div>
      )}
    </>
  )
}

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
  { id: 'planilla',  label: 'Planilla',       icon: CalendarDays },
  { id: 'empleados', label: 'Empleados',       icon: Users },
  { id: 'roles',     label: 'Roles y accesos', icon: Shield },
]

// ── Página principal ──────────────────────────────────────────
export default function RRHHPage() {
  const { esDueno } = useAuth()
  const [tab, setTab] = useState('planilla')

  if (!esDueno) {
    return <div className="p-6"><VistaEmpleado /></div>
  }

  return (
    <div className="p-6">
      <PageHeader title="Recursos Humanos" subtitle="Planilla, horarios y gestión de personal" />
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
      {tab === 'empleados' && <VistaDueno />}
      {tab === 'roles' && (
        <>
          <PageHeader title="Roles y accesos" subtitle="Administrá quién es dueño y quién es empleado" />
          <GestionRoles />
        </>
      )}
    </div>
  )
}
