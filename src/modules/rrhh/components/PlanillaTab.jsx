import { useState, useMemo } from 'react'
import { usePlanilla, useTurnos } from '../hooks/usePlanilla'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { FormField, Input } from '../../../components/ui/FormField'
import { ChevronLeft, ChevronRight, Plus, Edit2, UserMinus } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n)
const HORAS_STD_DIA = 8   // jornada ordinaria diaria
const DIAS_NOMBRES = ['Vie', 'Sáb', 'Dom', 'Lun', 'Mar', 'Mié', 'Jue']

function getSemanaInicio() {
  const hoy = new Date()
  const dia = hoy.getDay()
  // Días transcurridos desde el viernes anterior (Fri=5, Sat=6, Sun=0…Thu=4)
  const desde = dia === 5 ? 0 : dia === 6 ? 1 : dia + 2
  const viernes = new Date(hoy)
  viernes.setDate(hoy.getDate() - desde)
  return viernes.toISOString().slice(0, 10)
}

function desplazar(inicioStr, semanas) {
  const d = new Date(inicioStr + 'T00:00:00')
  d.setDate(d.getDate() + semanas * 7)
  return d.toISOString().slice(0, 10)
}

function getDias(inicioStr) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicioStr + 'T00:00:00')
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function fmtRangoSemana(inicioStr) {
  const fin = desplazar(inicioStr, 1)
  const finStr = new Date(desplazar(inicioStr, 0) + 'T00:00:00')
  finStr.setDate(finStr.getDate() + 6)
  const opts = { day: 'numeric', month: 'short' }
  const start = new Date(inicioStr + 'T00:00:00').toLocaleDateString('es-CR', opts)
  const end = finStr.toLocaleDateString('es-CR', opts)
  return `${start} – ${end}`
}

function calcPago(empleado, dias, turnoMap) {
  let pago = 0
  let hrs_ot = 0
  let hrs_total = 0
  dias.forEach(d => {
    const h = turnoMap[`${empleado.id}-${d}`] ?? 0
    hrs_total += h
    const std = Math.min(h, HORAS_STD_DIA)
    const ot  = Math.max(h - HORAS_STD_DIA, 0)
    pago    += std * empleado.salario_hora + ot * empleado.salario_hora * 1.5
    hrs_ot  += ot
  })
  return { hrs_total, hrs_ot, pago }
}

// ── Formulario de empleado ─────────────────────────────────────
function EmpleadoForm({ inicial, onSubmit, onCancel, submitLabel = 'Guardar' }) {
  const [form, setForm] = useState({ nombre: '', salario_hora: '', ...inicial })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es requerido.'); return }
    if (!form.salario_hora || Number(form.salario_hora) <= 0) { setError('Ingresá un salario por hora válido.'); return }
    setLoading(true)
    const { error } = await onSubmit({ nombre: form.nombre.trim(), salario_hora: Number(form.salario_hora) })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nombre del empleado">
        <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre completo" />
      </FormField>
      <FormField label="Salario por hora (₡)">
        <Input type="number" min="0" step="0.01" value={form.salario_hora}
          onChange={e => setForm(f => ({ ...f, salario_hora: e.target.value }))}
          placeholder="Ej: 1250" />
      </FormField>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>{submitLabel}</Button>
      </div>
    </form>
  )
}

// ── Celda editable ─────────────────────────────────────────────
function CeldaHoras({ valor, onSave }) {
  const [editando, setEditando] = useState(false)
  const [draft, setDraft] = useState('')

  function iniciarEdicion() {
    setDraft(valor ?? '')
    setEditando(true)
  }

  function confirmar() {
    setEditando(false)
    const h = draft === '' ? null : Number(draft)
    if (h !== (valor ?? null)) onSave(h)
  }

  function handleKey(e) {
    if (e.key === 'Enter') confirmar()
    if (e.key === 'Escape') setEditando(false)
  }

  if (editando) {
    return (
      <input
        type="number" min="0" max="24" step="0.5"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={confirmar}
        onKeyDown={handleKey}
        autoFocus
        className="w-14 text-center px-1 py-1 border-2 border-brand-500 rounded text-sm focus:outline-none"
      />
    )
  }

  return (
    <button
      onClick={iniciarEdicion}
      className={`w-14 h-8 rounded text-sm font-medium transition-colors ${
        valor ? 'bg-brand-50 text-brand-700 hover:bg-brand-100' : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
      }`}
    >
      {valor != null ? `${valor}h` : '—'}
    </button>
  )
}

