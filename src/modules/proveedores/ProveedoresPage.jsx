import { useState } from 'react'
import { useProveedores } from './hooks/useProveedores'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormField'
import { Plus, Edit2, UserX, UserCheck, Phone, Mail, Briefcase, ChevronDown, ChevronUp, Trash2, Package, Pencil } from 'lucide-react'

const UNIDADES = ['kg', 'g', 'lb', 'litros', 'ml', 'unidades', 'cajas', 'bolsas', 'rollos']

function generarSKU(nombre) {
  const prefix = nombre.trim().toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]/g, '').slice(0, 3).padEnd(3, 'X')
  const suffix = String(Date.now()).slice(-4)
  return `${prefix}-${suffix}`
}

// ── Formulario proveedor ──────────────────────────────────────
function ProveedorForm({ inicial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', productos_que_provee: '', activo: true, ...inicial })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  function set(f, v) { setForm(x => ({ ...x, [f]: v })); setErrors(e => ({ ...e, [f]: '' })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { setErrors({ nombre: 'Requerido' }); return }
    setLoading(true)
    await onSubmit(form)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nombre del proveedor" error={errors.nombre}>
        <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Distribuidora XYZ" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Teléfono">
          <Input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="2222-0000" />
        </FormField>
        <FormField label="Dirección">
          <Input value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="San José, Costa Rica" />
        </FormField>
      </div>
      <FormField label="Productos que provee">
        <Textarea value={form.productos_que_provee} onChange={e => set('productos_que_provee', e.target.value)} placeholder="Describirlos brevemente..." />
      </FormField>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Guardar</Button>
      </div>
    </form>
  )
}

