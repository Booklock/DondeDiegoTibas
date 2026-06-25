import { useState } from 'react'
import { useVacaciones } from '../hooks/useVacaciones'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Table } from '../../../components/ui/Table'
import { Modal } from '../../../components/ui/Modal'
import { VacacionesForm } from './VacacionesForm'
import { Calendar, DollarSign, Plus, Umbrella, Trash2 } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n)
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CR') : '—'

export function EmpleadoDetalle({ empleado, esDueno, onClose }) {
  const { vacaciones, loading, diasGanados, totalUsado, disponibles, registrarVacacion, eliminarVacacion } =
    useVacaciones(empleado.id, empleado.fecha_ingreso)
  const [showVacForm, setShowVacForm] = useState(false)

  const salarioActual = empleado.salario_actual?.find(s => !s.fecha_fin) ?? empleado.salario_actual?.[0]

  const vacCols = [
    { key: 'fecha_inicio', label: 'Desde',  render: r => fmtDate(r.fecha_inicio) },
    { key: 'fecha_fin',    label: 'Hasta',   render: r => fmtDate(r.fecha_fin) },
    { key: 'dias_usados',  label: 'Días',    render: r => `${r.dias_usados} días` },
    { key: 'notas',        label: 'Notas',   render: r => r.notas || '—' },
    ...(esDueno ? [{
      key: 'acciones', label: '',
      render: r => (
        <button
          onClick={() => { if (confirm('¿Eliminar este registro de vacaciones?')) eliminarVacacion(r.id) }}
          className="p-1 hover:bg-red-50 rounded-lg"
        >
          <Trash2 size={13} className="text-red-400" />
        </button>
      )
    }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Info básica */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Información</p>
          <p className="font-semibold text-gray-900">{empleado.perfil?.nombre} {empleado.perfil?.apellidos}</p>
          <p className="text-sm text-gray-500">{empleado.perfil?.email}</p>
          {empleado.perfil?.telefono && <p className="text-sm text-gray-500">{empleado.perfil.telefono}</p>}
          <p className="text-sm text-gray-600 font-medium">{empleado.puesto}</p>
          {empleado.cedula && <p className="text-sm text-gray-500">Cédula: {empleado.cedula}</p>}
          <p className="text-sm text-gray-500">Ingreso: {fmtDate(empleado.fecha_ingreso)}</p>
          <Badge color={empleado.estado === 'activo' ? 'green' : 'gray'}>{empleado.estado}</Badge>
        </div>

        <div className="space-y-3">
          <div className="bg-brand-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-brand-700 mb-1">
              <DollarSign size={16} />
              <span className="text-xs font-semibold uppercase tracking-wide">Salario actual</span>
            </div>
            <p className="text-2xl font-bold text-brand-800">
              {salarioActual ? fmt(salarioActual.monto) : '—'}
            </p>
            {salarioActual?.fecha_inicio && (
              <p className="text-xs text-brand-600 mt-1">desde {fmtDate(salarioActual.fecha_inicio)}</p>
            )}
          </div>

          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <Umbrella size={16} />
              <span className="text-xs font-semibold uppercase tracking-wide">Vacaciones</span>
            </div>
            <p className="text-2xl font-bold text-blue-800">{disponibles.toFixed(1)} días disponibles</p>
            <p className="text-xs text-blue-600 mt-0.5">
              {diasGanados.toFixed(1)} ganados · {totalUsado.toFixed(1)} usados
            </p>
            <p className="text-xs text-blue-400 mt-1">12 días/año · lun–sáb</p>
          </div>
        </div>
      </div>

      {/* Vacaciones */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Calendar size={16} />
            Historial de vacaciones
          </h3>
          {esDueno && (
            <Button size="sm" onClick={() => setShowVacForm(true)}>
              <Plus size={14} /> Registrar
            </Button>
          )}
        </div>
        <Table columns={vacCols} data={vacaciones} emptyMessage="Sin registros de vacaciones" />
      </div>

      <Modal open={showVacForm} onClose={() => setShowVacForm(false)} title="Registrar vacaciones">
        <VacacionesForm
          disponibles={disponibles}
          onSubmit={async data => {
            const result = await registrarVacacion(data)
            if (!result.error) setShowVacForm(false)
            return result
          }}
          onCancel={() => setShowVacForm(false)}
        />
      </Modal>
    </div>
  )
}