// ── Tab principal de planilla ──────────────────────────────────
export function PlanillaTab() {
  const { empleados, loading: empLoading, crearEmpleado, actualizarEmpleado, desactivarEmpleado } = usePlanilla()
  const [semanaInicio, setSemanaInicio] = useState(getSemanaInicio)
  const semanaFin = desplazar(semanaInicio, 1)
  const dias = getDias(semanaInicio)

  const { turnos, guardarTurno } = useTurnos(semanaInicio, new Date(semanaFin + 'T00:00:00').toISOString().slice(0, 10))

  const [showNuevo, setShowNuevo] = useState(false)
  const [editando, setEditando] = useState(null)
  const [toast, setToast] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const turnoMap = useMemo(() => {
    const m = {}
    turnos.forEach(t => { m[`${t.empleado_id}-${t.fecha}`] = Number(t.horas) })
    return m
  }, [turnos])

  const horasPorDia = useMemo(() => {
    const m = {}
    dias.forEach(d => {
      m[d] = empleados.reduce((s, emp) => s + (turnoMap[`${emp.id}-${d}`] ?? 0), 0)
    })
    return m
  }, [turnos, dias, empleados])

  async function handleCrear(data) {
    const { error } = await crearEmpleado(data)
    if (error) return { error }
    setShowNuevo(false)
    showToast('Empleado agregado.')
    return {}
  }

  async function handleEditar(data) {
    const { error } = await actualizarEmpleado(editando.id, data)
    if (error) return { error }
    setEditando(null)
    showToast('Empleado actualizado.')
    return {}
  }

  async function handleDesactivar(emp) {
    if (!confirm(`¿Desactivar a ${emp.nombre}? Ya no aparecerá en la planilla.`)) return
    await desactivarEmpleado(emp.id)
    showToast(`${emp.nombre} desactivado.`)
  }

  const jueves = new Date(semanaInicio + 'T00:00:00')
  jueves.setDate(jueves.getDate() + 6)
  const juevesFin = jueves.toISOString().slice(0, 10)

  return (
    <div>
      {/* Header semana */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSemanaInicio(d => desplazar(d, -1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">{fmtRangoSemana(semanaInicio)}</p>
            <p className="text-xs text-gray-400">Corte Vie → Jue · Pago el viernes</p>
          </div>
          <button onClick={() => setSemanaInicio(d => desplazar(d, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setSemanaInicio(getSemanaInicio())} className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors">
            Semana actual
          </button>
        </div>
        <Button size="sm" onClick={() => setShowNuevo(true)}>
          <Plus size={14} /> Nuevo empleado
        </Button>
      </div>

      {empLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : empleados.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          No hay empleados en la planilla. Agregá uno para comenzar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[180px]">Empleado</th>
                {dias.map((d, i) => {
                  const [, mm, dd] = d.split('-')
                  return (
                    <th key={d} className="text-center px-2 py-3 font-semibold text-gray-500 min-w-[60px]">
                      <p>{DIAS_NOMBRES[i]}</p>
                      <p className="text-xs font-normal text-gray-400">{dd}/{mm}</p>
                    </th>
                  )
                })}
                <th className="text-center px-3 py-3 font-semibold text-gray-600 min-w-[70px]">Total h</th>
                <th className="text-center px-3 py-3 font-semibold text-orange-500 min-w-[50px]">HE</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 min-w-[110px]">Pago</th>
                <th className="px-2 py-3 min-w-[60px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empleados.map(emp => {
                const { hrs_total, hrs_ot, pago } = calcPago(emp, dias, turnoMap)

                return (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{emp.nombre}</p>
                      <p className="text-xs text-gray-400">{fmt(emp.salario_hora)}/h</p>
                    </td>
                    {dias.map(d => {
                      const horas = turnoMap[`${emp.id}-${d}`] ?? null
                      const esOT = horas != null && horas > HORAS_STD_DIA
                      return (
                        <td key={d} className={`px-2 py-2 text-center ${esOT ? 'bg-orange-50' : ''}`}>
                          <CeldaHoras
                            valor={horas}
                            onSave={h => guardarTurno(emp.id, d, h)}
                          />
                        </td>
                      )
                    })}
                    <td className="px-3 py-3 text-center">
                      <span className={`font-semibold ${hrs_ot > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
                        {hrs_total > 0 ? `${hrs_total}h` : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {hrs_ot > 0
                        ? <span className="text-orange-500 font-semibold">{hrs_ot}h</span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      {pago > 0
                        ? <span className="font-semibold text-gray-900">{fmt(pago)}</span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setEditando(emp)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
                          <Edit2 size={13} className="text-gray-400" />
                        </button>
                        <button onClick={() => handleDesactivar(emp)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Desactivar">
                          <UserMinus size={13} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total día</td>
                {dias.map(d => (
                  <td key={d} className="px-2 py-3 text-center text-xs font-semibold text-gray-600">
                    {horasPorDia[d] > 0 ? `${horasPorDia[d]}h` : '—'}
                  </td>
                ))}
                <td colSpan={3} className="px-4 py-3 text-right">
                  {(() => {
                    const totalPago = empleados.reduce((s, emp) => s + calcPago(emp, dias, turnoMap).pago, 0)
                    return totalPago > 0
                      ? <span className="font-bold text-gray-900">{fmt(totalPago)}</span>
                      : null
                  })()}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Leyenda */}
      <p className="text-xs text-gray-400 mt-3">
        Hacé clic en cualquier celda para ingresar las horas. Borrá el valor para quitar el turno. Las celdas en naranja superan las 8h ordinarias. HE = horas extra (más de 8h/día, se pagan al 1.5×).
      </p>

      <Modal open={showNuevo} onClose={() => setShowNuevo(false)} title="Agregar empleado a planilla">
        <EmpleadoForm onSubmit={handleCrear} onCancel={() => setShowNuevo(false)} submitLabel="Agregar" />
      </Modal>

      {editando && (
        <Modal open onClose={() => setEditando(null)} title={`Editar — ${editando.nombre}`}>
          <EmpleadoForm
            inicial={{ nombre: editando.nombre, salario_hora: editando.salario_hora }}
            onSubmit={handleEditar}
            onCancel={() => setEditando(null)}
            submitLabel="Guardar cambios"
          />
        </Modal>
      )}

      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">{toast}</div>}
    </div>
  )
}
