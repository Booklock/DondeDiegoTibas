import { useEffect, useState } from 'react'
import { usePedidos } from './hooks/usePedidos'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormField'
import { Plus, ChevronDown, ChevronUp, Truck, CheckCircle, XCircle, Package, Trash2 } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CR') : '—'

const ESTADO_CONFIG = {
  en_camino:  { label: 'En camino',  color: 'yellow', icon: Truck },
  entregado:  { label: 'Entregado',  color: 'green',  icon: CheckCircle },
  cancelado:  { label: 'Cancelado',  color: 'gray',   icon: XCircle },
}

// ── Línea del formulario ──────────────────────────────────────
function LineaRow({ linea, productos, proveedorId, onChange, onRemove }) {
  function handleProducto(productoId) {
    const prod = productos.find(p => p.id === productoId)
    if (!prod) { onChange({ ...linea, producto_id: '', nombre: '', sku: '', precio_unitario: '' }); return }
    const linkPrecio = prod.proveedores?.find(pp => pp.proveedor_id === proveedorId)?.precio_costo
    onChange({
      ...linea,
      producto_id: prod.id,
      nombre: prod.nombre,
      sku: prod.sku ?? '',
      precio_unitario: linkPrecio ?? prod.precio_costo ?? '',
    })
  }

  const subtotal = Number(linea.cantidad || 0) * Number(linea.precio_unitario || 0)

  return (
    <div className="grid grid-cols-[1fr_80px_80px_90px_90px_32px] gap-2 items-center">
      <Select value={linea.producto_id} onChange={e => handleProducto(e.target.value)} className="text-sm">
        <option value="">— Producto —</option>
        {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </Select>
      <input
        type="text" value={linea.sku}
        onChange={e => onChange({ ...linea, sku: e.target.value })}
        placeholder="SKU" className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <input
        type="number" min="0.001" step="0.001" value={linea.cantidad}
        onChange={e => onChange({ ...linea, cantidad: e.target.value })}
        placeholder="Cant." className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <input
        type="number" min="0" step="0.01" value={linea.precio_unitario}
        onChange={e => onChange({ ...linea, precio_unitario: e.target.value })}
        placeholder="Precio" className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <p className="text-xs text-gray-500 text-right">{subtotal > 0 ? fmt(subtotal) : '—'}</p>
      <button type="button" onClick={onRemove} className="p-1 hover:bg-red-50 rounded-lg">
        <Trash2 size={13} className="text-red-400" />
      </button>
    </div>
  )
}

// ── Formulario nuevo pedido ───────────────────────────────────
function PedidoForm({ onSubmit, onCancel }) {
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos] = useState([])
  const [form, setForm] = useState({ proveedor_id: '', numero: '', fecha_estimada: '', notas: '' })
  const [lineas, setLineas] = useState([{ producto_id: '', nombre: '', sku: '', cantidad: '', precio_unitario: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre')
      .then(({ data }) => setProveedores(data ?? []))
    supabase.from('productos').select(`
      id, nombre, sku, precio_costo,
      proveedores:producto_proveedor(proveedor_id, precio_costo)
    `).order('nombre')
      .then(({ data }) => setProductos(data ?? []))
  }, [])

  function addLinea() {
    setLineas(ls => [...ls, { producto_id: '', nombre: '', sku: '', cantidad: '', precio_unitario: '' }])
  }

  function updateLinea(i, data) { setLineas(ls => ls.map((l, idx) => idx === i ? data : l)) }
  function removeLinea(i)       { setLineas(ls => ls.filter((_, idx) => idx !== i)) }

  const total = lineas.reduce((s, l) => s + Number(l.cantidad || 0) * Number(l.precio_unitario || 0), 0)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.proveedor_id) { setError('Seleccioná un proveedor.'); return }
    const lineasValidas = lineas.filter(l => l.nombre && Number(l.cantidad) > 0)
    if (lineasValidas.length === 0) { setError('Agregá al menos un producto con cantidad.'); return }
    setLoading(true)
    const { error } = await onSubmit(
      { proveedor_id: form.proveedor_id, numero: form.numero || null, fecha_estimada: form.fecha_estimada || null, notas: form.notas || null },
      lineasValidas.map(l => ({
        producto_id: l.producto_id || null,
        sku: l.sku || null,
        nombre: l.nombre,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio_unitario) || 0,
      }))
    )
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Proveedor">
          <Select value={form.proveedor_id} onChange={e => setForm(f => ({ ...f, proveedor_id: e.target.value }))}>
            <option value="">— Seleccionar —</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </FormField>
        <FormField label="N° de pedido (opcional)">
          <Input value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="Ref. del proveedor" />
        </FormField>
      </div>
      <FormField label="Fecha estimada de entrega (opcional)">
        <Input type="date" value={form.fecha_estimada} onChange={e => setForm(f => ({ ...f, fecha_estimada: e.target.value }))} />
      </FormField>
      <FormField label="Notas (opcional)">
        <Textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Observaciones..." />
      </FormField>

      {/* Líneas */}
      <div>
        <div className="grid grid-cols-[1fr_80px_80px_90px_90px_32px] gap-2 mb-2">
          {['Producto', 'SKU', 'Cantidad', 'Precio unit.', 'Subtotal', ''].map((h, i) => (
            <p key={i} className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</p>
          ))}
        </div>
        <div className="space-y-2">
          {lineas.map((l, i) => (
            <LineaRow
              key={i} linea={l} productos={productos} proveedorId={form.proveedor_id}
              onChange={data => updateLinea(i, data)}
              onRemove={() => removeLinea(i)}
            />
          ))}
        </div>
        <button type="button" onClick={addLinea} className="mt-3 flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
          <Plus size={14} /> Agregar producto
        </button>
        <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm font-bold text-gray-800">Total estimado: {fmt(total)}</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Crear pedido</Button>
      </div>
    </form>
  )
}

