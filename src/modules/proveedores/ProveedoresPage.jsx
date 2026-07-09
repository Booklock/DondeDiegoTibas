import { useState } from 'react'
import { useProveedores } from './hooks/useProveedores'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { FormField, Input, Textarea } from '../../components/ui/FormField'
import { Plus, Edit2, UserX, UserCheck, Phone, Mail, Briefcase, ChevronDown, ChevronUp, Trash2, Landmark, Copy } from 'lucide-react'

// ── Formulario proveedor ──────────────────────────────────────
function ProveedorForm({ inicial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({ nombre: '', telefono: '', productos_que_provee: '', banco: '', cuenta_bancaria: '', activo: true, ...inicial })
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
      <FormField label="Teléfono">
        <Input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="2222-0000" />
      </FormField>
      <FormField label="Productos que provee">
        <Textarea value={form.productos_que_provee} onChange={e => set('productos_que_provee', e.target.value)} placeholder="Describirlos brevemente..." />
      </FormField>
      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1.5"><Landmark size={14} /> Datos bancarios (opcional)</p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Banco">
            <Input value={form.banco} onChange={e => set('banco', e.target.value)} placeholder="BCR, BAC, BN..." />
          </FormField>
          <FormField label="Número de cuenta / IBAN">
            <Input value={form.cuenta_bancaria} onChange={e => set('cuenta_bancaria', e.target.value)} placeholder="CR00 0000 0000 0000 0000 00" />
          </FormField>
        </div>
      </div>
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
            {proveedor.productos_que_provee && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{proveedor.productos_que_provee}</p>
            )}
            <div className="flex flex-col gap-1 mt-1.5">
              {proveedor.contactos?.[0] && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Phone size={13} className="text-gray-400 shrink-0" />
                  <span className="font-medium">{proveedor.contactos[0].nombre}</span>
                  {proveedor.contactos[0].telefono && (
                    <span className="text-brand-600 font-semibold">{proveedor.contactos[0].telefono}</span>
                  )}
                  {proveedor.contactos[0].cargo && (
                    <span className="text-xs text-gray-400">· {proveedor.contactos[0].cargo}</span>
                  )}
                </div>
              )}
              {proveedor.cuenta_bancaria && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Landmark size={13} className="text-gray-400 shrink-0" />
                  {proveedor.banco && <span className="font-medium">{proveedor.banco}</span>}
                  <span className="font-mono text-gray-500">{proveedor.cuenta_bancaria}</span>
                  <button onClick={() => navigator.clipboard.writeText(proveedor.cuenta_bancaria)}
                    className="p-0.5 hover:bg-gray-100 rounded transition-colors" title="Copiar cuenta">
                    <Copy size={11} className="text-gray-400" />
                  </button>
                </div>
              )}
            </div>
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
          {/* Datos bancarios */}
          {(proveedor.banco || proveedor.cuenta_bancaria) && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <Landmark size={16} className="text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                {proveedor.banco && (
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">{proveedor.banco}</p>
                )}
                {proveedor.cuenta_bancaria && (
                  <p className="text-sm font-mono text-blue-800 break-all">{proveedor.cuenta_bancaria}</p>
                )}
              </div>
              {proveedor.cuenta_bancaria && (
                <button
                  onClick={() => { navigator.clipboard.writeText(proveedor.cuenta_bancaria) }}
                  className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors shrink-0"
                  title="Copiar número de cuenta"
                >
                  <Copy size={13} className="text-blue-400" />
                </button>
              )}
            </div>
          )}

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
