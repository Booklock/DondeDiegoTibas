import { useState } from 'react'
import { useProductos, useMovimientos } from './hooks/useProductos'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { FormField, Input, Select } from '../../components/ui/FormField'
import { Table } from '../../components/ui/Table'
import { Package, AlertTriangle, Plus, Edit2, Trash2, ArrowDown, ArrowUp, History } from 'lucide-react'

const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CR') : '—'

// ── Formulario producto ───────────────────────────────────────
function ProductoForm({ inicial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({ nombre: '', unidad_medida: 'kg', stock_actual: '', stock_minimo: '', ...inicial })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  function set(f, v) { setForm(x => ({ ...x, [f]: v })); setErrors(e => ({ ...e, [f]: '' })) }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = {}
    if (!form.nombre.trim()) err.nombre = 'Requerido'
    if (!form.unidad_medida.trim()) err.unidad_medida = 'Requerido'
    setErrors(err)
    if (Object.keys(err).length) return
    setLoading(true)
    await onSubmit({ ...form, stock_actual: Number(form.stock_actual) || 0, stock_minimo: Number(form.stock_minimo) || 0 })
    setLoading(false)
  }

  const UNIDADES = ['kg', 'g', 'lb', 'litros', 'ml', 'unidades', 'cajas', 'bolsas', 'rollos']

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nombre del producto" error={errors.nombre}>
        <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Chicharrón, Manteca, etc." />
      </FormField>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Unidad de medida" error={errors.unidad_medida}>
          <Select value={form.unidad_medida} onChange={e => set('unidad_medida', e.target.value)}>
            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
          </Select>
        </FormField>
        <FormField label="Stock actual">
          <Input type="number" min="0" step="0.01" value={form.stock_actual} onChange={e => set('stock_actual', e.target.value)} placeholder="0" />
        </FormField>
        <FormField label="Stock mínimo (alerta)">
          <Input type="number" min="0" step="0.01" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} placeholder="0" />
        </FormField>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Guardar</Button>
      </div>
    </form>
  )
}

