import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ClipboardList, Plus, Edit2, Trash2, X, CheckCircle, Circle } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n)
function fmtDate(str) {
  if (!str) return ''
  const [y,m,d] = str.split('-')
  return `${d}/${m}/${y}`
}

const EMPTY = {
  cliente: '', pedido: '', precio: '', pagado: false,
  contacto: '', fecha_entrega: '', notas: ''
}

export default function EncargosPage() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendientes')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('encargos')
      .select('*')
      .order('created_at', { ascending: false })
    setLista(data ?? [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const visible = lista.filter(e => {
    if (filtro === 'pendientes') return !e.pagado
    if (filtro === 'pagados') return e.pagado
    return true
  })

  const totalPendiente = lista.filter(e => !e.pagado).reduce((s,e) => s + (Number(e.precio) || 0), 0)

  function abrirNuevo() {
    setForm(EMPTY)
    setEditId(null)
    setModal(true)
  }

  function abrirEditar(enc) {
    setForm({
      cliente: enc.cliente,
      pedido: enc.pedido,
      precio: enc.precio != null ? String(enc.precio) : '',
      pagado: enc.pagado,
      contacto: enc.contacto ?? '',
      fecha_entrega: enc.fecha_entrega ?? '',
      notas: enc.notas ?? ''
    })
    setEditId(enc.id)
    setModal(true)
  }

  async function guardar() {
    if (!form.cliente.trim() || !form.pedido.trim()) return
    setSaving(true)
    const payload = {
      cliente: form.cliente.trim(),
      pedido: form.pedido.trim(),
      precio: form.precio !== '' ? Number(form.precio) : null,
      pagado: form.pagado,
      contacto: form.contacto.trim() || null,
      fecha_entrega: form.fecha_entrega || null,
      notas: form.notas.trim() || null,
    }
    if (editId) {
      await supabase.from('encargos').update(payload).eq('id', editId)
    } else {
      await supabase.from('encargos').insert(payload)
    }
    setSaving(false)
    setModal(false)
    cargar()
  }

  async function marcarPagado(id, valor) {
    await supabase.from('encargos').update({ pagado: valor }).eq('id', id)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este encargo?')) return
    await supabase.from('encargos').delete().eq('id', id)
    cargar()
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-brand-600" />
            <h1 className="text-xl font-bold text-gray-900">Encargos</h1>
          </div>
          {totalPendiente > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 ml-7">Pendiente de cobro: {fmt(totalPendiente)}</p>
          )}
        </div>
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus size={15} /> Nuevo
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[['pendientes','Pendientes'],['pagados','Pagados'],['todos','Todos']].map(([val,lbl]) => (
          <button key={val}
            onClick={() => setFiltro(val)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              filtro === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Cargando…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">
          {filtro === 'pendientes' ? 'No hay encargos pendientes.' : filtro === 'pagados' ? 'No hay encargos pagados.' : 'No hay encargos registrados.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map(enc => (
            <li key={enc.id} className={`bg-white border rounded-xl p-4 flex items-start justify-between gap-3 ${
              enc.pagado ? 'border-gray-100 opacity-70' : 'border-gray-200'
            }`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <button onClick={() => marcarPagado(enc.id, !enc.pagado)} className="shrink-0 mt-0.5">
                    {enc.pagado
                      ? <CheckCircle size={18} className="text-green-500" />
                      : <Circle size={18} className="text-gray-300 hover:text-green-400 transition-colors" />
                    }
                  </button>
                  <div className="min-w-0">
                    <p className={`font-medium text-gray-900 ${enc.pagado ? 'line-through text-gray-400' : ''}`}>{enc.cliente}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{enc.pedido}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {enc.precio != null && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">{fmt(enc.precio)}</span>
                      )}
                      {enc.contacto && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{enc.contacto}</span>
                      )}
                      {enc.fecha_entrega && (
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Entrega: {fmtDate(enc.fecha_entrega)}</span>
                      )}
                      {enc.pagado && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Pagado</span>
                      )}
                    </div>
                    {enc.notas && <p className="text-xs text-gray-400 mt-1">{enc.notas}</p>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => abrirEditar(enc)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => eliminar(enc.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{editId ? 'Editar encargo' : 'Nuevo encargo'}</h2>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cliente *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.cliente}
                  onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pedido *</label>
                <textarea rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  value={form.pedido}
                  onChange={e => setForm(f => ({ ...f, pedido: e.target.value }))}
                  placeholder="Descripción del pedido"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Precio (₡)</label>
                  <input type="number" min={0}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.precio}
                    onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contacto</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.contacto}
                    onChange={e => setForm(f => ({ ...f, contacto: e.target.value }))}
                    placeholder="Teléfono / WhatsApp"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de entrega</label>
                <input type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.fecha_entrega}
                  onChange={e => setForm(f => ({ ...f, fecha_entrega: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                <textarea rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded"
                  checked={form.pagado}
                  onChange={e => setForm(f => ({ ...f, pagado: e.target.checked }))}
                />
                Ya pagó
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} disabled={saving || !form.cliente.trim() || !form.pedido.trim()}
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
