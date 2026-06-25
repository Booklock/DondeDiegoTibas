import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { FormField, Input, Textarea } from '../../../components/ui/FormField'
import { diasHabilesEntreFechas } from '../hooks/useVacaciones'
import { Info } from 'lucide-react'

export function VacacionesForm({ disponibles, onSubmit, onCancel }) {
  const [form, setForm] = useState({ fecha_inicio: '', fecha_fin: '', notas: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); setError('') }

  const diasSolicitados = diasHabilesEntreFechas(form.fecha_inicio, form.fecha_fin)
  const sinDias = form.fecha_inicio && form.fecha_fin && diasSolicitados === 0
  const excede = diasSolicitados > disponibles

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.fecha_inicio || !form.fecha_fin) { setError('Seleccioná las fechas de inicio y fin.'); return }
    if (form.fecha_fin < form.fecha_inicio) { setError('La fecha fin debe ser igual o posterior al inicio.'); return }
    if (diasSolicitados === 0) { setError('El período no incluye días hábiles (lun–sáb).'); return }
    if (excede) { setError(`Solo quedan ${disponibles} días disponibles.`); return }
    setLoading(true)
    const { error } = await onSubmit(form)
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-2.5 text-sm text-blue-700">
        <Info size={15} className="shrink-0" />
        <span>{disponibles} días disponibles · se cuentan lunes a sábado automáticamente</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Fecha inicio">
          <Input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} required />
        </FormField>
        <FormField label="Fecha fin">
          <Input type="date" value={form.fecha_fin} min={form.fecha_inicio} onChange={e => set('fecha_fin', e.target.value)} required />
        </FormField>
      </div>

      {form.fecha_inicio && form.fecha_fin && (
        <div className={`text-sm font-medium px-3.5 py-2 rounded-lg border ${excede ? 'bg-red-50 border-red-200 text-red-700' : sinDias ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {sinDias
            ? 'Ningún día hábil en ese rango (solo domingos).'
            : excede
              ? `${diasSolicitados} días hábiles — supera el saldo disponible.`
              : `${diasSolicitados} día${diasSolicitados !== 1 ? 's' : ''} hábil${diasSolicitados !== 1 ? 'es' : ''} (lun–sáb)`}
        </div>
      )}

      <FormField label="Notas (opcional)">
        <Textarea value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Motivo, observaciones..." />
      </FormField>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading} disabled={excede || sinDias}>Registrar vacaciones</Button>
      </div>
    </form>
  )
}
