import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { FormField, Input, Textarea } from '../../../components/ui/FormField'

export function VacacionesForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    dias_acumulados: '',
    dias_usados: '',
    fecha_inicio: '',
    fecha_fin: '',
    notas: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const acum = Number(form.dias_acumulados)
    const usados = Number(form.dias_usados)
    if (usados > acum) {
      setError('Los días usados no pueden superar los acumulados.')
      return
    }
    setLoading(true)
    const { error } = await onSubmit({
      dias_acumulados: acum,
      dias_usados: usados,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
      notas: form.notas || null,
    })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Días acumulados">
          <Input
            type="number" min="0" step="0.5"
            value={form.dias_acumulados}
            onChange={e => set('dias_acumulados', e.target.value)}
            required
          />
        </FormField>
        <FormField label="Días usados">
          <Input
            type="number" min="0" step="0.5"
            value={form.dias_usados}
            onChange={e => set('dias_usados', e.target.value)}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Fecha inicio período">
          <Input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} />
        </FormField>
        <FormField label="Fecha fin período">
          <Input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)} />
        </FormField>
      </div>
      <FormField label="Notas">
        <Textarea value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Observaciones opcionales..." />
      </FormField>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Registrar</Button>
      </div>
    </form>
  )
}
