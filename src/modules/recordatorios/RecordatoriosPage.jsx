import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Bell, Plus, Edit2, Trash2, X, Check } from 'lucide-react'

const DIAS_SEMANA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmtDate(str) {
  if (!str) return ''
  const [y,m,d] = str.split('-')
  return `${d}/${m}/${y}`
}

function fmtRecurrencia(r) {
  switch (r.tipo_recurrencia) {
    case 'mensual': return `Día ${r.dia_mes} de cada mes`
    case 'semanal': return `Cada ${DIAS_SEMANA[r.dia_semana] ?? ''}`
    case 'anual':   return `${r.dia_mes} de ${MESES[(r.mes ?? 1) - 1]} cada año`
    case 'fecha':   return `El ${fmtDate(r.fecha_especifica)}`
    default: return ''
  }
}

function esDueHoy(r) {
  const hoy = new Date()
  const dia = hoy.getDate()
  const mes = hoy.getMonth() + 1
  const diaSemana = hoy.getDay()
  const hoyStr = hoy.toISOString().slice(0, 10)
  switch (r.tipo_recurrencia) {
    case 'mensual': return dia === r.dia_mes
    case 'semanal': return diaSemana === r.dia_semana
    case 'anual':   return dia === r.dia_mes && mes === r.mes
    case 'fecha':   return r.fecha_especifica === hoyStr
    default: return false
  }
}

const EMPTY = {
  titulo: '', descripcion: '', responsable: '',
  tipo_recurrencia: 'mensual', dia_mes: 1, dia_semana: 1, mes: 1, fecha_especifica: ''
}

export default function RecordatoriosPage() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('recordatorios')
      .select('*')
      .eq('activo', true)
      .order('created_at')
    setLista(data ?? [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  function abrirNuevo() {
    setForm(EMPTY)
    setEditId(null)
    setModal(true)
  }

  function abrirEditar(r) {
    setForm({
      titulo: r.titulo,
      descripcion: r.descripcion ?? '',
      responsable: r.responsable ?? '',
      tipo_recurrencia: r.tipo_recurrencia,
      dia_mes: r.dia_mes ?? 1,
      dia_semana: r.dia_semana ?? 1,
      mes: r.mes ?? 1,
      fecha_especifica: r.fecha_especifica ?? ''
    })
    setEditId(r.id)
    setModal(true)
  }

  async function guardar() {
    if (!form.titulo.trim()) return
    setSaving(true)
    const payload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      responsable: form.responsable.trim() || null,
      tipo_recurrencia: form.tipo_recurrencia,
      dia_mes: ['mensual','anual'].includes(form.tipo_recurrencia) ? Number(form.dia_mes) : null,
      dia_semana: form.tipo_recurrencia === 'semanal' ? Number(form.dia_semana) : null,
      mes: form.tipo_recurrencia === 'anual' ? Number(form.mes) : null,
      fecha_especifica: form.tipo_recurrencia === 'fecha' ? form.fecha_especifica || null : null,
    }
    if (editId) {
      await supabase.from('recordatorios').update(payload).eq('id', editId)
    } else {
      await supabase.from('recordatorios').insert(payload)
    }
    setSaving(false)
    setModal(false)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este recordatorio?')) return
    await supabase.from('recordatorios').update({ activo: false }).eq('id', id)
    cargar()
  }

  const hoy = lista.filter(esDueHoy)

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-amber-600" />
          <h1 className="text-xl font-bold text-gray-900">Recordatorios</h1>
        </div>
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus size={15} /> Nuevo
        </button>
      </div>

      {hoy.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">Para hoy:</p>
          <ul className="space-y-1">
            {hoy.map(r => (
              <li key={r.id} className="flex items-start gap-2 text-sm text-amber-900">
                <Check size={14} className="mt-0.5 shrink-0 text-amber-600" />
                <span><strong>{r.titulo}</strong>{r.responsable ? ` — ${r.responsable}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No hay recordatorios. Creá uno con el botón de arriba.</p>
      ) : (
        <ul className="space-y-2">
          {lista.map(r => (
            <li key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{r.titulo}</p>
                {r.descripcion && <p className="text-sm text-gray-500 mt-0.5">{r.descripcion}</p>}
                <div className="flex flex-wrap gap-2 mt-1.5">
                  <span className="inline-flex items-center text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {fmtRecurrencia(r)}
                  </span>
                  {r.responsable && (
                    <span className="inline-flex items-center text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {r.responsable}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => abrirEditar(r)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => eliminar(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{editId ? 'Editar recordatorio' : 'Nuevo recordatorio'}</h2>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej: Enviar estado de cuenta"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Responsable</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.responsable}
                  onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))}
                  placeholder="Ej: Natalia"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Recurrencia</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.tipo_recurrencia}
                  onChange={e => setForm(f => ({ ...f, tipo_recurrencia: e.target.value }))}
                >
                  <option value="mensual">Mensual</option>
                  <option value="semanal">Semanal</option>
                  <option value="anual">Anual</option>
                  <option value="fecha">Fecha específica</option>
                </select>
              </div>

              {form.tipo_recurrencia === 'mensual' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Día del mes</label>
                  <input type="number" min={1} max={31}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.dia_mes}
                    onChange={e => setForm(f => ({ ...f, dia_mes: e.target.value }))}
                  />
                </div>
              )}
              {form.tipo_recurrencia === 'semanal' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Día de la semana</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.dia_semana}
                    onChange={e => setForm(f => ({ ...f, dia_semana: Number(e.target.value) }))}
                  >
                    {DIAS_SEMANA.map((d,i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              )}
              {form.tipo_recurrencia === 'anual' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Día</label>
                    <input type="number" min={1} max={31}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={form.dia_mes}
                      onChange={e => setForm(f => ({ ...f, dia_mes: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mes</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={form.mes}
                      onChange={e => setForm(f => ({ ...f, mes: Number(e.target.value) }))}
                    >
                      {MESES.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {form.tipo_recurrencia === 'fecha' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                  <input type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.fecha_especifica}
                    onChange={e => setForm(f => ({ ...f, fecha_especifica: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} disabled={saving || !form.titulo.trim()}
                className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
