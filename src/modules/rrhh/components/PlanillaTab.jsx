import { useState, useMemo } from 'react'
import { usePlanilla, useTurnos, usePlantillas, calcHorasNetas } from '../hooks/usePlanilla'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { FormField, Input } from '../../../components/ui/FormField'
import { ChevronLeft, ChevronRight, Plus, Edit2, UserMinus, Clock, LayoutGrid, CalendarRange, LayoutTemplate } from 'lucide-react'
import { ColillaPago } from './ColillaPago'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n)
const HORAS_STD_DIA = 8
const DIAS_NOMBRES      = ['Vie', 'Sáb', 'Dom', 'Lun', 'Mar', 'Mié', 'Jue']
const DIAS_NOMBRES_FULL = ['Viernes', 'Sábado', 'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves']
const COLORES = ['bg-blue-400','bg-emerald-400','bg-violet-400','bg-amber-400','bg-rose-400','bg-cyan-400','bg-orange-400','bg-pink-400']
const HORA_MIN = 5
const HORA_MAX = 22
const RANGO_MIN = (HORA_MAX - HORA_MIN) * 60

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function getSemanaInicio() {
  const hoy = new Date()
  const dia = hoy.getDay()
  const desde = dia === 5 ? 0 : dia === 6 ? 1 : dia + 2
  const viernes = new Date(hoy)
  viernes.setDate(hoy.getDate() - desde)
  return localDateStr(viernes)
}
function desplazar(inicioStr, semanas) {
  const d = new Date(inicioStr + 'T00:00:00')
  d.setDate(d.getDate() + semanas * 7)
  return localDateStr(d)
}
function getDias(inicioStr) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicioStr + 'T00:00:00')
    d.setDate(d.getDate() + i)
    return localDateStr(d)
  })
}
function fmtRangoSemana(inicioStr) {
  const finStr = new Date(inicioStr + 'T00:00:00')
  finStr.setDate(finStr.getDate() + 6)
  const opts = { day: 'numeric', month: 'short' }
  return `${new Date(inicioStr + 'T00:00:00').toLocaleDateString('es-CR', opts)} – ${finStr.toLocaleDateString('es-CR', opts)}`
}
function fmtTime(t) { return t ? t.slice(0, 5) : '—' }
function timeToMinutes(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const ROLES = [
  { id: 'cocinero',         label: 'Cocinero/a'          },
  { id: 'supervisor',       label: 'Supervisor/a'        },
  { id: 'servicio_cliente', label: 'Servicio al cliente' },
]
const ALMUERZO_OPTS = [
  { value: 0,  label: 'Sin almuerzo' },
  { value: 30, label: '30 min'       },
  { value: 60, label: '1 hora'       },
]

function salarioHora(emp) {
  return (emp.salario_base ?? emp.salario_hora ?? 0) / 4.33 / 48
}
function calcPago(empleado, dias, turnoMap) {
  const hHora = salarioHora(empleado)
  let pago = 0, hrs_ot = 0, hrs_total = 0
  dias.forEach(d => {
    const turno = turnoMap[`${empleado.id}-${d}`]
    if (turno?.es_libre) return
    const h = turno?.horas ?? 0
    hrs_total += h
    const std = Math.min(h, HORAS_STD_DIA)
    const ot  = Math.max(h - HORAS_STD_DIA, 0)
    if (turno?.es_feriado) {
      pago += std * hHora * 2 + ot * hHora * 1.5 * 2
    } else if (turno?.incapacitado) {
      pago += std * hHora * 0.5
    } else {
      pago += std * hHora + ot * hHora * 1.5
    }
    hrs_ot += ot
  })
  return { hrs_total, hrs_ot, pago }
}

// ── Formulario empleado ────────────────────────────────────────
function EmpleadoForm({ inicial, onSubmit, onCancel, submitLabel = 'Guardar' }) {
  const [form, setForm] = useState({ nombre: '', salario_base: '', rol: 'cocinero', ...inicial })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hHora = form.salario_base ? Number(form.salario_base) / 4.33 / 48 : 0
  const fmtH  = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es requerido.'); return }
    if (!form.salario_base || Number(form.salario_base) <= 0) { setError('Salario inválido.'); return }
    setLoading(true)
    const { error } = await onSubmit({ nombre: form.nombre.trim(), salario_base: Number(form.salario_base), rol: form.rol })
    setLoading(false)
    if (error) setError(error.message)
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nombre del empleado">
        <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre completo" />
      </FormField>
      <FormField label={`Salario base mensual (₡)${hHora > 0 ? ` — ${fmtH(hHora)}/h` : ''}`}>
        <Input type="number" min="0" step="1" value={form.salario_base}
          onChange={e => setForm(f => ({ ...f, salario_base: e.target.value }))} placeholder="Ej: 350000" />
      </FormField>
      <FormField label="Rol">
        <div className="flex flex-wrap gap-2 pt-1">
          {ROLES.map(({ id, label }) => (
            <button key={id} type="button" onClick={() => setForm(f => ({ ...f, rol: id }))}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                form.rol === id ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300'
              }`}>{label}</button>
          ))}
        </div>
      </FormField>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>{submitLabel}</Button>
      </div>
    </form>
  )
}

// ── Formulario de turno ────────────────────────────────────────
function TurnoForm({ fecha, empleadoNombre, inicial, onSave, onDelete, onCancel }) {
  const [form, setForm] = useState({
    hora_inicio:  inicial?.hora_inicio?.slice(0, 5) ?? '06:30',
    hora_fin:     inicial?.hora_fin?.slice(0, 5)    ?? '15:00',
    almuerzo_min: inicial?.almuerzo_min ?? 60,
    es_feriado:   inicial?.es_feriado   ?? false,
    incapacitado: inicial?.incapacitado  ?? false,
    es_libre:     inicial?.es_libre      ?? false,
  })

  const horasNetas = form.es_libre ? 0 : calcHorasNetas(form.hora_inicio, form.hora_fin, form.almuerzo_min)
  const esOT = horasNetas > HORAS_STD_DIA

  function toggleLibre() {
    setForm(f => ({ ...f, es_libre: !f.es_libre, es_feriado: false, incapacitado: false }))
  }
  function toggleFeriado() {
    setForm(f => ({ ...f, es_feriado: !f.es_feriado, incapacitado: false, es_libre: false }))
  }
  function toggleIncapacitado() {
    setForm(f => ({ ...f, incapacitado: !f.incapacitado, es_feriado: false, es_libre: false }))
  }

  const previewColor = form.es_libre
    ? 'bg-green-50 border border-green-200'
    : form.es_feriado
      ? 'bg-purple-50 border border-purple-200'
      : form.incapacitado
        ? 'bg-sky-50 border border-sky-200'
        : esOT
          ? 'bg-orange-50 border border-orange-200'
          : 'bg-brand-50 border border-brand-100'
  const previewText = form.es_libre
    ? 'text-green-700'
    : form.es_feriado
      ? 'text-purple-700'
      : form.incapacitado
        ? 'text-sky-700'
        : esOT
          ? 'text-orange-700'
          : 'text-brand-700'

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {empleadoNombre} · {new Date(fecha + 'T00:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'short' })}
      </p>

      {/* Día libre — va primero para visibilidad */}
      <button type="button" onClick={toggleLibre}
        className={`w-full px-3 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
          form.es_libre
            ? 'bg-green-600 border-green-600 text-white'
            : 'bg-white border-gray-200 text-gray-600 hover:border-green-400'
        }`}>
        🏖 Día libre
      </button>

      {!form.es_libre && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Entrada">
              <Input type="time" value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} />
            </FormField>
            <FormField label="Salida">
              <Input type="time" value={form.hora_fin} onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Almuerzo">
            <div className="flex gap-2 pt-1">
              {ALMUERZO_OPTS.map(({ value, label }) => (
                <button key={value} type="button"
                  onClick={() => setForm(f => ({ ...f, almuerzo_min: value }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.almuerzo_min === value
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300'
                  }`}>{label}</button>
              ))}
            </div>
          </FormField>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Condición especial</p>
            <div className="flex gap-2">
              <button type="button" onClick={toggleFeriado}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  form.es_feriado ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
                }`}>🎉 Feriado (×2)</button>
              <button type="button" onClick={toggleIncapacitado}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  form.incapacitado ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-sky-300'
                }`}>🏥 Incapacitado (½)</button>
            </div>
          </div>
        </>
      )}

      <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${previewColor}`}>
        <span className={`text-sm font-semibold ${previewText}`}>
          {form.es_libre ? 'Día libre' : `${fmtTime(form.hora_inicio)} → ${fmtTime(form.hora_fin)}`}
        </span>
        {!form.es_libre && (
          <div className="text-right">
            <span className={`font-bold text-base ${previewText}`}>{horasNetas}h netas</span>
            {esOT && <p className="text-xs text-orange-500">{(horasNetas - HORAS_STD_DIA).toFixed(1)}h extra</p>}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-1">
        <div>{inicial && <Button type="button" variant="secondary" onClick={onDelete}>Quitar</Button>}</div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>Guardar</Button>
        </div>
      </div>
    </div>
  )
}

// ── Celda en tabla ─────────────────────────────────────────────
function CeldaTurno({ turno, fecha, empleadoNombre, onSave }) {
  const [editando, setEditando] = useState(false)
  const horas    = turno?.horas ?? null
  const esOT     = horas != null && horas > HORAS_STD_DIA
  const esLibre  = turno?.es_libre ?? false

  if (editando) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditando(false)}>
        <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
          <h3 className="font-semibold text-gray-900 mb-4">Registrar turno</h3>
          <TurnoForm
            fecha={fecha}
            empleadoNombre={empleadoNombre}
            inicial={turno}
            onSave={data => { setEditando(false); onSave(data) }}
            onDelete={() => { setEditando(false); onSave(null) }}
            onCancel={() => setEditando(false)}
          />
        </div>
      </div>
    )
  }

  const esFeriado    = turno?.es_feriado   ?? false
  const incapacitado = turno?.incapacitado  ?? false
  const cellBg = esLibre
    ? 'bg-green-50 text-green-700 hover:bg-green-100'
    : !turno
      ? 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
      : esFeriado
        ? 'bg-purple-50 text-purple-700 hover:bg-purple-100'
        : incapacitado
          ? 'bg-sky-50 text-sky-700 hover:bg-sky-100'
          : esOT
            ? 'bg-orange-50 text-orange-700 hover:bg-orange-100'
            : 'bg-brand-50 text-brand-700 hover:bg-brand-100'

  return (
    <button onClick={() => setEditando(true)}
      className={`w-full min-h-[52px] rounded-lg text-xs font-medium transition-colors flex flex-col items-center justify-center gap-0.5 ${cellBg}`}
    >
      {esLibre ? (
        <span className="font-semibold">🏖 Libre</span>
      ) : turno ? (
        <>
          <span>{fmtTime(turno.hora_inicio)} - {fmtTime(turno.hora_fin)}</span>
          <span className="font-bold">{horas}h</span>
          {esFeriado    && <span className="text-[10px] text-purple-500">Feriado</span>}
          {incapacitado && <span className="text-[10px] text-sky-500">Incapac.</span>}
        </>
      ) : '—'}
    </button>
  )
}

// ── Lista de plantillas globales ───────────────────────────────
function PlantillasListModal({ plantillas, plantillaMap, onEditar, onAplicar }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-1">
        Cada plantilla define el horario completo de todos los empleados. Editá la que quieras y aplicala a la semana actual.
      </p>
      {plantillas.map(p => {
        const empMap  = plantillaMap[p.id] ?? {}
        const numEmp  = Object.keys(empMap).length
        const tieneData = numEmp > 0
        return (
          <div key={p.id} className={`rounded-xl border p-4 ${tieneData ? 'border-brand-200 bg-brand-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-gray-800">{p.nombre}</p>
                <p className={`text-xs mt-0.5 ${tieneData ? 'text-brand-600' : 'text-gray-400'}`}>
                  {tieneData
                    ? `${numEmp} empleado${numEmp !== 1 ? 's' : ''} configurado${numEmp !== 1 ? 's' : ''}`
                    : 'Sin configurar — hacé clic en Editar para definir horarios'}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={() => onEditar(p)}>
                  <Edit2 size={13} /> Editar
                </Button>
                {tieneData && (
                  <Button size="sm" onClick={() => onAplicar(p)}>
                    <LayoutTemplate size={13} /> Aplicar semana
                  </Button>
                )}
              </div>
            </div>
          </div>
        )
      })}
      <p className="text-xs text-gray-400 text-center pt-1">
        "Aplicar semana" llena los días vacíos de la semana actual. No sobreescribe turnos ya registrados.
      </p>
    </div>
  )
}

