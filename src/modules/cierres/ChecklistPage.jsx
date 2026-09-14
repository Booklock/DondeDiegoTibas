import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { FormField, Input } from '../../components/ui/FormField'
import {
  ClipboardCheck, Settings, Plus, Edit2, Trash2,
  ChevronUp, ChevronDown, CheckCircle2, Circle,
  Package, AlertTriangle, Clock
} from 'lucide-react'

function localDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtDateShort(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Hacer Checklist ───────────────────────────────────────────────────────

function HacerTab() {
  const [plantillas, setPlantillas] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [items, setItems]           = useState([])
  const [estado, setEstado]         = useState({})
  const [historial, setHistorial]   = useState([])
  const [guardando, setGuardando]   = useState(false)
  const [refresh, setRefresh]       = useState(false)
  const [toast, setToast]           = useState('')

  useEffect(() => {
    supabase.from('checklist_plantillas').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setPlantillas(data ?? []))
  }, [])

  useEffect(() => {
    if (!selectedId) { setItems([]); setEstado({}); return }
    supabase.from('checklist_items').select('*')
      .eq('plantilla_id', selectedId).eq('activo', true).order('orden')
      .then(({ data }) => {
        const its = data ?? []
        setItems(its)
        const init = {}
        its.forEach(it => { init[it.id] = { checked: false, cantidad: '' } })
        setEstado(init)
      })
  }, [selectedId])

  useEffect(() => {
    supabase.from('checklist_ejecuciones')
      .select('id, fecha, plantilla_nombre, items_resultado')
      .order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => setHistorial(data ?? []))
  }, [refresh])

  const plantilla   = plantillas.find(p => p.id === selectedId)
  const checkedCount = items.filter(it => estado[it.id]?.checked).length
  const progress    = items.length > 0 ? (checkedCount / items.length) * 100 : 0

  function toggleItem(id) {
    setEstado(e => ({ ...e, [id]: { ...e[id], checked: !e[id]?.checked } }))
  }
  function setCantidad(id, val) {
    setEstado(e => ({ ...e, [id]: { ...e[id], cantidad: val } }))
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  async function handleGuardar() {
    if (!selectedId) return
    setGuardando(true)
    const items_resultado = items.map(it => ({
      item_id:         it.id,
      descripcion:     it.descripcion,
      tipo:            it.tipo,
      checked:         estado[it.id]?.checked ?? false,
      cantidad_actual: it.tipo === 'inventario' ? (estado[it.id]?.cantidad ?? '') : null,
      cantidad_minima: it.cantidad_minima,
      unidad:          it.unidad,
    }))
    await supabase.from('checklist_ejecuciones').insert({
      plantilla_id:     selectedId,
      plantilla_nombre: plantilla?.nombre ?? '',
      fecha:            localDateStr(),
      completado_en:    new Date().toISOString(),
      items_resultado,
    })
    setGuardando(false)
    setRefresh(r => !r)
    const init = {}
    items.forEach(it => { init[it.id] = { checked: false, cantidad: '' } })
    setEstado(init)
    showToast('Cierre guardado correctamente.')
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Seleccionar checklist</label>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option value="">— Elegí un checklist —</option>
          {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      {selectedId && items.length > 0 && (
        <>
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-gray-700">{checkedCount} / {items.length} completados</span>
              <span className="text-gray-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all duration-300 ${
                progress === 100 ? 'bg-green-500' : 'bg-brand-500'
              }`} style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="space-y-2">
            {items.map(it => {
              const s        = estado[it.id] ?? {}
              const qty      = parseFloat(s.cantidad)
              const min      = parseFloat(it.cantidad_minima)
              const bajo     = it.tipo === 'inventario' && s.checked && s.cantidad !== '' && !isNaN(qty) && !isNaN(min) && qty < min
              return (
                <div key={it.id} className={`rounded-xl border p-4 transition-colors ${
                  s.checked ? (bajo ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200') : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleItem(it.id)} className="mt-0.5 shrink-0">
                      {s.checked
                        ? <CheckCircle2 size={22} className={bajo ? 'text-red-500' : 'text-green-500'} />
                        : <Circle size={22} className="text-gray-300" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium text-sm ${
                          s.checked ? (bajo ? 'text-red-800' : 'text-green-800') : 'text-gray-800'
                        }`}>{it.descripcion}</span>
                        {it.tipo === 'inventario' && (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            <Package size={10} />
                            Mín: {it.cantidad_minima} {it.unidad}
                          </span>
                        )}
                      </div>
                      {it.tipo === 'inventario' && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500">Cantidad actual:</span>
                          <input
                            type="number" min="0" step="0.1"
                            value={s.cantidad ?? ''}
                            onChange={e => setCantidad(it.id, e.target.value)}
                            placeholder="0"
                            className={`w-24 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 ${
                              bajo ? 'border-red-300 focus:ring-red-300' : 'border-gray-200 focus:ring-brand-400'
                            }`}
                          />
                          <span className="text-xs text-gray-400">{it.unidad}</span>
                          {bajo && (
                            <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                              <AlertTriangle size={12} /> Bajo mínimo
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <Button onClick={handleGuardar} loading={guardando} className="w-full">
            <ClipboardCheck size={16} /> Guardar cierre
          </Button>
        </>
      )}

      {selectedId && items.length === 0 && (
        <p className="text-center text-gray-400 py-10 border border-dashed border-gray-200 rounded-xl text-sm">
          Este checklist no tiene ítems. Agregálos en la pestaña “Configurar”.
        </p>
      )}

      {historial.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock size={15} /> Historial reciente
          </h3>
          <div className="space-y-2">
            {historial.map(ej => {
              const res   = Array.isArray(ej.items_resultado) ? ej.items_resultado : []
              const ok    = res.filter(r => r.checked).length
              const total = res.length
              const bajos = res.filter(r =>
                r.tipo === 'inventario' && r.checked &&
                r.cantidad_actual !== '' && r.cantidad_actual != null &&
                parseFloat(r.cantidad_actual) < parseFloat(r.cantidad_minima)
              ).length
              return (
                <div key={ej.id} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm text-gray-800">{ej.plantilla_nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{fmtDateShort(ej.fecha)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {bajos > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={10} /> {bajos} bajo mín.
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      ok === total && total > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                    }`}>{ok}/{total}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Configurar ─────────────────────────────────────────────────────────────

function PlantillaForm({ inicial, onSubmit, onCancel }) {
  const [form, setForm]     = useState({ nombre: inicial?.nombre ?? '', descripcion: inicial?.descripcion ?? '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setLoading(true)
    await onSubmit({ nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null }, inicial?.id)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nombre">
        <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Cierre Dominical" />
      </FormField>
      <FormField label="Descripción (opcional)">
        <Input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Checklist para el cierre del domingo" />
      </FormField>
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Guardar</Button>
      </div>
    </form>
  )
}

function ItemForm({ inicial, onSubmit, onCancel }) {
  const [form, setForm]       = useState({
    tipo:            inicial?.tipo             ?? 'tarea',
    descripcion:     inicial?.descripcion      ?? '',
    cantidad_minima: inicial?.cantidad_minima  ?? '',
    unidad:          inicial?.unidad           ?? '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.descripcion.trim()) return
    setLoading(true)
    await onSubmit({
      tipo:            form.tipo,
      descripcion:     form.descripcion.trim(),
      cantidad_minima: form.tipo === 'inventario' ? (parseFloat(form.cantidad_minima) || null) : null,
      unidad:          form.tipo === 'inventario' ? (form.unidad.trim() || null) : null,
    }, inicial?.id)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">Tipo de ítem</p>
        <div className="flex gap-2">
          {[['tarea', 'Tarea ✓'], ['inventario', 'Inventario 📦']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setForm(f => ({ ...f, tipo: id }))}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                form.tipo === id ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300'
              }`}>{label}</button>
          ))}
        </div>
      </div>
      <FormField label="Descripción">
        <Input value={form.descripcion}
          onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
          placeholder={form.tipo === 'inventario' ? 'Ej: Revisar arroz' : 'Ej: Hacer pedido de carne'} />
      </FormField>
      {form.tipo === 'inventario' && (
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Cantidad mínima">
            <Input type="number" min="0" step="0.1" value={form.cantidad_minima}
              onChange={e => setForm(f => ({ ...f, cantidad_minima: e.target.value }))} placeholder="Ej: 5" />
          </FormField>
          <FormField label="Unidad">
            <Input value={form.unidad}
              onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))} placeholder="Ej: kg" />
          </FormField>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" loading={loading}>{inicial ? 'Guardar cambios' : 'Agregar'}</Button>
      </div>
    </form>
  )
}

function ItemsManager({ plantilla }) {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(null)

  async function loadItems() {
    const { data } = await supabase.from('checklist_items').select('*')
      .eq('plantilla_id', plantilla.id).eq('activo', true).order('orden')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [])

  async function handleSave(data, id) {
    const maxOrden = items.length > 0 ? Math.max(...items.map(i => i.orden)) : -1
    if (id) {
      await supabase.from('checklist_items').update(data).eq('id', id)
    } else {
      await supabase.from('checklist_items').insert({ ...data, plantilla_id: plantilla.id, orden: maxOrden + 1 })
    }
    loadItems()
    setEditando(null)
  }

  async function handleDelete(item) {
    if (!confirm(`¿Eliminar “${item.descripcion}”?`)) return
    await supabase.from('checklist_items').delete().eq('id', item.id)
    loadItems()
  }

  async function handleMover(idx, dir) {
    const list = [...items]
    const swap = idx + dir
    if (swap < 0 || swap >= list.length) return
    ;[list[idx], list[swap]] = [list[swap], list[idx]]
    setItems(list.map((it, i) => ({ ...it, orden: i })))
    await Promise.all(list.map((it, i) => supabase.from('checklist_items').update({ orden: i }).eq('id', it.id)))
  }

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditando('nuevo')}><Plus size={13} /> Agregar ítem</Button>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-gray-400 py-8 border border-dashed border-gray-200 rounded-xl text-sm">
          No hay ítems todavía.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={it.id} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl p-3">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => handleMover(idx, -1)} disabled={idx === 0}
                  className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30">
                  <ChevronUp size={13} />
                </button>
                <button onClick={() => handleMover(idx, 1)} disabled={idx === items.length - 1}
                  className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30">
                  <ChevronDown size={13} />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{it.descripcion}</p>
                {it.tipo === 'inventario' ? (
                  <p className="text-xs text-blue-600 mt-0.5">
                    <Package size={9} className="inline mr-1" />
                    Inventario · Mín: {it.cantidad_minima} {it.unidad}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">Tarea</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditando(it)} className="p-1.5 hover:bg-gray-200 rounded-lg">
                  <Edit2 size={13} className="text-gray-400" />
                </button>
                <button onClick={() => handleDelete(it)} className="p-1.5 hover:bg-red-50 rounded-lg">
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <div className="border-t border-gray-200 pt-4 mt-2">
          <p className="font-semibold text-sm text-gray-700 mb-3">
            {editando === 'nuevo' ? 'Nuevo ítem' : `Editar: ${editando.descripcion}`}
          </p>
          <ItemForm
            inicial={editando !== 'nuevo' ? editando : null}
            onSubmit={handleSave}
            onCancel={() => setEditando(null)}
          />
        </div>
      )}
    </div>
  )
}

function ConfigTab() {
  const [plantillas, setPlantillas] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalForm, setModalForm]   = useState(null)
  const [modalItems, setModalItems] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('checklist_plantillas')
      .select('*, checklist_items(id)')
      .order('nombre')
    setPlantillas(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(data, id) {
    if (id) {
      await supabase.from('checklist_plantillas').update(data).eq('id', id)
    } else {
      await supabase.from('checklist_plantillas').insert(data)
    }
    load()
    setModalForm(null)
  }

  async function handleDelete(p) {
    if (!confirm(`¿Eliminar “${p.nombre}”? Se eliminarán todos sus ítems.`)) return
    await supabase.from('checklist_plantillas').delete().eq('id', p.id)
    load()
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalForm('nueva')}><Plus size={14} /> Nueva plantilla</Button>
      </div>

      {plantillas.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          No hay plantillas. Creá una para empezar.
        </div>
      ) : (
        <div className="space-y-3">
          {plantillas.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{p.nombre}</p>
                {p.descripcion && <p className="text-sm text-gray-500 mt-0.5">{p.descripcion}</p>}
                <p className="text-xs text-gray-400 mt-1">{p.checklist_items?.length ?? 0} ítems</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" onClick={() => setModalItems(p)}>
                  <ClipboardCheck size={13} /> Ítems
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setModalForm(p)}>
                  <Edit2 size={13} />
                </Button>
                <button onClick={() => handleDelete(p)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modalForm} onClose={() => setModalForm(null)}
        title={modalForm === 'nueva' ? 'Nueva plantilla' : 'Editar plantilla'}>
        <PlantillaForm
          inicial={modalForm !== 'nueva' ? modalForm : null}
          onSubmit={handleSave}
          onCancel={() => setModalForm(null)}
        />
      </Modal>

      {modalItems && (
        <Modal open onClose={() => { setModalItems(null); load() }}
          title={`Ítems — ${modalItems.nombre}`} size="md">
          <ItemsManager plantilla={modalItems} />
        </Modal>
      )}
    </div>
  )
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function ChecklistPage() {
  const [tab, setTab] = useState('hacer')

  return (
    <div className="p-4 sm:p-6">
      <PageHeader title="Checklist de Cierres" subtitle="Verificaciones y tareas al cerrar" />

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {[
          ['hacer',  ClipboardCheck, 'Hacer Checklist'],
          ['config', Settings,       'Configurar'],
        ].map(([id, Icon, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 flex-1 justify-center px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {tab === 'hacer' ? <HacerTab /> : <ConfigTab />}
    </div>
  )
}
