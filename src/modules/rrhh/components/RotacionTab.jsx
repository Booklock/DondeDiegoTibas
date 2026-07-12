import { useState } from 'react'
import { useRotacion } from '../hooks/useRotacion'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function fmtTime(t) { return t ? t.slice(0, 5) : '' }

const TIPOS = [
  { id: 'apertura', label: 'Apertura', defaultInicio: '06:00', defaultFin: '10:00',
    bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-800'  },
  { id: 'soporte',  label: 'Soporte',  defaultInicio: '10:00', defaultFin: '16:00',
    bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-800'   },
  { id: 'cierre',   label: 'Cierre',   defaultInicio: '16:00', defaultFin: '22:00',
    bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-800' },
]

function getWeekendsInMonth(year, month) {
  const days = []
  const lastDay = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month, d)
    const dow = date.getDay()
    if (dow === 6 || dow === 0) days.push({ dow, str: localDateStr(date) })
  }
  const pairs = []
  let i = 0
  while (i < days.length) {
    if (days[i].dow === 6) {
      const hasSun = i + 1 < days.length && days[i + 1].dow === 0
      pairs.push({ sabado: days[i].str, domingo: hasSun ? days[i + 1].str : null })
      i += hasSun ? 2 : 1
    } else {
      pairs.push({ sabado: null, domingo: days[i].str })
      i++
    }
  }
  return pairs
}

// ── Formulario de asignación ──────────────────────────────────
function AsignarForm({ fecha, tipo, duenos, onSubmit, onCancel }) {
  const meta = TIPOS.find(t => t.id === tipo)
  const [form, setForm] = useState({
    perfil_id: duenos[0]?.id ?? '',
    hora_inicio: meta?.defaultInicio ?? '06:00',
    hora_fin:    meta?.defaultFin   ?? '22:00',
    notas: '',
  })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
  const date = new Date(fecha + 'T00:00:00')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.perfil_id) { setErrorMsg('Seleccioná un dueño.'); return }
    setErrorMsg('')
    setSaving(true)
    try {
      const { error } = await onSubmit({
        fecha,
        tipo,
        perfil_id:   form.perfil_id,
        hora_inicio: form.hora_inicio || null,
        hora_fin:    form.hora_fin    || null,
        notas:       form.notas       || null,
      })
      if (error) setErrorMsg(error.message ?? 'No se pudo guardar.')
    } catch {
      setErrorMsg('Error inesperado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={`rounded-xl px-4 py-3 text-sm ${meta?.bg ?? 'bg-gray-50'} border ${meta?.border ?? 'border-gray-200'}`}>
        <p className={`font-semibold capitalize ${meta?.text ?? 'text-gray-700'}`}>{meta?.label}</p>
        <p className="text-xs text-gray-500 mt-0.5 capitalize">
          {date.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dueño *</label>
        <select value={form.perfil_id} onChange={set('perfil_id')} required className={inputCls}>
          <option value="">Seleccioná...</option>
          {duenos.map(d => (
            <option key={d.id} value={d.id}>{d.nombre} {d.apellidos}</option>
          ))}
        </select>
        {duenos.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">No hay perfiles con rol dueño registrados.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
          <input type="time" value={form.hora_inicio} onChange={set('hora_inicio')} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin</label>
          <input type="time" value={form.hora_fin} onChange={set('hora_fin')} className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <input value={form.notas} onChange={set('notas')} className={inputCls} placeholder="Opcional..." />
      </div>

      {errorMsg && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{errorMsg}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={saving} className="flex-1">Asignar</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  )
}

// ── Fila de slot dentro de un día ─────────────────────────────
function SlotRow({ tipo, fecha, asignados, onAsignar, onEliminar }) {
  const meta = TIPOS.find(t => t.id === tipo)
  return (
    <div className={`rounded-xl border ${meta.border} ${meta.bg} p-2.5`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-bold uppercase tracking-wide ${meta.text}`}>{meta.label}</span>
        <button
          onClick={() => onAsignar(fecha, tipo)}
          className={`p-0.5 rounded-md hover:bg-white/70 transition-colors ${meta.text}`}
          title="Agregar persona"
        >
          <Plus size={13} />
        </button>
      </div>

      {asignados.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Sin asignar</p>
      ) : (
        <div className="space-y-1">
          {asignados.map(a => (
            <div key={a.id} className={`flex items-center justify-between gap-1 px-2 py-1 rounded-lg ${meta.badge} text-xs`}>
              <div className="min-w-0 flex items-baseline gap-1 flex-wrap">
                <span className="font-semibold">{a.perfil?.nombre}</span>
                {(a.hora_inicio || a.hora_fin) && (
                  <span className="opacity-70 whitespace-nowrap">
                    {fmtTime(a.hora_inicio)}{a.hora_fin ? `–${fmtTime(a.hora_fin)}` : ''}
                  </span>
                )}
                {a.notas && <span className="opacity-60 truncate">· {a.notas}</span>}
              </div>
              <button
                onClick={() => onEliminar(a.id)}
                className="shrink-0 opacity-40 hover:opacity-100 transition-opacity ml-1"
                title="Quitar"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Columna de un día ─────────────────────────────────────────
function DiaCol({ fecha, byFechaTipo, onAsignar, onEliminar, bordered }) {
  const date = new Date(fecha + 'T00:00:00')
  const isDom = date.getDay() === 0
  const esHoy = fecha === localDateStr(new Date())

  return (
    <div className={bordered ? 'border-t sm:border-t-0 sm:border-l border-gray-200' : ''}>
      <div className={`px-4 py-3 border-b border-gray-100 ${esHoy ? 'bg-brand-50' : isDom ? 'bg-blue-50' : 'bg-amber-50'}`}>
        <p className={`font-bold text-sm capitalize ${esHoy ? 'text-brand-700' : isDom ? 'text-blue-800' : 'text-amber-800'}`}>
          {date.toLocaleDateString('es-CR', { weekday: 'long' })}
          {esHoy && <span className="ml-1.5 text-xs font-semibold opacity-70">· Hoy</span>}
        </p>
        <p className={`text-xs mt-0.5 ${esHoy ? 'text-brand-500' : isDom ? 'text-blue-500' : 'text-amber-600'}`}>
          {date.toLocaleDateString('es-CR', { day: 'numeric', month: 'long' })}
        </p>
      </div>
      <div className="p-3 space-y-2">
        {TIPOS.map(t => (
          <SlotRow
            key={t.id}
            tipo={t.id}
            fecha={fecha}
            asignados={byFechaTipo[`${fecha}-${t.id}`] ?? []}
            onAsignar={onAsignar}
            onEliminar={onEliminar}
          />
        ))}
      </div>
    </div>
  )
}

// ── Tab principal ─────────────────────────────────────────────
export function RotacionTab() {
  const today = new Date()
  const [monthOffset, setMonthOffset] = useState(0)
  const [showModal, setShowModal]   = useState(false)
  const [modalCtx, setModalCtx]     = useState({ fecha: '', tipo: 'apertura' })

  const viewDate  = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const viewYear  = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth()
  const lastDay   = new Date(viewYear, viewMonth + 1, 0).getDate()
  const desde     = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`
  const hasta     = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${lastDay}`

  const { asignaciones, duenos, loading, asignar, eliminar } = useRotacion(desde, hasta)

  const weekends = getWeekendsInMonth(viewYear, viewMonth)

  const byFechaTipo = {}
  asignaciones.forEach(a => {
    const key = `${a.fecha}-${a.tipo}`
    if (!byFechaTipo[key]) byFechaTipo[key] = []
    byFechaTipo[key].push(a)
  })

  function openModal(fecha, tipo) { setModalCtx({ fecha, tipo }); setShowModal(true) }

  async function handleAsignar(data) {
    const { error } = await asignar(data)
    if (!error) setShowModal(false)
    return { error }
  }

  const mesLabel = viewDate.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' })

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setMonthOffset(o => o - 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-semibold text-gray-800 capitalize">{mesLabel}</h3>
        <button onClick={() => setMonthOffset(o => o + 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : weekends.length === 0 ? (
        <p className="text-center text-gray-400 py-12">Sin fines de semana en este mes.</p>
      ) : (
        <div className="space-y-4">
          {weekends.map(({ sabado, domingo }, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {sabado
                  ? <DiaCol fecha={sabado} byFechaTipo={byFechaTipo} onAsignar={openModal} onEliminar={eliminar} bordered={false} />
                  : <div className="bg-gray-50 flex items-center justify-center p-10 text-gray-300 text-sm">—</div>
                }
                {domingo
                  ? <DiaCol fecha={domingo} byFechaTipo={byFechaTipo} onAsignar={openModal} onEliminar={eliminar} bordered={true} />
                  : <div className="bg-gray-50 flex items-center justify-center p-10 text-gray-300 text-sm sm:border-l border-gray-200">—</div>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Asignar dueño al turno" size="md">
        {showModal && (
          <AsignarForm
            fecha={modalCtx.fecha}
            tipo={modalCtx.tipo}
            duenos={duenos}
            onSubmit={handleAsignar}
            onCancel={() => setShowModal(false)}
          />
        )}
      </Modal>
    </>
  )
}