// ── Formulario contacto ───────────────────────────────────────
function ContactoForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({ nombre: '', cargo: '', telefono: '', email: '' })
  const [loading, setLoading] = useState(false)
  function set(f, v) { setForm(x => ({ ...x, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setLoading(true)
    await onSubmit(form)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Nombre">
          <Input required value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="María García" />
        </FormField>
        <FormField label="Cargo">
          <Input value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Vendedor, Gerente..." />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Teléfono">
          <Input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="8888-0000" />
        </FormField>
        <FormField label="Email">
          <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contacto@empresa.com" />
        </FormField>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Agregar contacto</Button>
      </div>
    </form>
  )
}

// ── Formulario producto del proveedor ─────────────────────────
function ProductoProveedorForm({ inicial = {}, onSubmit, onCancel, submitLabel = 'Agregar producto' }) {
  const [form, setForm] = useState({ nombre: '', sku: '', unidad_medida: 'kg', precio_costo: '', es_principal: false, ...inicial })
  const [loading, setLoading] = useState(false)
  function set(f, v) { setForm(x => ({ ...x, [f]: v })) }

  function handleNombreBlur() {
    if (form.nombre.trim() && !form.sku) {
      set('sku', generarSKU(form.nombre))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setLoading(true)
    await onSubmit({ ...form, sku: form.sku || generarSKU(form.nombre) })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Nombre del producto">
          <Input required value={form.nombre} onChange={e => set('nombre', e.target.value)}
            onBlur={handleNombreBlur} placeholder="Chicharrón, Sal..." />
        </FormField>
        <FormField label="SKU (auto-generado)">
          <Input value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Se genera al escribir nombre" />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Unidad de medida">
          <Select value={form.unidad_medida} onChange={e => set('unidad_medida', e.target.value)}>
            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
          </Select>
        </FormField>
        <FormField label="Precio de costo (₡)">
          <Input type="number" min="0" step="0.01" value={form.precio_costo}
            onChange={e => set('precio_costo', e.target.value)} placeholder="0.00" />
        </FormField>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={form.es_principal}
          onChange={e => set('es_principal', e.target.checked)} className="rounded" />
        Es el proveedor principal de este producto
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" loading={loading}>{submitLabel}</Button>
      </div>
    </form>
  )
}

// ── Card de proveedor ─────────────────────────────────────────
function ProveedorCard({ proveedor, onEdit, onToggle, onAddContacto, onDeleteContacto, onAddProducto, onDeleteProducto, onEditProducto }) {
  const [expanded, setExpanded] = useState(false)
  const [showContactoForm, setShowContactoForm] = useState(false)
  const [showProductoForm, setShowProductoForm] = useState(false)
  const [editandoProducto, setEditandoProducto] = useState(null)

  const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 2 }).format(n ?? 0)

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all ${proveedor.activo ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{proveedor.nombre}</h3>
              <Badge color={proveedor.activo ? 'green' : 'gray'}>{proveedor.activo ? 'Activo' : 'Inactivo'}</Badge>
            </div>
            {proveedor.telefono && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Phone size={12} />{proveedor.telefono}</p>
            )}
            {proveedor.direccion && (
              <p className="text-sm text-gray-500 mt-0.5">{proveedor.direccion}</p>
            )}
            {proveedor.productos_que_provee && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{proveedor.productos_que_provee}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
              <Edit2 size={14} className="text-gray-500" />
            </button>
            <button onClick={onToggle} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title={proveedor.activo ? 'Desactivar' : 'Activar'}>
              {proveedor.activo ? <UserX size={14} className="text-red-400" /> : <UserCheck size={14} className="text-green-500" />}
            </button>
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-5">
          {/* Productos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <Package size={11} /> Productos ({proveedor.productos?.length ?? 0})
              </p>
              <Button size="sm" variant="ghost" onClick={() => setShowProductoForm(true)}>
                <Plus size={12} /> Agregar
              </Button>
            </div>

            {showProductoForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <ProductoProveedorForm
                  onSubmit={async data => { await onAddProducto(data); setShowProductoForm(false) }}
                  onCancel={() => setShowProductoForm(false)}
                />
              </div>
            )}

            {(proveedor.productos?.length === 0 || !proveedor.productos) && !showProductoForm && (
              <p className="text-sm text-gray-400 text-center py-2">Sin productos registrados.</p>
            )}

            <div className="space-y-1.5">
              {proveedor.productos?.map(pp => (
                <div key={pp.id}>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800">{pp.producto?.nombre}</p>
                        {pp.es_principal && <Badge color="orange">Principal</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {pp.producto?.sku && (
                          <p className="text-xs text-gray-400 font-mono">SKU: {pp.producto.sku}</p>
                        )}
                        <p className="text-xs text-gray-400">{pp.producto?.unidad_medida}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pp.precio_costo && (
                        <p className="text-sm font-medium text-gray-600">{fmt(pp.precio_costo)}</p>
                      )}
                      <button onClick={() => setEditandoProducto(pp)}
                        className="p-1 hover:bg-gray-200 rounded-lg" title="Editar producto">
                        <Pencil size={12} className="text-gray-500" />
                      </button>
                      <button onClick={() => { if (confirm('¿Desvincular este producto del proveedor?')) onDeleteProducto(pp.id) }}
                        className="p-1 hover:bg-red-50 rounded-lg">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contactos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Contactos ({proveedor.contactos?.length ?? 0})
              </p>
              <Button size="sm" variant="ghost" onClick={() => setShowContactoForm(true)}>
                <Plus size={12} /> Agregar
              </Button>
            </div>

            {showContactoForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <ContactoForm
                  onSubmit={async data => { await onAddContacto(data); setShowContactoForm(false) }}
                  onCancel={() => setShowContactoForm(false)}
                />
              </div>
            )}

            {proveedor.contactos?.length === 0 && !showContactoForm && (
              <p className="text-sm text-gray-400 text-center py-2">Sin contactos registrados.</p>
            )}

            <div className="space-y-2">
              {proveedor.contactos?.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.nombre}</p>
                    {c.cargo && <p className="text-xs text-gray-400 flex items-center gap-1"><Briefcase size={10} />{c.cargo}</p>}
                    <div className="flex gap-3 mt-0.5">
                      {c.telefono && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} />{c.telefono}</p>}
                      {c.email && <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={10} />{c.email}</p>}
                    </div>
                  </div>
                  <button onClick={() => onDeleteContacto(c.id)} className="p-1 hover:bg-red-50 rounded-lg">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editandoProducto && (
        <Modal open onClose={() => setEditandoProducto(null)} title={`Editar — ${editandoProducto.producto?.nombre}`}>
          <ProductoProveedorForm
            inicial={{
              nombre: editandoProducto.producto?.nombre ?? '',
              sku: editandoProducto.producto?.sku ?? '',
              unidad_medida: editandoProducto.producto?.unidad_medida ?? 'kg',
              precio_costo: editandoProducto.precio_costo ?? '',
              es_principal: editandoProducto.es_principal ?? false,
            }}
            onSubmit={async data => {
              await onEditProducto(editandoProducto.producto?.id, editandoProducto.id, data)
              setEditandoProducto(null)
            }}
            onCancel={() => setEditandoProducto(null)}
            submitLabel="Guardar cambios"
          />
        </Modal>
      )}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────
export default function ProveedoresPage() {
  const { proveedores, loading, crearProveedor, actualizarProveedor, toggleActivo, agregarContacto, eliminarContacto, agregarProducto, desvincularProducto, editarProducto } = useProveedores()
  const [showCreate, setShowCreate] = useState(false)
  const [editando, setEditando] = useState(null)
  const [filtro, setFiltro] = useState('activos')
  const [toast, setToast] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const lista = proveedores.filter(p =>
    filtro === 'todos' ? true : filtro === 'activos' ? p.activo : !p.activo
  )

  return (
    <div className="p-6">
      <PageHeader
        title="Proveedores"
        subtitle={`${proveedores.filter(p => p.activo).length} proveedores activos`}
        action={<Button onClick={() => setShowCreate(true)}><Plus size={15} /> Nuevo proveedor</Button>}
      />

      <div className="flex gap-2 mb-5">
        {[['activos', 'Activos'], ['inactivos', 'Inactivos'], ['todos', 'Todos']].map(([val, label]) => (
          <button key={val} onClick={() => setFiltro(val)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filtro === val ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No hay proveedores en esta categoría.</div>
      ) : (
        <div className="space-y-3">
          {lista.map(p => (
            <ProveedorCard
              key={p.id}
              proveedor={p}
              onEdit={() => setEditando(p)}
              onToggle={() => { toggleActivo(p.id, !p.activo); showToast(p.activo ? 'Proveedor desactivado.' : 'Proveedor activado.') }}
              onAddContacto={data => agregarContacto(p.id, data)}
              onDeleteContacto={id => { if (confirm('¿Eliminar contacto?')) eliminarContacto(id) }}
              onAddProducto={async data => { const { error } = await agregarProducto(p.id, data); if (error) showToast('Error al agregar producto.'); else showToast('Producto agregado.') }}
              onDeleteProducto={id => desvincularProducto(id)}
              onEditProducto={async (productoId, vinculoId, data) => { await editarProducto(productoId, vinculoId, data); showToast('Producto actualizado.') }}
            />
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo proveedor">
        <ProveedorForm onSubmit={async d => { const { error } = await crearProveedor(d); if (!error) { setShowCreate(false); showToast('Proveedor creado.') } }} onCancel={() => setShowCreate(false)} />
      </Modal>

      {editando && (
        <Modal open onClose={() => setEditando(null)} title="Editar proveedor">
          <ProveedorForm inicial={editando} onSubmit={async d => { await actualizarProveedor(editando.id, d); setEditando(null); showToast('Actualizado.') }} onCancel={() => setEditando(null)} />
        </Modal>
      )}

      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>}
    </div>
  )
}
