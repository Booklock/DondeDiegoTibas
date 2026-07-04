import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { FormField, Input } from '../../components/ui/FormField'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)

// ── Hook ──────────────────────────────────────────────────────
function useListaPrecios() {
  const [precios, setPrecios] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    const { data } = await supabase
      .from('lista_precios')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true })
    setPrecios(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  async function crearPrecio(data) {
    const { error } = await supabase.from('lista_precios').insert(data)
    if (!error) fetch()
    return { error }
  }

  async function actualizarPrecio(id, data) {
    const { error } = await supabase.from('lista_precios').update(data).eq('id', id)
    if (!error) fetch()
    return { error }
  }

  async function eliminarPrecio(id) {
    await supabase.from('lista_precios').update({ activo: false }).eq('id', id)
    fetch()
  }

  return { precios, loading, crearPrecio, actualizarPrecio, eliminarPrecio }
}

// ── Formulario ────────────────────────────────────────────────
function PrecioForm({ inicial, onSubmit, onCancel, submitLabel = 'Guardar' }) {
  const [form, setForm] = useState({ nombre: '', precio_venta: '', ...inicial })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es requerido.'); return }
    if (!form.precio_venta || Number(form.precio_venta) < 0) { setError('Ingresá un precio válido.'); return }
    setLoading(true)
    const { error } = await onSubmit({
      nombre:       form.nombre.trim(),
      precio_venta: Number(form.precio_venta),
    })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nombre del producto">
        <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Chicharrón grande" />
      </FormField>
      <FormField label="Precio de venta (₡)">
        <Input type="number" min="0" step="1" value={form.precio_venta}
          onChange={e => setForm(f => ({ ...f, precio_venta: e.target.value }))}
          placeholder="0" />
      </FormField>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>{submitLabel}</Button>
      </div>
    </form>
  )
}

// ── Página principal ───────────────────────────────────────────
export default function PreciosPage() {
  const { esDueno } = useAuth()
  const { precios, loading, crearPrecio, actualizarPrecio, eliminarPrecio } = useListaPrecios()
  const [busqueda, setBusqueda] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [toast, setToast] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const preciosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return precios
    const q = busqueda.toLowerCase()
    return precios.filter(p => p.nombre.toLowerCase().includes(q))
  }, [precios, busqueda])

  async function handleCrear(data) {
    const { error } = await crearPrecio(data)
    if (error) return { error }
    setShowForm(false)
    showToast('Producto agregado.')
    return {}
  }

  async function handleEditar(data) {
    const { error } = await actualizarPrecio(editando.id, data)
    if (error) return { error }
    setEditando(null)
    showToast('Precio actualizado.')
    return {}
  }

  async function handleDelete(p) {
    if (!confirm(`¿Eliminar "${p.nombre}" de la lista?`)) return
    await eliminarPrecio(p.id)
    showToast('Producto eliminado.')
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Lista de precios"
        subtitle={`${precios.length} productos`}
        action={esDueno ? (
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Agregar producto
          </Button>
        ) : null}
      />

      {/* Buscador */}
      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : precios.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          No hay productos en la lista. {esDueno && 'Agregá uno para comenzar.'}
        </div>
      ) : preciosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          No se encontraron productos con "{busqueda}".
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-500">Producto</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-500">Precio de venta</th>
                {esDueno && <th className="px-4 py-3 w-20"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preciosFiltrados.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{p.nombre}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-brand-700 text-base">{fmt(p.precio_venta)}</td>
                  {esDueno && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setEditando(p)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
                          <Pencil size={13} className="text-gray-400" />
                        </button>
                        <button onClick={() => handleDelete(p)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 size={13} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {esDueno && (
        <>
          <Modal open={showForm} onClose={() => setShowForm(false)} title="Agregar producto">
            <PrecioForm onSubmit={handleCrear} onCancel={() => setShowForm(false)} submitLabel="Agregar" />
          </Modal>

          {editando && (
            <Modal open onClose={() => setEditando(null)} title={`Editar — ${editando.nombre}`}>
              <PrecioForm
                inicial={{ nombre: editando.nombre, precio_venta: editando.precio_venta }}
                onSubmit={handleEditar}
                onCancel={() => setEditando(null)}
                submitLabel="Guardar cambios"
              />
            </Modal>
          )}
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
