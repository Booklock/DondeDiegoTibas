import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { FormField, Input } from '../../../components/ui/FormField'

export function TurnoForm({ inicial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({ nombre: '', hora_inicio: '', hora_fin: '', ...inicial })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  function set(f, v) { setForm(x => ({ ...x, [f]: v })); setErrors(e => ({ ...e, [f]: '' })) }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = {}
    if (!form.nombre.trim()) err.nombre = 'Requerido'
    if (!form.hora_inicio) err.hora_inicio = 'Requerido'
    if (!form.hora_fin) err.hora_fin = 'Requerido'
    setErrors(err)
    if (Object.keys(err).length) return
    setLoading(true)
    await onSubmit(form)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nombre del turno" error={errors.nombre}>
        <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Mañana, Tarde, Noche" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Hora inicio" error={errors.hora_inicio}>
          <Input type="time" value={form.hora_inicio} onChange={e => set('hora_inicio', e.target.value)} />
        </FormField>
        <FormField label="Hora fin" error={errors.hora_fin}>
          <Input type="time" value={form.hora_fin} onChange={e => set('hora_fin', e.target.value)} />
        </FormField>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Guardar</Button>
      </div>
    </form>
  )
}
