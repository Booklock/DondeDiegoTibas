import { useState } from 'react'
import { useProveedores } from './hooks/useProveedores'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { FormField, Input, Textarea } from '../../components/ui/FormField'
import { Plus, Edit2, UserX, UserCheck, Phone, Mail, Briefcase, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

// ── Formulario proveedor ──────────────────────────────────────
function ProveedorForm({ inicial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', productos_que_provee: '', ...inicial })
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

// ── Card de proveedor ─────────────────────────────────────────
function ProveedorCard({ proveedor, onEdit, onToggle, onAddContacto, onDeleteContacto }) {
  const [expanded, setExpanded] = useState(false)
  const [showContactoForm, setShowContactoForm] = useState(false)

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
        <div className="border-t border-gray-100 px-5 py-4">
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
            <p className="text-sm text-gray-400 text-center py-3">Sin contactos registrados.</p>
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
      )}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────
export default function ProveedoresPage() {
  const { proveedores, loading, crearProveedor, actualizarProveedor, toggleActivo, agregarContacto, eliminarContacto } = useProveedores()
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
