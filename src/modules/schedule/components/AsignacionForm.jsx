import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { Button } from '../../../components/ui/Button'
import { FormField, Select, Input } from '../../../components/ui/FormField'

const TURNOS_ESTANDAR = [
  { key: 'diurno',        label: 'Diurno',        sub: '7:00 – 15:00', hora_inicio: '07:00', hora_fin: '15:00' },
  { key: 'nocturno',      label: 'Nocturno',       sub: '15:00 – 22:00', hora_inicio: '15:00', hora_fin: '22:00' },
  { key: 'personalizado', label: 'Personalizado',  sub: 'Definí el horario', hora_inicio: '', hora_fin: '' },
]

const DIAS_LABEL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES_LABEL = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function proximas2Semanas() {
  const dias = []
  const hoy = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(hoy)
    d.setDate(hoy.getDate() + i)
    dias.push(d.toISOString().slice(0, 10))
  }
  return dias
}

function fmtDia(iso) {
  const d = new Date(iso + 'T00:00:00')
  return `${DIAS_LABEL[d.getDay()]} ${d.getDate()} ${MESES_LABEL[d.getMonth()]}`
}

function toTimeDB(hhmm) {
  // "07:00" → "07:00:00"
  return hhmm.length === 5 ? hhmm + ':00' : hhmm
}

async function obtenerOCrearTurno(nombre, hora_inicio, hora_fin) {
  const hi = toTimeDB(hora_inicio)
  const hf = toTimeDB(hora_fin)
  const { data: existing } = await supabase
    .from('turnos').select('id').eq('nombre', nombre).eq('hora_inicio', hi).maybeSingle()
  if (existing) return { id: existing.id, error: null }
  const { data, error } = await supabase
    .from('turnos').insert({ nombre, hora_inicio: hi, hora_fin: hf }).select('id').single()
  return { id: data?.id, error }
}

export function AsignacionForm({ onDone, onCancel }) {
  const [empleados, setEmpleados] = useState([])
  const [form, setForm] = useState({ empleado_id: '', tipo: 'diurno', hora_inicio: '07:00', hora_fin: '15:00' })
  const [fechas, setFechas] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const diasDisponibles = proximas2Semanas()

  useEffect(() => {
    supabase.from('empleados')
      .select('id, perfil:perfiles(nombre, apellidos)')
      .eq('estado', 'activo')
      .then(({ data }) => setEmpleados(data ?? []))
  }, [])

  function setField(f, v) { setForm(x => ({ ...x, [f]: v })); setError('') }

  function seleccionarTipo(tipo) {
    const std = TURNOS_ESTANDAR.find(t => t.key === tipo)
    setForm(x => ({ ...x, tipo, hora_inicio: std.hora_inicio, hora_fin: std.hora_fin }))
    setError('')
  }

  function toggleFecha(f) {
    setFechas(prev => {
      const next = new Set(prev)
      next.has(f) ? next.delete(f) : next.add(f)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.empleado_id)  { setError('Seleccioná un empleado.'); return }
    if (fechas.size === 0)  { setError('Seleccioná al menos un día.'); return }
    if (!form.hora_inicio || !form.hora_fin) { setError('Completá el horario.'); return }
    if (form.hora_fin <= form.hora_inicio)   { setError('La hora de fin debe ser posterior al inicio.'); return }

    setLoading(true)

    const nombre = form.tipo === 'personalizado'
      ? `Turno ${form.hora_inicio}–${form.hora_fin}`
      : TURNOS_ESTANDAR.find(t => t.key === form.tipo).label

    const { id: turno_id, error: turnoError } = await obtenerOCrearTurno(nombre, form.hora_inicio, form.hora_fin)
    if (turnoError || !turno_id) { setError('Error al guardar el turno.'); setLoading(false); return }

    const rows = [...fechas].map(fecha => ({ empleado_id: form.empleado_id, turno_id, fecha }))
    const { error: asigError } = await supabase
      .from('asignaciones_turno')
      .upsert(rows, { onConflict: 'empleado_id,turno_id,fecha' })

    setLoading(false)
    if (asigError) { setError(asigError.message); return }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Empleado */}
      <FormField label="Empleado">
        <Select value={form.empleado_id} onChange={e => setField('empleado_id', e.target.value)}>
          <option value="">— Seleccionar —</option>
          {empleados.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.perfil?.nombre} {emp.perfil?.apellidos}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Tipo de turno */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Turno</p>
        <div className="grid grid-cols-3 gap-2">
          {TURNOS_ESTANDAR.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => seleccionarTipo(t.key)}
              className={`px-3 py-3 rounded-xl border text-left transition-colors ${
                form.tipo === t.key
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <p className="text-sm font-semibold">{t.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t.sub}</p>
            </button>
          ))}
        </div>

        {form.tipo === 'personalizado' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <FormField label="Hora inicio">
              <Input type="time" value={form.hora_inicio} onChange={e => setField('hora_inicio', e.target.value)} required />
            </FormField>
            <FormField label="Hora fin">
              <Input type="time" value={form.hora_fin} onChange={e => setField('hora_fin', e.target.value)} required />
            </FormField>
          </div>
        )}
      </div>

      {/* Días */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">
            Días <span className="text-gray-400 font-normal">(próximas 2 semanas)</span>
            {fechas.size > 0 && <span className="ml-2 text-brand-600 font-semibold">{fechas.size} seleccionados</span>}
          </p>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => setFechas(new Set(diasDisponibles))} className="text-brand-600 hover:underline">Todos</button>
            <span className="text-gray-300">·</span>
            <button type="button" onClick={() => setFechas(new Set())} className="text-gray-400 hover:underline">Ninguno</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
          {diasDisponibles.map(f => {
            const checked = fechas.has(f)
            return (
              <label
                key={f}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors select-none ${
                  checked ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFecha(f)}
                  className="accent-brand-600 w-4 h-4"
                />
                <span className={`text-sm ${checked ? 'text-brand-700 font-medium' : 'text-gray-600'}`}>
                  {fmtDia(f)}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>
          {fechas.size > 0 ? `Asignar ${fechas.size} día${fechas.size !== 1 ? 's' : ''}` : 'Asignar'}
        </Button>
      </div>
    </form>
  )
}
