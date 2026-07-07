import { useState, useMemo } from 'react'
import { usePlanilla, useTurnos, calcHorasNetas } from '../hooks/usePlanilla'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { FormField, Input } from '../../../components/ui/FormField'
import { ChevronLeft, ChevronRight, Plus, Edit2, UserMinus, Clock, LayoutGrid, CalendarRange } from 'lucide-react'
import { ColillaPago } from './ColillaPago'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n)
const HORAS_STD_DIA = 8
const DIAS_NOMBRES = ['Vie', 'Sáb', 'Dom', 'Lun', 'Mar', 'Mié', 'Jue']
const COLORES = ['bg-blue-400','bg-emerald-400','bg-violet-400','bg-amber-400','bg-rose-400','bg-cyan-400','bg-orange-400','bg-pink-400']
const HORA_MIN = 5   // 5 am
const HORA_MAX = 22  // 10 pm
const RANGO_MIN = (HORA_MAX - HORA_MIN) * 60

// Extrae la fecha local (YYYY-MM-DD) sin convertir a UTC
function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
  { id: 'cocinero',          label: 'Cocinero/a'         },
  { id: 'supervisor',        label: 'Supervisor/a'       },
  { id: 'servicio_cliente',  label: 'Servicio al cliente'},
]

function salarioHora(emp) {
  return (emp.salario_base ?? emp.salario_hora ?? 0) / 30 / 8
}

function calcPago(empleado, dias, turnoMap) {
  const hHora = salarioHora(empleado)
  let pago = 0, hrs_ot = 0, hrs_total = 0
  dias.forEach(d => {
    const h = turnoMap[`${empleado.id}-${d}`]?.horas ?? 0
    hrs_total += h
    const std = Math.min(h, HORAS_STD_DIA)
    const ot  = Math.max(h - HORAS_STD_DIA, 0)
    pago   += std * hHora + ot * hHora * 1.5
    hrs_ot += ot
  })
  return { hrs_total, hrs_ot, pago }
}