// ── Editor de plantilla (todos los empleados × 7 días) ────────
function PlantillaEditorModal({ plantilla, empleados, detalleMap, onGuardar, onClose }) {
  // detalleMap: { empleado_id: { pos: row } }
  const [form, setForm] = useState(() => {
    const f = {}
    empleados.forEach(emp => {
      f[emp.id] = Array.from({ length: 7 }, (_, pos) => {
        const p = detalleMap?.[emp.id]?.[pos]
        return {
          pos,
          es_libre:     p?.es_libre    ?? false,
          hora_inicio:  p?.hora_inicio?.slice(0, 5) ?? '06:30',
          hora_fin:     p?.hora_fin?.slice(0, 5)    ?? '15:00',
          almuerzo_min: p?.almuerzo_min ?? 60,
        }
      })
    })
    return f
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function setDia(empId, pos, key, val) {
    setForm(f => ({ ...f, [empId]: f[empId].map(d => d.pos === pos ? { ...d, [key]: val } : d) }))
  }
  function toggleLibre(empId, pos) {
    setForm(f => ({ ...f, [empId]: f[empId].map(d => d.pos === pos ? { ...d, es_libre: !d.es_libre } : d) }))
  }

  async function handleGuardar() {
    setSaving(true)
    setError('')
    const rows = []
    empleados.forEach(emp => {
      ;(form[emp.id] ?? []).forEach(d => rows.push({ empleado_id: emp.id, ...d }))
    })
    const { error: err } = await onGuardar(plantilla.id, rows)
    setSaving(false)
    if (err) setError(err.message ?? 'Error al guardar.')
  }

  const inputCls = 'w-full text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400'

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Horario tipo de todos los empleados para <strong>{plantilla.nombre}</strong>.
        Podés aplicarla a cualquier semana después.
      </p>
      <div className="overflow-x-auto">
        <table className="text-sm w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 sticky left-0 bg-gray-50 min-w-[130px]">
                Empleado
              </th>
              {DIAS_NOMBRES_FULL.map((d, i) => (
                <th key={i} className="text-center px-1 py-2 min-w-[105px]">
                  <p className="text-[10px] font-normal text-gray-400">{DIAS_NOMBRES[i]}</p>
                  <p className="text-xs font-semibold text-gray-600">{d}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {empleados.map(emp => (
              <tr key={emp.id}>
                <td className="px-3 py-2 sticky left-0 bg-white border-r border-gray-100">
                  <p className="font-medium text-gray-800 text-sm truncate max-w-[120px]">{emp.nombre}</p>
                  <p className="text-xs text-gray-400">{ROLES.find(r => r.id === emp.rol)?.label ?? emp.rol}</p>
                </td>
                {(form[emp.id] ?? []).map(dia => (
                  <td key={dia.pos} className="px-1 py-1.5">
                    <div className={`rounded-lg border p-1.5 ${dia.es_libre ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                      <button
                        onClick={() => toggleLibre(emp.id, dia.pos)}
                        className={`w-full text-[10px] font-semibold py-0.5 rounded mb-1.5 transition-colors ${
                          dia.es_libre
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-brand-50 text-brand-700 hover:bg-green-50 hover:text-green-600'
                        }`}
                      >
                        {dia.es_libre ? '🏖 Libre' : '✓ Trabaja'}
                      </button>
                      {!dia.es_libre && (
                        <div className="space-y-0.5">
                          <input type="time" value={dia.hora_inicio}
                            onChange={e => setDia(emp.id, dia.pos, 'hora_inicio', e.target.value)}
                            className={inputCls} />
                          <input type="time" value={dia.hora_fin}
                            onChange={e => setDia(emp.id, dia.pos, 'hora_fin', e.target.value)}
                            className={inputCls} />
                          <select value={dia.almuerzo_min}
                            onChange={e => setDia(emp.id, dia.pos, 'almuerzo_min', Number(e.target.value))}
                            className={inputCls}>
                            <option value={0}>Sin alm.</option>
                            <option value={30}>30 min</option>
                            <option value={60}>1 hora</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-3">{error}</p>
      )}
      <div className="flex gap-2 pt-4">
        <Button onClick={handleGuardar} loading={saving} className="flex-1">Guardar plantilla</Button>
        <Button variant="secondary" onClick={onClose}>← Volver</Button>
      </div>
    </div>
  )
}

// ── Vista visual de horario (Gantt) ────────────────────────────
function VistaHorario({ empleados, dias, turnoMap, onEditarTurno }) {
  const [diaIdx, setDiaIdx] = useState(0)
  const diaActual = dias[diaIdx]
  const horas = Array.from({ length: HORA_MAX - HORA_MIN + 1 }, (_, i) => HORA_MIN + i)

  const coberturaHoras = useMemo(() => {
    const result = {}
    for (let h = HORA_MIN; h < HORA_MAX; h++) {
      const midMin = h * 60 + 30
      let cocinero = false, supervisor = false
      empleados.forEach(emp => {
        const turno = turnoMap[`${emp.id}-${diaActual}`]
        if (!turno?.hora_inicio) return
        const ini = timeToMinutes(turno.hora_inicio)
        const fin = timeToMinutes(turno.hora_fin)
        if (ini <= midMin && midMin < fin) {
          if (emp.rol === 'cocinero')   cocinero   = true
          if (emp.rol === 'supervisor') supervisor = true
        }
      })
      result[h] = { cocinero, supervisor }
    }
    return result
  }, [empleados, turnoMap, diaActual])

  const hayTurnos = empleados.some(emp => {
    const t = turnoMap[`${emp.id}-${diaActual}`]
    return t && !t.es_libre && t.hora_inicio
  })

  return (
    <div>
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {dias.map((d, i) => {
          const [, mm, dd] = d.split('-')
          const faltaRol = (() => {
            if (!empleados.some(emp => turnoMap[`${emp.id}-${d}`]?.hora_inicio)) return false
            for (let h = HORA_MIN; h < HORA_MAX; h++) {
              const mid = h * 60 + 30
              let c = false, s = false
              empleados.forEach(emp => {
                const t = turnoMap[`${emp.id}-${d}`]
                if (!t?.hora_inicio) return
                if (timeToMinutes(t.hora_inicio) <= mid && mid < timeToMinutes(t.hora_fin)) {
                  if (emp.rol === 'cocinero') c = true
                  if (emp.rol === 'supervisor') s = true
                }
              })
              if (!c || !s) return true
            }
            return false
          })()
          return (
            <button key={d} onClick={() => setDiaIdx(i)}
              className={`flex-none flex flex-col items-center px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                diaIdx === i ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              <span className="text-xs opacity-70">{DIAS_NOMBRES[i]}</span>
              <span>{dd}/{mm}</span>
              {faltaRol && <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-0.5" />}
            </button>
          )
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="w-36 shrink-0 px-4 py-2 text-xs font-semibold text-gray-400">Empleado</div>
          <div className="flex-1 relative h-8">
            {horas.map(h => (
              <div key={h} className="absolute top-0 h-full flex items-end pb-1"
                style={{ left: `${((h - HORA_MIN) / (HORA_MAX - HORA_MIN)) * 100}%` }}>
                <span className="text-xs text-gray-400 -translate-x-1/2">{h}:00</span>
              </div>
            ))}
          </div>
        </div>

        {empleados.map((emp, idx) => {
          const turno    = turnoMap[`${emp.id}-${diaActual}`] ?? null
          const esLibre  = turno?.es_libre ?? false
          const inicioMin = (!esLibre && turno) ? timeToMinutes(turno.hora_inicio) : null
          const finMin    = (!esLibre && turno) ? timeToMinutes(turno.hora_fin)    : null
          const left  = inicioMin != null ? ((inicioMin - HORA_MIN * 60) / RANGO_MIN) * 100 : null
          const width = (inicioMin != null && finMin != null) ? ((finMin - inicioMin) / RANGO_MIN) * 100 : null
          const colorBar = COLORES[idx % COLORES.length]

          return (
            <div key={emp.id}
              className="flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
              style={{ minHeight: 56 }}
              onClick={() => onEditarTurno(emp, diaActual)}
            >
              <div className="w-36 shrink-0 px-4 py-2">
                <p className="text-sm font-medium text-gray-800 truncate">{emp.nombre}</p>
                {turno && !esLibre && <p className="text-xs text-gray-400">{turno.horas}h netas</p>}
                {esLibre && <p className="text-xs text-green-500">Día libre</p>}
              </div>
              <div className="flex-1 relative h-10">
                {horas.map(h => (
                  <div key={h} className="absolute top-0 h-full border-l border-gray-100"
                    style={{ left: `${((h - HORA_MIN) / (HORA_MAX - HORA_MIN)) * 100}%` }} />
                ))}
                {esLibre && (
                  <div className="absolute inset-y-1 inset-x-2 bg-green-100 rounded-lg flex items-center px-3">
                    <span className="text-green-600 text-xs font-semibold">🏖 Libre</span>
                  </div>
                )}
                {!esLibre && turno && left != null && width != null && (
                  <div className={`absolute top-1 bottom-1 ${colorBar} rounded-lg opacity-80 flex items-center px-2 overflow-hidden`}
                    style={{ left: `${left}%`, width: `${width}%` }}>
                    <span className="text-white text-xs font-semibold whitespace-nowrap">
                      {fmtTime(turno.hora_inicio)} – {fmtTime(turno.hora_fin)}
                    </span>
                  </div>
                )}
                {!turno && (
                  <div className="absolute inset-0 flex items-center px-4 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Plus size={12} /> Agregar turno</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {hayTurnos && (
          <div className="flex items-center border-t-2 border-gray-200 bg-gray-50" style={{ minHeight: 36 }}>
            <div className="w-36 shrink-0 px-4 py-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cobertura</p>
            </div>
            <div className="flex-1 relative h-9">
              {horas.map(h => {
                const cob = coberturaHoras[h] ?? {}
                const ok  = cob.cocinero && cob.supervisor
                const empty = !cob.cocinero && !cob.supervisor
                return (
                  <div key={h} className="absolute top-1 bottom-1 flex items-center justify-center"
                    style={{ left: `${((h - HORA_MIN) / (HORA_MAX - HORA_MIN)) * 100}%`, width: `${(1 / (HORA_MAX - HORA_MIN)) * 100}%` }}
                    title={empty ? 'Sin cobertura' : ok ? 'Cocinero + Supervisor' : `Falta rol`}>
                    <div className={`w-4/5 h-full rounded ${empty ? '' : ok ? 'bg-green-300' : 'bg-amber-300'}`} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {hayTurnos && (
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-300 inline-block" />Cocinero + Supervisor</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-300 inline-block" />Falta un rol</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 inline-block" />Sin personal</span>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">Hacé clic en una fila para editar el turno.</p>
    </div>
  )
}

// ── Tab principal ──────────────────────────────────────────────
export function PlanillaTab() {
  const { empleados, loading: empLoading, crearEmpleado, actualizarEmpleado, desactivarEmpleado } = usePlanilla()
  const { plantillas, plantillaMap, guardarPlantilla } = usePlantillas()
  const [semanaInicio, setSemanaInicio] = useState(getSemanaInicio)
  const semanaFin = desplazar(semanaInicio, 1)
  const dias = getDias(semanaInicio)

  const { turnos, guardarTurno, aplicarSemana } = useTurnos(
    semanaInicio,
    new Date(semanaFin + 'T00:00:00').toISOString().slice(0, 10)
  )

  const [vista, setVista]               = useState('tabla')
  const [showNuevo, setShowNuevo]       = useState(false)
  const [editando, setEditando]         = useState(null)
  const [turnoModal, setTurnoModal]     = useState(null)
  const [plantillasOpen, setPlantillasOpen]   = useState(false)
  const [editorPlantilla, setEditorPlantilla] = useState(null)
  const [colilla, setColilla]           = useState(null)
  const [toast, setToast]               = useState('')
  const [aplicando, setAplicando]       = useState(false)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const turnoMap = useMemo(() => {
    const m = {}
    turnos.forEach(t => { m[`${t.empleado_id}-${t.fecha}`] = { ...t, horas: Number(t.horas) } })
    return m
  }, [turnos])

  const horasPorDia = useMemo(() => {
    const m = {}
    dias.forEach(d => { m[d] = empleados.reduce((s, emp) => s + (turnoMap[`${emp.id}-${d}`]?.horas ?? 0), 0) })
    return m
  }, [turnoMap, dias, empleados])

  async function handleCrear(data) {
    const { error } = await crearEmpleado(data)
    if (error) return { error }
    setShowNuevo(false); showToast('Empleado agregado.')
    return {}
  }
  async function handleEditar(data) {
    const { error } = await actualizarEmpleado(editando.id, data)
    if (error) return { error }
    setEditando(null); showToast('Empleado actualizado.')
    return {}
  }
  async function handleDesactivar(emp) {
    if (!confirm(`¿Desactivar a ${emp.nombre}?`)) return
    await desactivarEmpleado(emp.id); showToast(`${emp.nombre} desactivado.`)
  }

  function handleEditarPlantilla(plantilla) {
    setPlantillasOpen(false)
    setEditorPlantilla(plantilla)
  }
  function handleCerrarEditor() {
    setEditorPlantilla(null)
    setPlantillasOpen(true)
  }
  async function handleGuardarPlantilla(plantilla_id, rows) {
    const { error } = await guardarPlantilla(plantilla_id, rows)
    return { error }
  }
  async function handleAplicarSemana(plantilla) {
    if (!confirm(`¿Aplicar "${plantilla.nombre}" a la semana actual? Solo se llenarán los días vacíos.`)) return
    setPlantillasOpen(false)
    setAplicando(true)
    const empMap = plantillaMap[plantilla.id] ?? {}
    const { count, error } = await aplicarSemana(empleados, dias, empMap)
    setAplicando(false)
    if (error) showToast('Error al aplicar plantilla.')
    else if (count === 0) showToast('No hay días vacíos que rellenar.')
    else showToast(`${count} turnos aplicados desde "${plantilla.nombre}".`)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
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
          <button onClick={() => setSemanaInicio(getSemanaInicio())}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors">
            Esta semana
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="secondary" onClick={() => setPlantillasOpen(true)} loading={aplicando}>
            <LayoutTemplate size={14} /> Plantillas
          </Button>
          <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-lg">
            {[['tabla', <LayoutGrid size={14} />, 'Tabla'], ['horario', <CalendarRange size={14} />, 'Visual']].map(([id, icon, label]) => (
              <button key={id} onClick={() => setVista(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${vista === id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {icon}{label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setShowNuevo(true)}>
            <Plus size={14} /> Nuevo empleado
          </Button>
        </div>
      </div>

      {empLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : empleados.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          No hay empleados en la planilla. Agregá uno para comenzar.
        </div>
      ) : vista === 'horario' ? (
        <VistaHorario
          empleados={empleados}
          dias={dias}
          turnoMap={turnoMap}
          onEditarTurno={(emp, fecha) => setTurnoModal({ emp, fecha, turno: turnoMap[`${emp.id}-${fecha}`] ?? null })}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[150px]">Empleado</th>
                {dias.map((d, i) => {
                  const [, mm, dd] = d.split('-')
                  return (
                    <th key={d} className="text-center px-1 py-3 font-semibold text-gray-500 min-w-[90px]">
                      <p>{DIAS_NOMBRES[i]}</p>
                      <p className="text-xs font-normal text-gray-400">{dd}/{mm}</p>
                    </th>
                  )
                })}
                <th className="text-center px-3 py-3 font-semibold text-gray-600 min-w-[60px]">Total h</th>
                <th className="text-center px-3 py-3 font-semibold text-orange-500 min-w-[50px]">HE</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 min-w-[110px]">Pago bruto</th>
                <th className="px-2 py-3 min-w-[90px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empleados.map(emp => {
                const { hrs_total, hrs_ot, pago } = calcPago(emp, dias, turnoMap)
                const tieneLibres = dias.some(d => turnoMap[`${emp.id}-${d}`]?.es_libre)
                return (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{emp.nombre}</p>
                      <p className="text-xs text-gray-400">{ROLES.find(r => r.id === emp.rol)?.label ?? emp.rol} · {fmt(salarioHora(emp))}/h</p>
                      {tieneLibres && <p className="text-xs text-green-500 mt-0.5">Con día libre</p>}
                    </td>
                    {dias.map(d => {
                      const turno = turnoMap[`${emp.id}-${d}`] ?? null
                      return (
                        <td key={d} className={`px-1 py-1 text-center ${turno && !turno.es_libre && turno.horas > HORAS_STD_DIA ? 'bg-orange-50' : ''}`}>
                          <CeldaTurno
                            turno={turno}
                            fecha={d}
                            empleadoNombre={emp.nombre}
                            onSave={data => guardarTurno(emp.id, d, data)}
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
                      {hrs_ot > 0 ? <span className="text-orange-500 font-semibold">{hrs_ot}h</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {pago > 0 ? <span className="font-semibold text-gray-900">{fmt(pago)}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setColilla({ emp, dias, turnoMap, semanaInicio })}
                          className="p-1.5 hover:bg-brand-50 rounded-lg transition-colors" title="Ver colilla de pago">
                          <Clock size={13} className="text-brand-500" />
                        </button>
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
                    return totalPago > 0 ? <span className="font-bold text-gray-900">{fmt(totalPago)}</span> : null
                  })()}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        Hacé clic en una celda para registrar o editar el turno. Las celdas verdes son días libres. Las naranjas superan las 8h. HE = horas extra (1.5×).
      </p>

      {/* Modal turno desde vista horario */}
      {turnoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setTurnoModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">Registrar turno</h3>
            <TurnoForm
              fecha={turnoModal.fecha}
              empleadoNombre={turnoModal.emp.nombre}
              inicial={turnoModal.turno}
              onSave={data => { guardarTurno(turnoModal.emp.id, turnoModal.fecha, data); setTurnoModal(null) }}
              onDelete={() => { guardarTurno(turnoModal.emp.id, turnoModal.fecha, null); setTurnoModal(null) }}
              onCancel={() => setTurnoModal(null)}
            />
          </div>
        </div>
      )}

      {/* Modal lista de plantillas */}
      <Modal open={plantillasOpen} onClose={() => setPlantillasOpen(false)} title="Plantillas de horario" size="md">
        <PlantillasListModal
          plantillas={plantillas}
          plantillaMap={plantillaMap}
          onEditar={handleEditarPlantilla}
          onAplicar={handleAplicarSemana}
        />
      </Modal>

      {/* Modal editor de plantilla (todos los empleados) */}
      {editorPlantilla && (
        <Modal open onClose={handleCerrarEditor} title={`Editar ${editorPlantilla.nombre}`} size="xl">
          <PlantillaEditorModal
            plantilla={editorPlantilla}
            empleados={empleados}
            detalleMap={plantillaMap[editorPlantilla.id]}
            onGuardar={handleGuardarPlantilla}
            onClose={handleCerrarEditor}
          />
        </Modal>
      )}

      <Modal open={showNuevo} onClose={() => setShowNuevo(false)} title="Agregar empleado a planilla">
        <EmpleadoForm onSubmit={handleCrear} onCancel={() => setShowNuevo(false)} submitLabel="Agregar" />
      </Modal>

      {editando && (
        <Modal open onClose={() => setEditando(null)} title={`Editar — ${editando.nombre}`}>
          <EmpleadoForm
            inicial={{ nombre: editando.nombre, salario_base: editando.salario_base ?? editando.salario_hora, rol: editando.rol ?? 'cocinero' }}
            onSubmit={handleEditar}
            onCancel={() => setEditando(null)}
            submitLabel="Guardar cambios"
          />
        </Modal>
      )}

      {colilla && (
        <ColillaPago
          empleado={colilla.emp}
          dias={colilla.dias}
          turnoMap={colilla.turnoMap}
          semanaInicio={colilla.semanaInicio}
          onClose={() => setColilla(null)}
        />
      )}

      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">{toast}</div>}
    </div>
  )
}