// ── Card de pedido ────────────────────────────────────────────
function PedidoCard({ pedido, onEntregado, onCancelar }) {
  const [expanded, setExpanded] = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)

  const cfg = ESTADO_CONFIG[pedido.estado] ?? ESTADO_CONFIG.en_camino
  const StatusIcon = cfg.icon
  const total = (pedido.lineas ?? []).reduce((s, l) => s + Number(l.cantidad) * Number(l.precio_unitario), 0)

  async function handleEntregado() {
    if (!confirm('¿Marcar este pedido como entregado? Esto sumará los productos al inventario.')) return
    setLoadingAction(true)
    await onEntregado(pedido.id)
    setLoadingAction(false)
  }

  async function handleCancelar() {
    if (!confirm('¿Cancelar este pedido?')) return
    setLoadingAction(true)
    await onCancelar(pedido.id)
    setLoadingAction(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{pedido.proveedor?.nombre}</h3>
              {pedido.numero && <span className="text-xs text-gray-400">#{pedido.numero}</span>}
              <Badge color={cfg.color}><StatusIcon size={11} className="inline mr-1" />{cfg.label}</Badge>
            </div>
            <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
              <span>Pedido: {fmtDate(pedido.fecha_pedido)}</span>
              {pedido.fecha_estimada && <span>Estimado: {fmtDate(pedido.fecha_estimada)}</span>}
              {pedido.fecha_entrega  && <span>Entregado: {fmtDate(pedido.fecha_entrega)}</span>}
            </div>
            <div className="flex gap-4 mt-1 text-xs text-gray-400">
              <span><Package size={11} className="inline mr-1" />{pedido.lineas?.length ?? 0} productos</span>
              <span className="font-medium text-gray-600">{fmt(total)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {pedido.estado === 'en_camino' && (
              <>
                <Button size="sm" onClick={handleEntregado} loading={loadingAction}>
                  <CheckCircle size={13} /> Entregado
                </Button>
                <button onClick={handleCancelar} disabled={loadingAction} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                  <XCircle size={14} className="text-red-400" />
                </button>
              </>
            )}
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
            </button>
          </div>
        </div>
        {pedido.notas && <p className="text-xs text-gray-400 mt-2 italic">{pedido.notas}</p>}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                <th className="text-left pb-2">Producto</th>
                <th className="text-left pb-2">SKU</th>
                <th className="text-right pb-2">Cantidad</th>
                <th className="text-right pb-2">Precio unit.</th>
                <th className="text-right pb-2">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(pedido.lineas ?? []).map(l => (
                <tr key={l.id}>
                  <td className="py-1.5 text-gray-800">{l.nombre}</td>
                  <td className="py-1.5 text-gray-400 text-xs">{l.sku ?? '—'}</td>
                  <td className="py-1.5 text-right text-gray-600">{l.cantidad}</td>
                  <td className="py-1.5 text-right text-gray-600">{fmt(l.precio_unitario)}</td>
                  <td className="py-1.5 text-right font-medium text-gray-800">{fmt(Number(l.cantidad) * Number(l.precio_unitario))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="pt-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</td>
                <td className="pt-2 text-right font-bold text-gray-900">{fmt(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
const FILTROS = [
  { val: 'en_camino', label: 'En camino' },
  { val: 'entregado', label: 'Entregados' },
  { val: 'cancelado', label: 'Cancelados' },
  { val: 'todos',     label: 'Todos' },
]

export default function PedidosPage() {
  const { pedidos, loading, crearPedido, marcarEntregado, cancelarPedido } = usePedidos()
  const [showCreate, setShowCreate] = useState(false)
  const [filtro, setFiltro] = useState('en_camino')
  const [toast, setToast] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const lista = filtro === 'todos' ? pedidos : pedidos.filter(p => p.estado === filtro)

  const enCamino = pedidos.filter(p => p.estado === 'en_camino').length

  return (
    <div className="p-6">
      <PageHeader
        title="Pedidos"
        subtitle={enCamino > 0 ? `${enCamino} pedido${enCamino !== 1 ? 's' : ''} en camino` : 'Sin pedidos en camino'}
        action={<Button onClick={() => setShowCreate(true)}><Plus size={15} /> Nuevo pedido</Button>}
      />

      <div className="flex gap-2 mb-5">
        {FILTROS.map(({ val, label }) => (
          <button key={val} onClick={() => setFiltro(val)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filtro === val ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
            {val !== 'todos' && (
              <span className={`ml-1.5 text-xs ${filtro === val ? 'text-white/70' : 'text-gray-400'}`}>
                {pedidos.filter(p => p.estado === val).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No hay pedidos en esta categoría.</div>
      ) : (
        <div className="space-y-3">
          {lista.map(p => (
            <PedidoCard
              key={p.id}
              pedido={p}
              onEntregado={async id => {
                const { error } = await marcarEntregado(id)
                if (error) showToast('Error al marcar como entregado.')
                else showToast('Pedido entregado — inventario actualizado.')
              }}
              onCancelar={async id => {
                const { error } = await cancelarPedido(id)
                if (!error) showToast('Pedido cancelado.')
              }}
            />
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo pedido" size="lg">
        <PedidoForm
          onSubmit={async (pedidoData, lineas) => {
            const { error } = await crearPedido(pedidoData, lineas)
            if (!error) { setShowCreate(false); showToast('Pedido creado.') }
            return { error }
          }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">{toast}</div>}
    </div>
  )
}