// ── Formulario empleado ────────────────────────────────────────
function EmpleadoForm({ inicial, onSubmit, onCancel, submitLabel = 'Guardar' }) {
  const [form, setForm] = useState({ nombre: '', salario_base: '', rol: 'cocinero', ...inicial })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hHora = form.salario_base ? Number(form.salario_base) / 30 / 8 : 0
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
const ALMUERZO_OPTS = [
  { value: 0,  label: 'Sin almuerzo' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hora' },
]

function TurnoForm({ fecha, empleadoNombre, inicial, onSave, onDelete, onCancel }) {
  const [form, setForm] = useState({
    hora_inicio:  inicial?.hora_inicio?.slice(0, 5) ?? '06:30',
    hora_fin:     inicial?.hora_fin?.slice(0, 5)    ?? '15:00',
    almuerzo_min: inicial?.almuerzo_min ?? 60,
  })

  const horasNetas = calcHorasNetas(form.hora_inicio, form.hora_fin, form.almuerzo_min)
  const esOT = horasNetas > HORAS_STD_DIA

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {empleadoNombre} · {new Date(fecha + 'T00:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'short' })}
      </p>
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
              }`}
            >{label}</button>
          ))}
        </div>
      </FormField>
      <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${esOT ? 'bg-orange-50 border border-orange-200' : 'bg-brand-50 border border-brand-100'}`}>
        <span className={`text-sm font-semibold ${esOT ? 'text-orange-700' : 'text-brand-700'}`}>
          {fmtTime(form.hora_inicio)} → {fmtTime(form.hora_fin)}
        </span>
        <div className="text-right">
          <span className={`font-bold text-base ${esOT ? 'text-orange-700' : 'text-brand-700'}`}>{horasNetas}h netas</span>
          {esOT && <p className="text-xs text-orange-500">{(horasNetas - HORAS_STD_DIA).toFixed(1)}h extra</p>}
        </div>
      </div>
      <div className="flex justify-between pt-1">
        <div>
          {inicial && <Button type="button" variant="secondary" onClick={onDelete}>Quitar turno</Button>}
        </div>
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
  const horas = turno?.horas ?? null
  const esOT  = horas != null && horas > HORAS_STD_DIA

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

  return (
    <button
      onClick={() => setEditando(true)}
      className={`w-full min-h-[52px] rounded-lg text-xs font-medium transition-colors flex flex-col items-center justify-center gap-0.5 ${
        turno
          ? (esOT ? 'bg-orange-50 text-orange-700 hover:bg-orange-100' : 'bg-brand-50 text-brand-700 hover:bg-brand-100')
          : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
      }`}
    >
      {turno ? (
        <>
          <span>{fmtTime(turno.hora_inicio)} - {fmtTime(turno.hora_fin)}</span>
          <span className="font-bold">{horas}h</span>
        </>
      ) : '—'}
    </button>
  )
}

// ── Vista visual de horario (Gantt) ────────────────────────────
function VistaHorario({ empleados, dias, turnoMap, onEditarTurno }) {
  const [diaIdx, setDiaIdx] = useState(0)
  const diaActual = dias[diaIdx]
  const horas = Array.from({ length: HORA_MAX - HORA_MIN + 1 }, (_, i) => HORA_MIN + i)

  // Cobertura: para cada hora, si hay cocinero y/o supervisor en turno
  const coberturaHoras = useMemo(() => {
    const result = {}
    for (let h = HORA_MIN; h < HORA_MAX; h++) {
      const midMin = h * 60 + 30 // punto medio del slot
      let cocinero = false, supervisor = false
      empleados.forEach(emp => {
        const turno = turnoMap[`${emp.id}-${diaActual}`]
        if (!turno?.hora_inicio) return
        const ini = timeToMinutes(turno.hora_inicio)
        const fin = timeToMinutes(turno.hora_fin)
        if (ini <= midMin && midMin < fin) {
          if (emp.rol === 'cocinero')    cocinero   = true
          if (emp.rol === 'supervisor')  supervisor = true
        }
      })
      result[h] = { cocinero, supervisor }
    }
    return result
  }, [empleados, turnoMap, diaActual])

  const hayTurnos = empleados.some(emp => turnoMap[`${emp.id}-${diaActual}`])

  return (
    <div>
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {dias.map((d, i) => {
          const [, mm, dd] = d.split('-')
          const tieneTurnos = empleados.some(emp => turnoMap[`${emp.id}-${d}`])
          const faltaRol = tieneTurnos && (() => {
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
        {/* Encabezado eje horas */}
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
          const turno = turnoMap[`${emp.id}-${diaActual}`] ?? null
          const inicioMin = turno ? timeToMinutes(turno.hora_inicio) : null
          const finMin    = turno ? timeToMinutes(turno.hora_fin)    : null
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
                {turno && <p className="text-xs text-gray-400">{turno.horas}h netas</p>}
              </div>
              <div className="flex-1 relative h-10">
                {horas.map(h => (
                  <div key={h} className="absolute top-0 h-full border-l border-gray-100"
                    style={{ left: `${((h - HORA_MIN) / (HORA_MAX - HORA_MIN)) * 100}%` }} />
                ))}
                {turno && left != null && width != null && (
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

        {/* Fila de cobertura */}
        {hayTurnos && (
          <div className="flex items-center border-t-2 border-gray-200 bg-gray-50" style={{ minHeight: 36 }}>
            <div className="w-36 shrink-0 px-4 py-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cobertura</p>
            </div>
            <div className="flex-1 relative h-9">
              {horas.map(h => {
                const cob = coberturaHoras[h] ?? {}
                const ok  = cob.cocinero && cob.supervisor
                const warn = !cob.cocinero || !cob.supervisor
                const empty = !cob.cocinero && !cob.supervisor
                return (
                  <div key={h}
                    className="absolute top-1 bottom-1 flex items-center justify-center"
                    style={{ left: `${((h - HORA_MIN) / (HORA_MAX - HORA_MIN)) * 100}%`, width: `${(1 / (HORA_MAX - HORA_MIN)) * 100}%` }}
                    title={empty ? 'Sin cobertura' : ok ? 'Cocinero + Supervisor' : `Falta: ${!cob.cocinero ? 'cocinero' : 'supervisor'}`}
                  >
                    <div className={`w-4/5 h-full rounded ${empty ? '' : ok ? 'bg-green-300' : 'bg-amber-300'}`} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Leyenda cobertura */}
      {hayTurnos && (
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-300 inline-block" />Cocinero + Supervisor</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-300 inline-block" />Falta un rol</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 inline-block" />Sin personal</span>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">Hacé clic en una fila para agregar o editar el turno. El punto rojo en la pestaña del día indica alguna hora sin cobertura de cocinero o supervisor.</p>
    </div>
  )
}

// ── Tab principal ──────────────────────────────────────────────
export function PlanillaTab() {
  const { empleados, loading: empLoading, crearEmpleado, actualizarEmpleado, desactivarEmpleado } = usePlanilla()
  const [semanaInicio, setSemanaInicio] = useState(getSemanaInicio)
  const semanaFin = desplazar(semanaInicio, 1)
  const dias = getDias(semanaInicio)

  const { turnos, guardarTurno } = useTurnos(
    semanaInicio,
    new Date(semanaFin + 'T00:00:00').toISOString().slice(0, 10)
  )

  const [vista, setVista] = useState('tabla')
  const [showNuevo, setShowNuevo] = useState(false)
  const [editando, setEditando] = useState(null)
  const [turnoModal, setTurnoModal] = useState(null)
  const [colilla, setColilla] = useState(null)
  const [toast, setToast] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

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
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-lg">
            {[['tabla', <LayoutGrid size={14} />, 'Tabla'], ['horario', <CalendarRange size={14} />, 'Horario visual']].map(([id, icon, label]) => (
              <button key={id} onClick={() => setVista(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${vista === id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {icon} {label}
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
        /* ── Vista tabla ── */
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[150px]">Empleado</th>
                {dias.map((d, i) => {
                  const [, mm, dd] = d.split('-')
                  return (
                    <th key={d} className="text-center px-1 py-3 font-semibold text-gray-500 min-w-[95px]">
                      <p>{DIAS_NOMBRES[i]}</p>
                      <p className="text-xs font-normal text-gray-400">{dd}/{mm}</p>
                    </th>
                  )
                })}
                <th className="text-center px-3 py-3 font-semibold text-gray-600 min-w-[60px]">Total h</th>
                <th className="text-center px-3 py-3 font-semibold text-orange-500 min-w-[50px]">HE</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 min-w-[110px]">Pago bruto</th>
                <th className="px-2 py-3 min-w-[80px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empleados.map(emp => {
                const { hrs_total, hrs_ot, pago } = calcPago(emp, dias, turnoMap)
                return (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{emp.nombre}</p>
                      <p className="text-xs text-gray-400">{ROLES.find(r => r.id === emp.rol)?.label ?? emp.rol} · {fmt(salarioHora(emp))}/h</p>
                    </td>
                    {dias.map(d => {
                      const turno = turnoMap[`${emp.id}-${d}`] ?? null
                      return (
                        <td key={d} className={`px-1 py-1 text-center ${turno?.horas > HORAS_STD_DIA ? 'bg-orange-50' : ''}`}>
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
        Hacé clic en una celda para registrar entrada/salida. El almuerzo se descuenta automáticamente. Las celdas naranja superan las 8h. HE = horas extra (1.5×).
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
