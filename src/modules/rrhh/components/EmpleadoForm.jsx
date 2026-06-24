import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { FormField, Input, Select } from '../../../components/ui/FormField'

const INITIAL = {
  nombre: '', apellidos: '', email: '', password: '', telefono: '',
  cedula: '', puesto: '', fecha_ingreso: '', salario: '', estado: 'activo'
}

export function EmpleadoForm({ inicial = {}, onSubmit, onCancel, esEdicion = false }) {
  const [form, setForm] = useState({ ...INITIAL, ...inicial })
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
    if (!form.fecha_ingreso) e.fecha_ingreso = 'Requerido'
    if (!esEdicion) {
      if (!form.email.trim()) e.email = 'Requerido'
      if (!form.password || form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    }
    if (form.salario && isNaN(Number(form.salario))) e.salario = 'Debe ser un número'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    await onSubmit({
      ...form,
      salario: form.salario ? Number(form.salario) : undefined,
    })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nombre" error={errors.nombre}>
          <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Juan" />
        </FormField>
        <FormField label="Apellidos" error={errors.apellidos}>
          <Input value={form.apellidos} onChange={e => set('apellidos', e.target.value)} placeholder="Pérez Solano" />
        </FormField>
      </div>

      {!esEdicion && (
        <>
          <FormField label="Correo electrónico" error={errors.email}>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="juan@ejemplo.com" />
          </FormField>
          <FormField label="Contraseña temporal" error={errors.password}>
            <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 8 caracteres" />
          </FormField>
        </>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Teléfono">
          <Input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="8888-0000" />
        </FormField>
        <FormField label="Cédula">
          <Input value={form.cedula} onChange={e => set('cedula', e.target.value)} placeholder="1-0000-0000" />
        </FormField>
      </div>

      <FormField label="Puesto" error={errors.puesto}>
        <Input value={form.puesto} onChange={e => set('puesto', e.target.value)} placeholder="Cajero, Cocinero, etc." />
      </FormField>

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

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>
          {esEdicion ? 'Guardar cambios' : 'Crear empleado'}
        </Button>
      </div>
    </form>
  )
}
