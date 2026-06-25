import { useState, useEffect, useMemo, useRef } from 'react'
import { useProductos, useVentasProducto } from './hooks/useProductos'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { FormField, Input, Select } from '../../components/ui/FormField'
import { Package, AlertTriangle, SlidersHorizontal, TrendingUp, Edit2, Check, X } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const fmt  = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)
const fmtN = n => Number(n ?? 0).toLocaleString('es-CR', { maximumFractionDigits: 2 })

const MOTIVOS_AJUSTE = ['Conteo físico', 'Merma / deterioro', 'Error de registro', 'Devolución', 'Otro']

// ── Formulario ajuste de inventario ──────────────────────────
function AjusteForm({ producto, onSubmit, onCancel }) {
  const [stockNuevo, setStockNuevo] = useState(String(producto.stock_actual ?? ''))
  const [motivo, setMotivo] = useState('Conteo físico')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const delta = Number(stockNuevo) - Number(producto.stock_actual)

  async function handleSubmit(e) {
    e.preventDefault()
    if (stockNuevo === '' || isNaN(Number(stockNuevo))) { setError('Ingresá el stock real.'); return }
    if (Number(stockNuevo) < 0) { setError('El stock no puede ser negativo.'); return }
    setLoading(true)
    const { error } = await onSubmit(Number(stockNuevo), motivo, notas)
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">
        Stock actual en sistema: <strong className="text-gray-900">{fmtN(producto.stock_actual)} {producto.unidad_medida}</strong>
      </div>
      <FormField label={`Stock real (${producto.unidad_medida})`}>
        <Input type="number" min="0" step="0.01" required
          value={stockNuevo}
          onChange={e => { setStockNuevo(e.target.value); setError('') }}
          placeholder={String(producto.stock_actual)} />
      </FormField>
      {stockNuevo !== '' && !isNaN(Number(stockNuevo)) && delta !== 0 && (
        <div className={`text-sm font-medium px-3.5 py-2 rounded-lg border ${delta > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} {producto.unidad_medida} — se registrará una {delta > 0 ? 'entrada' : 'salida'} de ajuste
        </div>
      )}
      {stockNuevo !== '' && !isNaN(Number(stockNuevo)) && delta === 0 && (
        <div className="text-sm text-gray-400 px-3.5 py-2 rounded-lg border border-gray-200 bg-gray-50">
          Sin diferencia — no se genera ningún movimiento.
        </div>
      )}
      <FormField label="Motivo del ajuste">
        <Select value={motivo} onChange={e => setMotivo(e.target.value)}>
          {MOTIVOS_AJUSTE.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
      </FormField>
      <FormField label="Notas (opcional)">
        <Input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones adicionales..." />
      </FormField>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading} disabled={delta === 0 && stockNuevo !== ''}>Guardar ajuste</Button>
      </div>
    </form>
  )
}

// ── Tabla de niveles de stock ─────────────────────────────────
function StockTab({ productos, loading, onAjustar, onActualizarMinimo }) {
  const [editandoMin, setEditandoMin] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editandoMin) inputRef.current?.select()
  }, [editandoMin])

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (productos.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Package size={40} className="mx-auto mb-3 text-gray-200" />
        <p className="font-medium">No hay productos en inventario.</p>
        <p className="text-sm mt-1">Agregá productos desde la sección de Proveedores.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Producto / SKU', 'Stock actual', 'Stock mínimo', 'Estado', ''].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {productos.map(p => {
            const tieneMin = Number(p.stock_minimo) > 0
            const bajo = tieneMin && Number(p.stock_actual) <= Number(p.stock_minimo)
            const editando = editandoMin?.id === p.id

            return (
              <tr key={p.id} className={bajo ? 'bg-red-50' : 'hover:bg-gray-50'}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {bajo && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                    <div>
                      <p className={`font-medium ${bajo ? 'text-red-900' : 'text-gray-900'}`}>{p.nombre}</p>
                      {p.sku && <p className="text-xs text-gray-400 font-mono">{p.sku}</p>}
                    </div>
                  </div>
                </td>
                <td className={`px-4 py-3 font-semibold ${bajo ? 'text-red-700' : 'text-gray-800'}`}>
                  {fmtN(p.stock_actual)} <span className="text-xs font-normal text-gray-400">{p.unidad_medida}</span>
                </td>
                <td className="px-4 py-3">
                  {editando ? (
                    <div className="flex items-center gap-1">
                      <input
                        ref={inputRef}
                        type="number" min="0" step="0.01"
                        value={editandoMin.valor}
                        onChange={e => setEditandoMin(d => ({ ...d, valor: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { onActualizarMinimo(p.id, editandoMin.valor); setEditandoMin(null) }
                          if (e.key === 'Escape') setEditandoMin(null)
                        }}
                        className="w-20 px-2 py-1 border border-brand-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button onClick={() => { onActualizarMinimo(p.id, editandoMin.valor); setEditandoMin(null) }}
                        className="p-1 hover:bg-green-100 rounded text-green-600"><Check size={13} /></button>
                      <button onClick={() => setEditandoMin(null)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400"><X size={13} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditandoMin({ id: p.id, valor: String(p.stock_minimo ?? 0) })}
                      className="flex items-center gap-1.5 text-gray-600 hover:text-brand-600 group transition-colors"
                    >
                      {fmtN(p.stock_minimo || 0)} <span className="text-xs text-gray-400">{p.unidad_medida}</span>
                      <Edit2 size={10} className="opacity-0 group-hover:opacity-50 ml-0.5" />
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  {tieneMin
                    ? bajo
                      ? <Badge color="red">BAJO</Badge>
                      : <Badge color="green">OK</Badge>
                    : <span className="text-xs text-gray-300">Sin límite</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onAjustar(p)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <SlidersHorizontal size={13} /> Ajustar
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
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

// ── Página principal ─────────────────────────────────────────
export default function InventarioPage() {
  const { productos, productosConAlerta, loading, actualizarProducto, ajustarInventario, refetch } = useProductos()
  const [tab, setTab] = useState('stock')
  const [ajustando, setAjustando] = useState(null)
  const [toast, setToast] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function handleActualizarMinimo(id, valor) {
    await actualizarProducto(id, { stock_minimo: Number(valor) || 0 })
    showToast('Stock mínimo actualizado.')
    refetch()
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Inventario"
        subtitle={
          productosConAlerta.length > 0
            ? `${productosConAlerta.length} producto(s) con stock bajo`
            : `${productos.length} productos en seguimiento`
        }
      />

      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {[['stock', Package, 'Niveles de stock'], ['ventas', TrendingUp, 'Ventas']].map(([id, Icon, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <>
          {productosConAlerta.length > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
              <AlertTriangle size={16} className="shrink-0" />
              <span>
                <strong>{productosConAlerta.length} producto(s) con stock bajo:</strong>{' '}
                {productosConAlerta.map(p => p.nombre).join(', ')}
              </span>
            </div>
          )}
          <StockTab
            productos={productos}
            loading={loading}
            onAjustar={p => setAjustando(p)}
            onActualizarMinimo={handleActualizarMinimo}
          />
        </>
      )}

      {tab === 'ventas' && <VentasProducto />}

      {ajustando && (
        <Modal open onClose={() => setAjustando(null)} title={`Ajustar inventario — ${ajustando.nombre}`}>
          <AjusteForm
            producto={ajustando}
            onSubmit={async (stockNuevo, motivo, notas) => {
              const { error } = await ajustarInventario(ajustando.id, stockNuevo, motivo, notas)
              if (!error) { setAjustando(null); showToast('Ajuste guardado.'); refetch() }
              return { error }
            }}
            onCancel={() => setAjustando(null)}
          />
        </Modal>
      )}

      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>}
    </div>
  )
}
