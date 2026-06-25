import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { FormField, Input, Select } from '../../../components/ui/FormField'
import { usePendientes } from '../hooks/useEmpleados'
import { UserPlus, Users } from 'lucide-react'

const CAMPOS_HR = ({ form, set, errors, esEdicion }) => (
  <>
    <FormField label="Puesto" error={errors.puesto}>
      <Input value={form.puesto} onChange={e => set('puesto', e.target.value)} placeholder="Cajero, Cocinero, etc." />
    </FormField>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Cédula">
        <Input value={form.cedula} onChange={e => set('cedula', e.target.value)} placeholder="1-0000-0000" />
      </FormField>
      <FormField label="Teléfono">
        <Input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="8888-0000" />
      </FormField>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Fecha de ingreso" error={errors.fecha_ingreso}>
        <Input type="date" value={form.fecha_ingreso} onChange={e => set('fecha_ingreso', e.target.value)} />
      </FormField>
      <FormField label={esEdicion ? 'Nuevo salario (₡)' : 'Salario inicial (₡)'} error={errors.salario}>
        <Input type="number" min="0" step="500" value={form.salario} onChange={e => set('salario', e.target.value)} placeholder="300000" />
      </FormField>
    </div>
    {esEdicion && (
      <FormField label="Estado">
        <Select value={form.estado} onChange={e => set('estado', e.target.value)}>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </Select>
      </FormField>
    )}
  </>
)

// ── Formulario de edición ─────────────────────────────────────
export function EmpleadoEditForm({ inicial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    nombre: '', apellidos: '', telefono: '', cedula: '',
    puesto: '', fecha_ingreso: '', estado: 'activo', salario: '',
    ...inicial
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.apellidos.trim()) e.apellidos = 'Requerido'
    if (!form.puesto.trim()) e.puesto = 'Requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    await onSubmit({ ...form, salario: form.salario ? Number(form.salario) : undefined })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nombre" error={errors.nombre}>
          <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} />
        </FormField>
        <FormField label="Apellidos" error={errors.apellidos}>
          <Input value={form.apellidos} onChange={e => set('apellidos', e.target.value)} />
        </FormField>
      </div>
      <CAMPOS_HR form={form} set={set} errors={errors} esEdicion />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Guardar cambios</Button>
      </div>
    </form>
  )
}

// ── Formulario de creación con dos modos ─────────────────────
export function EmpleadoCreateForm({ onSubmitNuevo, onSubmitExistente, onCancel }) {
  const [modo, setModo] = useState('existente') // 'existente' | 'nuevo'
  const { pendientes, loading: loadingPend } = usePendientes()

  const INITIAL_HR = { cedula: '', puesto: '', fecha_ingreso: '', salario: '', telefono: '' }
  const [hrForm, setHrForm] = useState(INITIAL_HR)
  const [perfilId, setPerfilId] = useState('')
  const [nuevoForm, setNuevoForm] = useState({
    nombre: '', apellidos: '', email: '', password: '', ...INITIAL_HR
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  function setHr(field, value) { setHrForm(f => ({ ...f, [field]: value })); setErrors(e => ({ ...e, [field]: '' })) }
  function setNuevo(field, value) { setNuevoForm(f => ({ ...f, [field]: value })); setErrors(e => ({ ...e, [field]: '' })) }

  async function handleExistente(e) {
    e.preventDefault()
    const err = {}
    if (!perfilId) err.perfil = 'Seleccioná un usuario'
    if (!hrForm.puesto) err.puesto = 'Requerido'
    if (!hrForm.fecha_ingreso) err.fecha_ingreso = 'Requerido'
    setErrors(err)
    if (Object.keys(err).length) return
    setLoading(true)
    await onSubmitExistente({ perfil_id: perfilId, ...hrForm, salario: hrForm.salario ? Number(hrForm.salario) : undefined })
    setLoading(false)
  }

  async function handleNuevo(e) {
    e.preventDefault()
    const err = {}
    if (!nuevoForm.nombre.trim()) err.nombre = 'Requerido'
    if (!nuevoForm.apellidos.trim()) err.apellidos = 'Requerido'
    if (!nuevoForm.email.trim()) err.email = 'Requerido'
    if (!nuevoForm.password || nuevoForm.password.length < 8) err.password = 'Mínimo 8 caracteres'
    if (!nuevoForm.puesto.trim()) err.puesto = 'Requerido'
    if (!nuevoForm.fecha_ingreso) err.fecha_ingreso = 'Requerido'
    setErrors(err)
    if (Object.keys(err).length) return
    setLoading(true)
    await onSubmitNuevo({ ...nuevoForm, salario: nuevoForm.salario ? Number(nuevoForm.salario) : undefined })
    setLoading(false)
  }

  return (
    <div>
      {/* Selector de modo */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setModo('existente')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
            modo === 'existente'
              ? 'bg-brand-50 border-brand-300 text-brand-700'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Users size={15} />
          Usuario ya registrado
        </button>
        <button
          type="button"
          onClick={() => setModo('nuevo')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
            modo === 'nuevo'
              ? 'bg-brand-50 border-brand-300 text-brand-700'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <UserPlus size={15} />
          Crear usuario nuevo
        </button>
      </div>

      {/* Modo: usuario existente */}
      {modo === 'existente' && (
        <form onSubmit={handleExistente} className="space-y-4">
          <FormField label="Seleccioná el usuario" error={errors.perfil}>
            {loadingPend ? (
              <p className="text-sm text-gray-400 py-2">Cargando usuarios...</p>
            ) : pendientes.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Todos los usuarios registrados ya tienen ficha de empleado.
              </p>
            ) : (
              <Select value={perfilId} onChange={e => { setPerfilId(e.target.value); setErrors(er => ({ ...er, perfil: '' })) }}>
                <option value="">— Elegir usuario —</option>
                {pendientes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.apellidos} ({p.email})
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos laborales</p>
            <div className="space-y-4">
              <CAMPOS_HR form={hrForm} set={setHr} errors={errors} esEdicion={false} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" loading={loading} disabled={pendientes.length === 0}>Crear ficha</Button>
          </div>
        </form>
      )}

      {/* Modo: usuario nuevo */}
      {modo === 'nuevo' && (
        <form onSubmit={handleNuevo} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 text-sm text-amber-700">
            El empleado recibirá esta contraseña temporal. Se recomienda que la cambie al ingresar.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nombre" error={errors.nombre}>
              <Input value={nuevoForm.nombre} onChange={e => setNuevo('nombre', e.target.value)} placeholder="Juan" />
            </FormField>
            <FormField label="Apellidos" error={errors.apellidos}>
              <Input value={nuevoForm.apellidos} onChange={e => setNuevo('apellidos', e.target.value)} placeholder="Pérez" />
            </FormField>
          </div>
          <FormField label="Correo electrónico" error={errors.email}>
            <Input type="email" value={nuevoForm.email} onChange={e => setNuevo('email', e.target.value)} placeholder="juan@ejemplo.com" />
          </FormField>
          <FormField label="Contraseña temporal" error={errors.password}>
            <Input type="text" value={nuevoForm.password} onChange={e => setNuevo('password', e.target.value)} placeholder="Mínimo 8 caracteres" />
          </FormField>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos laborales</p>
            <div className="space-y-4">
              <CAMPOS_HR form={nuevoForm} set={setNuevo} errors={errors} esEdicion={false} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" loading={loading}>Crear empleado</Button>
          </div>
        </form>
      )}
    </div>
  )
}