// ── Formulario movimiento ─────────────────────────────────────
function MovimientoForm({ productoId, unidad, onSubmit, onCancel }) {
  const [form, setForm] = useState({ tipo: 'entrada', cantidad: '', fecha: new Date().toISOString().slice(0, 10), proveedor: '', notas: '' })
  const [loading, setLoading] = useState(false)
  function set(f, v) { setForm(x => ({ ...x, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.cantidad || Number(form.cantidad) <= 0) return
    setLoading(true)
    await onSubmit({ ...form, producto_id: productoId, cantidad: Number(form.cantidad) })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Tipo de movimiento">
        <div className="flex gap-2">
          {[['entrada', 'Entrada (compra)'], ['salida', 'Salida (uso/merma)']].map(([val, label]) => (
            <button key={val} type="button" onClick={() => set('tipo', val)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                form.tipo === val
                  ? val === 'entrada' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label={`Cantidad (${unidad})`}>
          <Input type="number" min="0.001" step="0.01" required value={form.cantidad} onChange={e => set('cantidad', e.target.value)} placeholder="0" />
        </FormField>
        <FormField label="Fecha">
          <Input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
        </FormField>
      </div>
      {form.tipo === 'entrada' && (
        <FormField label="Proveedor (opcional)">
          <Input value={form.proveedor} onChange={e => set('proveedor', e.target.value)} placeholder="Nombre del proveedor" />
        </FormField>
      )}
      <FormField label="Notas (opcional)">
        <Input value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Observaciones..." />
      </FormField>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Registrar</Button>
      </div>
    </form>
  )
}

// ── Detalle producto ─────────────────────────────────────────
function ProductoDetalle({ producto, onClose }) {
  const { movimientos, loading, registrarMovimiento, refetch } = useMovimientos(producto.id)
  const [showMov, setShowMov] = useState(false)

  const cols = [
    { key: 'fecha', label: 'Fecha', render: r => fmtDate(r.fecha) },
    { key: 'tipo', label: 'Tipo', render: r => (
      <Badge color={r.tipo === 'entrada' ? 'green' : 'red'}>{r.tipo}</Badge>
    )},
    { key: 'cantidad', label: 'Cantidad', render: r => `${r.tipo === 'salida' ? '-' : '+'}${r.cantidad} ${producto.unidad_medida}` },
    { key: 'proveedor', label: 'Proveedor', render: r => r.proveedor || '—' },
    { key: 'notas', label: 'Notas', render: r => r.notas || '—' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
        <div>
          <p className="font-semibold text-gray-900 text-lg">{producto.nombre}</p>
          <p className="text-sm text-gray-500">{producto.unidad_medida}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">{producto.stock_actual}</p>
          <p className="text-xs text-gray-400">stock actual</p>
          {Number(producto.stock_actual) <= Number(producto.stock_minimo) && Number(producto.stock_minimo) > 0 && (
            <Badge color="red">Stock bajo</Badge>
          )}
        </div>
      </div>
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-gray-600">Últimos movimientos</p>
        <Button size="sm" onClick={() => setShowMov(true)}><Plus size={13} /> Registrar</Button>
      </div>
      <Table columns={cols} data={movimientos} emptyMessage="Sin movimientos registrados" />
      <Modal open={showMov} onClose={() => setShowMov(false)} title="Registrar movimiento">
        <MovimientoForm
          productoId={producto.id}
          unidad={producto.unidad_medida}
          onSubmit={async data => {
            const { error } = await registrarMovimiento(data)
            if (!error) { setShowMov(false); refetch() }
            return { error }
          }}
          onCancel={() => setShowMov(false)}
        />
      </Modal>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────
export default function InventarioPage() {
  const { productos, productosConAlerta, loading, crearProducto, actualizarProducto, eliminarProducto } = useProductos()
  const [showCreate, setShowCreate] = useState(false)
  const [editando, setEditando] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [toast, setToast] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const columns = [
    { key: 'nombre', label: 'Producto', render: r => (
      <div className="flex items-center gap-2">
        {Number(r.stock_actual) <= Number(r.stock_minimo) && Number(r.stock_minimo) > 0 && (
          <AlertTriangle size={14} className="text-red-400 shrink-0" />
        )}
        <span className="font-medium text-gray-900">{r.nombre}</span>
      </div>
    )},
    { key: 'unidad', label: 'Unidad', render: r => r.unidad_medida },
    { key: 'stock_actual', label: 'Stock actual', render: r => (
      <span className={`font-semibold ${Number(r.stock_actual) <= Number(r.stock_minimo) && Number(r.stock_minimo) > 0 ? 'text-red-600' : 'text-gray-800'}`}>
        {r.stock_actual} {r.unidad_medida}
      </span>
    )},
    { key: 'stock_minimo', label: 'Mínimo', render: r => `${r.stock_minimo} ${r.unidad_medida}` },
    { key: 'estado', label: 'Estado', render: r => (
      Number(r.stock_actual) <= Number(r.stock_minimo) && Number(r.stock_minimo) > 0
        ? <Badge color="red">Stock bajo</Badge>
        : <Badge color="green">OK</Badge>
    )},
    { key: 'acciones', label: '', render: r => (
      <div className="flex items-center gap-1">
        <button onClick={() => setDetalle(r)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Movimientos">
          <History size={14} className="text-gray-500" />
        </button>
        <button onClick={() => setEditando(r)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Editar">
          <Edit2 size={14} className="text-gray-500" />
        </button>
        <button onClick={async () => { if (confirm(`¿Eliminar ${r.nombre}?`)) { await eliminarProducto(r.id); showToast('Producto eliminado.') } }} className="p-1.5 hover:bg-red-50 rounded-lg">
          <Trash2 size={14} className="text-red-400" />
        </button>
      </div>
    )},
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Inventario"
        subtitle={`${productos.length} productos · ${productosConAlerta.length} con stock bajo`}
        action={<Button onClick={() => setShowCreate(true)}><Plus size={15} /> Nuevo producto</Button>}
      />

      {productosConAlerta.length > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span><strong>{productosConAlerta.length} producto(s)</strong> con stock igual o por debajo del mínimo: {productosConAlerta.map(p => p.nombre).join(', ')}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <Table columns={columns} data={productos} emptyMessage="No hay productos registrados." />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo producto">
        <ProductoForm onSubmit={async d => { const { error } = await crearProducto(d); if (!error) { setShowCreate(false); showToast('Producto creado.') } }} onCancel={() => setShowCreate(false)} />
      </Modal>

      {editando && (
        <Modal open onClose={() => setEditando(null)} title="Editar producto">
          <ProductoForm inicial={editando} onSubmit={async d => { await actualizarProducto(editando.id, d); setEditando(null); showToast('Actualizado.') }} onCancel={() => setEditando(null)} />
        </Modal>
      )}

      {detalle && (
        <Modal open onClose={() => setDetalle(null)} title={`Inventario — ${detalle.nombre}`} size="lg">
          <ProductoDetalle producto={detalle} onClose={() => setDetalle(null)} />
        </Modal>
      )}

      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>}
    </div>
  )
}
