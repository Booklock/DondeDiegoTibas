import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useProductos, useMovimientos, useVentasProducto } from './hooks/useProductos'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import { FormField, Input, Select } from '../../components/ui/FormField'
import {
  Package, AlertTriangle, Plus, Edit2, Trash2, History,
  BarChart2, Link2, TrendingUp
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const fmt  = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)
const fmtN = n => Number(n ?? 0).toLocaleString('es-CR', { maximumFractionDigits: 2 })
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CR') : '—'

const UNIDADES = ['kg', 'g', 'lb', 'litros', 'ml', 'unidades', 'cajas', 'bolsas', 'rollos']

// ── Formulario producto ───────────────────────────────────────
function ProductoForm({ inicial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    nombre: '', unidad_medida: 'kg',
    stock_actual: '', stock_minimo: '',
    precio_costo: '', precio_venta: '',
    ...inicial
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  function set(f, v) { setForm(x => ({ ...x, [f]: v })); setErrors(e => ({ ...e, [f]: '' })) }

  const margen = form.precio_venta && form.precio_costo
    ? (((Number(form.precio_venta) - Number(form.precio_costo)) / Number(form.precio_venta)) * 100).toFixed(1)
    : null

  async function handleSubmit(e) {
    e.preventDefault()
    const err = {}
    if (!form.nombre.trim()) err.nombre = 'Requerido'
    if (!form.unidad_medida) err.unidad_medida = 'Requerido'
    setErrors(err)
    if (Object.keys(err).length) return
    setLoading(true)
    await onSubmit({
      nombre: form.nombre,
      unidad_medida: form.unidad_medida,
      stock_actual: Number(form.stock_actual) || 0,
      stock_minimo: Number(form.stock_minimo) || 0,
      precio_costo: Number(form.precio_costo) || 0,
      precio_venta: Number(form.precio_venta) || 0,
    })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Nombre del producto" error={errors.nombre}>
          <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Chicharrón, Manteca..." />
        </FormField>
        <FormField label="Unidad de medida">
          <Select value={form.unidad_medida} onChange={e => set('unidad_medida', e.target.value)}>
            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Stock actual">
          <Input type="number" min="0" step="0.01" value={form.stock_actual} onChange={e => set('stock_actual', e.target.value)} placeholder="0" />
        </FormField>
        <FormField label="Stock mínimo (alerta)">
          <Input type="number" min="0" step="0.01" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} placeholder="0" />
        </FormField>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Precios</p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Precio de costo (₡ / unidad)">
            <Input type="number" min="0" step="1" value={form.precio_costo} onChange={e => set('precio_costo', e.target.value)} placeholder="0" />
          </FormField>
          <FormField label="Precio de venta (₡ / unidad)">
            <Input type="number" min="0" step="1" value={form.precio_venta} onChange={e => set('precio_venta', e.target.value)} placeholder="0" />
          </FormField>
        </div>
        {margen !== null && (
          <p className={`text-sm font-medium mt-2 ${Number(margen) > 0 ? 'text-green-600' : 'text-red-600'}`}>
            Margen: {margen}% — Ganancia por unidad: {fmt(Number(form.precio_venta) - Number(form.precio_costo))}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Guardar</Button>
      </div>
    </form>
  )
}

// ── Formulario movimiento ─────────────────────────────────────
function MovimientoForm({ producto, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    tipo: 'entrada',
    es_venta: false,
    cantidad: '',
    precio_unitario: String(producto.precio_venta ?? ''),
    fecha: new Date().toISOString().slice(0, 10),
    proveedor: '',
    notas: '',
  })
  const [loading, setLoading] = useState(false)
  function set(f, v) { setForm(x => ({ ...x, [f]: v })) }

  const totalLinea = form.cantidad && form.precio_unitario
    ? Number(form.cantidad) * Number(form.precio_unitario)
    : null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.cantidad || Number(form.cantidad) <= 0) return
    setLoading(true)
    await onSubmit({
      producto_id: producto.id,
      tipo: form.tipo,
      es_venta: form.tipo === 'salida' ? form.es_venta : false,
      cantidad: Number(form.cantidad),
      precio_unitario: form.precio_unitario ? Number(form.precio_unitario) : null,
      fecha: form.fecha,
      proveedor: form.proveedor || null,
      notas: form.notas || null,
    })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Tipo">
        <div className="flex gap-2">
          {[['entrada', 'Entrada (compra)'], ['salida', 'Salida']].map(([val, label]) => (
            <button key={val} type="button" onClick={() => {
              set('tipo', val)
              if (val === 'entrada') set('precio_unitario', String(producto.precio_costo ?? ''))
              else { set('precio_unitario', String(producto.precio_venta ?? '')); set('es_venta', true) }
            }}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                form.tipo === val
                  ? val === 'entrada' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-orange-50 border-orange-300 text-orange-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}>{label}</button>
          ))}
        </div>
      </FormField>

      {form.tipo === 'salida' && (
        <FormField label="¿Qué tipo de salida?">
          <div className="flex gap-2">
            {[[true, 'Venta'], [false, 'Merma / Uso interno']].map(([val, label]) => (
              <button key={String(val)} type="button" onClick={() => set('es_venta', val)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  form.es_venta === val
                    ? 'bg-brand-50 border-brand-300 text-brand-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}>{label}</button>
            ))}
          </div>
        </FormField>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label={`Cantidad (${producto.unidad_medida})`}>
          <Input type="number" min="0.001" step="0.01" required value={form.cantidad} onChange={e => set('cantidad', e.target.value)} placeholder="0" />
        </FormField>
        <FormField label={form.tipo === 'entrada' ? 'Precio costo (₡)' : form.es_venta ? 'Precio venta (₡)' : 'Precio unitario (₡)'}>
          <Input type="number" min="0" step="1" value={form.precio_unitario} onChange={e => set('precio_unitario', e.target.value)} placeholder="0" />
        </FormField>
      </div>

      {totalLinea !== null && (
        <p className={`text-sm font-semibold ${form.tipo === 'entrada' ? 'text-red-600' : form.es_venta ? 'text-green-600' : 'text-gray-500'}`}>
          Total: {fmt(totalLinea)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Fecha">
          <Input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
        </FormField>
        {form.tipo === 'entrada' && (
          <FormField label="Proveedor">
            <Input value={form.proveedor} onChange={e => set('proveedor', e.target.value)} placeholder="Nombre del proveedor" />
          </FormField>
        )}
      </div>

      <FormField label="Notas">
        <Input value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Opcional..." />
      </FormField>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Registrar</Button>
      </div>
    </form>
  )
}

// ── Vincular proveedor ────────────────────────────────────────
function ProveedorVinculoForm({ productoId, onSubmit, onCancel }) {
  const [proveedores, setProveedores] = useState([])
  const [form, setForm] = useState({ proveedor_id: '', precio_costo: '', es_principal: false })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre')
      .then(({ data }) => setProveedores(data ?? []))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.proveedor_id) return
    setLoading(true)
    await onSubmit(productoId, form.proveedor_id, form.precio_costo ? Number(form.precio_costo) : null, form.es_principal)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Proveedor">
        <Select value={form.proveedor_id} onChange={e => setForm(f => ({ ...f, proveedor_id: e.target.value }))}>
          <option value="">— Seleccionar —</option>
          {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </Select>
      </FormField>
      <FormField label="Precio de costo según este proveedor (₡)">
        <Input type="number" min="0" step="1" value={form.precio_costo} onChange={e => setForm(f => ({ ...f, precio_costo: e.target.value }))} placeholder="Opcional" />
      </FormField>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={form.es_principal} onChange={e => setForm(f => ({ ...f, es_principal: e.target.checked }))} className="rounded" />
        Proveedor principal de este producto
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Vincular</Button>
      </div>
    </form>
  )
}

// ── Detalle de producto ───────────────────────────────────────
function ProductoDetalle({ producto, onVincular, onDesvincular, refetchProductos }) {
  const { movimientos, loading, registrarMovimiento, refetch } = useMovimientos(producto.id)
  const [showMov, setShowMov] = useState(false)
  const [showVinculo, setShowVinculo] = useState(false)

  const entradas = movimientos.filter(m => m.tipo === 'entrada')
  const ventas   = movimientos.filter(m => m.tipo === 'salida' && m.es_venta)
  const mermas   = movimientos.filter(m => m.tipo === 'salida' && !m.es_venta)

  const totalVentas = ventas.reduce((s, m) => s + Number(m.cantidad) * Number(m.precio_unitario ?? producto.precio_venta ?? 0), 0)
  const totalCosto  = entradas.reduce((s, m) => s + Number(m.cantidad) * Number(m.precio_unitario ?? producto.precio_costo ?? 0), 0)

  const movCols = [
    { key: 'fecha', label: 'Fecha', render: r => fmtDate(r.fecha) },
    { key: 'tipo', label: 'Tipo', render: r => (
      r.tipo === 'entrada'
        ? <Badge color="green">Entrada</Badge>
        : r.es_venta ? <Badge color="blue">Venta</Badge> : <Badge color="yellow">Merma</Badge>
    )},
    { key: 'cantidad', label: 'Cantidad', render: r => `${r.tipo === 'salida' ? '-' : '+'}${fmtN(r.cantidad)} ${producto.unidad_medida}` },
    { key: 'precio', label: 'Precio unit.', render: r => r.precio_unitario ? fmt(r.precio_unitario) : '—' },
    { key: 'total', label: 'Total', render: r => r.precio_unitario ? fmt(Number(r.cantidad) * Number(r.precio_unitario)) : '—' },
    { key: 'proveedor', label: 'Proveedor', render: r => r.proveedor || '—' },
  ]

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{fmtN(producto.stock_actual)}</p>
          <p className="text-xs text-gray-400">{producto.unidad_medida} en stock</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-green-700">{fmt(producto.precio_venta)}</p>
          <p className="text-xs text-gray-400">Precio venta</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-red-700">{fmt(producto.precio_costo)}</p>
          <p className="text-xs text-gray-400">Precio costo</p>
        </div>
        <div className="bg-brand-50 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-brand-700">
            {producto.precio_venta > 0 ? `${(((producto.precio_venta - producto.precio_costo) / producto.precio_venta) * 100).toFixed(1)}%` : '—'}
          </p>
          <p className="text-xs text-gray-400">Margen</p>
        </div>
      </div>

      {/* Proveedores vinculados */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Proveedores</p>
          <Button size="sm" variant="ghost" onClick={() => setShowVinculo(true)}><Link2 size={13} /> Vincular</Button>
        </div>
        {producto.proveedores?.length === 0 ? (
          <p className="text-sm text-gray-400">Sin proveedores vinculados.</p>
        ) : (
          <div className="space-y-1.5">
            {producto.proveedores?.map(pp => (
              <div key={pp.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{pp.proveedor?.nombre}</span>
                  {pp.es_principal && <Badge color="orange">Principal</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  {pp.precio_costo && <span className="text-sm text-gray-500">{fmt(pp.precio_costo)}</span>}
                  <button onClick={() => onDesvincular(pp.id)} className="p-1 hover:bg-red-50 rounded-lg">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumen */}
      {(ventas.length > 0 || entradas.length > 0) && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-blue-700">{fmt(totalVentas)}</p>
            <p className="text-xs text-gray-400">{ventas.length} ventas</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-red-700">{fmt(totalCosto)}</p>
            <p className="text-xs text-gray-400">{entradas.length} compras</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-green-700">{fmt(totalVentas - totalCosto)}</p>
            <p className="text-xs text-gray-400">Ganancia estimada</p>
          </div>
        </div>
      )}

      {/* Movimientos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Movimientos</p>
          <Button size="sm" onClick={() => setShowMov(true)}><Plus size={13} /> Registrar</Button>
        </div>
        <Table columns={movCols} data={loading ? [] : movimientos} emptyMessage="Sin movimientos." />
      </div>

      <Modal open={showMov} onClose={() => setShowMov(false)} title="Registrar movimiento">
        <MovimientoForm
          producto={producto}
          onSubmit={async data => {
            const { error } = await registrarMovimiento(data)
            if (!error) { setShowMov(false); refetch(); refetchProductos() }
            return { error }
          }}
          onCancel={() => setShowMov(false)}
        />
      </Modal>

      <Modal open={showVinculo} onClose={() => setShowVinculo(false)} title="Vincular proveedor">
        <ProveedorVinculoForm
          productoId={producto.id}
          onSubmit={async (...args) => { await onVincular(...args); setShowVinculo(false) }}
          onCancel={() => setShowVinculo(false)}
        />
      </Modal>
    </div>
  )
}

// ── Tab: Ventas por producto ──────────────────────────────────
function VentasProducto() {
  const [periodo, setPeriodo] = useState('mes')
  const hoy = new Date()

  const { desde, hasta } = useMemo(() => {
    const hasta = hoy.toISOString().slice(0, 10)
    let desde
    if (periodo === 'semana') { const d = new Date(hoy); d.setDate(d.getDate() - 6); desde = d.toISOString().slice(0, 10) }
    else if (periodo === 'mes') desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10)
    else desde = new Date(hoy.getFullYear(), 0, 1).toISOString().slice(0, 10)
    return { desde, hasta }
  }, [periodo])

  const { resumen, loading } = useVentasProducto({ desde, hasta })

  const chartData = resumen.slice(0, 8).map(r => ({
    nombre: r.producto?.nombre ?? '',
    Ingresos: r.ingresos,
    Ganancia: r.ganancia,
  }))

  const totalIngresos = resumen.reduce((s, r) => s + r.ingresos, 0)
  const totalGanancia = resumen.reduce((s, r) => s + r.ganancia, 0)

  return (
    <>
      <div className="flex gap-2 mb-5">
        {[['semana', 'Últimos 7 días'], ['mes', 'Este mes'], ['año', 'Este año']].map(([id, label]) => (
          <button key={id} onClick={() => setPeriodo(id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${periodo === id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : resumen.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <TrendingUp size={40} className="mx-auto mb-3 text-gray-200" />
          <p>No hay ventas registradas en este período.</p>
          <p className="text-sm mt-1">Al registrar una salida marcala como "Venta" para que aparezca aquí.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Ingresos por ventas</p>
              <p className="text-2xl font-bold text-green-800">{fmt(totalIngresos)}</p>
            </div>
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">Ganancia estimada</p>
              <p className="text-2xl font-bold text-brand-800">{fmt(totalGanancia)}</p>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Ingresos y ganancia por producto</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₡${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Bar dataKey="Ingresos" fill="#22c55e" radius={[4,4,0,0]} />
                  <Bar dataKey="Ganancia" fill="#f97316" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Producto', 'Unidades vendidas', 'Ingresos', 'Costo', 'Ganancia', 'Margen'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resumen.map(r => (
                  <tr key={r.producto?.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.producto?.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtN(r.unidades)} {r.producto?.unidad_medida}</td>
                    <td className="px-4 py-3 text-green-700 font-medium">{fmt(r.ingresos)}</td>
                    <td className="px-4 py-3 text-red-600">{fmt(r.costo)}</td>
                    <td className="px-4 py-3 font-semibold text-brand-700">{fmt(r.ganancia)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${r.margen > 30 ? 'text-green-600' : r.margen > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {r.margen.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}

// ── Tab: Productos ────────────────────────────────────────────
function TabProductos() {
  const { productos, productosConAlerta, loading, crearProducto, actualizarProducto, eliminarProducto, vincularProveedor, desvincularProveedor, refetch } = useProductos()
  const [showCreate, setShowCreate] = useState(false)
  const [editando, setEditando] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [toast, setToast] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const columns = [
    { key: 'nombre', label: 'Producto', render: r => (
      <div className="flex items-center gap-2">
        {Number(r.stock_actual) <= Number(r.stock_minimo) && Number(r.stock_minimo) > 0 && <AlertTriangle size={14} className="text-red-400 shrink-0" />}
        <div>
          <p className="font-medium text-gray-900">{r.nombre}</p>
          <p className="text-xs text-gray-400">{r.proveedores?.filter(p => p.es_principal).map(p => p.proveedor?.nombre).join(', ') || 'Sin proveedor'}</p>
        </div>
      </div>
    )},
    { key: 'unidad', label: 'Unidad', render: r => r.unidad_medida },
    { key: 'stock', label: 'Stock', render: r => (
      <span className={`font-semibold ${Number(r.stock_actual) <= Number(r.stock_minimo) && Number(r.stock_minimo) > 0 ? 'text-red-600' : 'text-gray-800'}`}>
        {fmtN(r.stock_actual)} {r.unidad_medida}
      </span>
    )},
    { key: 'precio_costo', label: 'Costo', render: r => fmt(r.precio_costo) },
    { key: 'precio_venta', label: 'Venta', render: r => fmt(r.precio_venta) },
    { key: 'margen', label: 'Margen', render: r => {
      const m = r.precio_venta > 0 ? ((r.precio_venta - r.precio_costo) / r.precio_venta * 100) : 0
      return <span className={`font-medium text-sm ${m > 30 ? 'text-green-600' : m > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>{m.toFixed(1)}%</span>
    }},
    { key: 'acciones', label: '', render: r => (
      <div className="flex gap-1">
        <button onClick={() => setDetalle(r)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Detalle / Movimientos"><History size={14} className="text-gray-500" /></button>
        <button onClick={() => setEditando(r)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Editar"><Edit2 size={14} className="text-gray-500" /></button>
        <button onClick={async () => { if (confirm(`¿Eliminar ${r.nombre}?`)) { await eliminarProducto(r.id); showToast('Eliminado.') } }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-400" /></button>
      </div>
    )},
  ]

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreate(true)}><Plus size={15} /> Nuevo producto</Button>
      </div>

      {productosConAlerta.length > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span><strong>{productosConAlerta.length} producto(s) con stock bajo:</strong> {productosConAlerta.map(p => p.nombre).join(', ')}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <Table columns={columns} data={productos} emptyMessage="No hay productos registrados." />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo producto">
        <ProductoForm onSubmit={async d => { const { error } = await crearProducto(d); if (!error) { setShowCreate(false); showToast('Creado.') } }} onCancel={() => setShowCreate(false)} />
      </Modal>
      {editando && (
        <Modal open onClose={() => setEditando(null)} title="Editar producto">
          <ProductoForm inicial={editando} onSubmit={async d => { await actualizarProducto(editando.id, d); setEditando(null); showToast('Actualizado.') }} onCancel={() => setEditando(null)} />
        </Modal>
      )}
      {detalle && (
        <Modal open onClose={() => { setDetalle(null); refetch() }} title={detalle.nombre} size="xl">
          <ProductoDetalle
            producto={detalle}
            onVincular={vincularProveedor}
            onDesvincular={desvincularProveedor}
            refetchProductos={refetch}
          />
        </Modal>
      )}
      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>}
    </>
  )
}

// ── Página principal ─────────────────────────────────────────
const TABS = [
  { id: 'productos', label: 'Productos',         icon: Package   },
  { id: 'ventas',    label: 'Ventas por producto', icon: TrendingUp },
]

export default function InventarioPage() {
  const [tab, setTab] = useState('productos')
  const { productos, productosConAlerta } = useProductos()

  return (
    <div className="p-6">
      <PageHeader
        title="Inventario"
        subtitle={`${productos.length} productos · ${productosConAlerta.length} con stock bajo`}
      />
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>
      {tab === 'productos' && <TabProductos />}
      {tab === 'ventas'    && <VentasProducto />}
    </div>
  )
}
