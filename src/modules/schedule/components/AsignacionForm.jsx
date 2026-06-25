import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { Button } from '../../../components/ui/Button'
import { FormField, Select } from '../../../components/ui/FormField'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function AsignacionForm({ turnos, fechas, onSubmit, onCancel }) {
  const [empleados, setEmpleados] = useState([])
  const [form, setForm] = useState({ empleado_id: '', turno_id: '', fecha: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    supabase.from('empleados')
      .select('id, perfil:perfiles(nombre, apellidos)')
      .eq('estado', 'activo')
      .then(({ data }) => setEmpleados(data ?? []))
  }, [])

  function set(f, v) { setForm(x => ({ ...x, [f]: v })); setErrors(e => ({ ...e, [f]: '' })) }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = {}
    if (!form.empleado_id) err.empleado_id = 'Requerido'
    if (!form.turno_id) err.turno_id = 'Requerido'
    if (!form.fecha) err.fecha = 'Requerido'
    setErrors(err)
    if (Object.keys(err).length) return
    setLoading(true)
    await onSubmit(form)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Empleado" error={errors.empleado_id}>
        <Select value={form.empleado_id} onChange={e => set('empleado_id', e.target.value)}>
          <option value="">— Seleccionar —</option>
          {empleados.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.perfil?.nombre} {emp.perfil?.apellidos}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Turno" error={errors.turno_id}>
        <Select value={form.turno_id} onChange={e => set('turno_id', e.target.value)}>
          <option value="">— Seleccionar —</option>
          {turnos.map(t => (
            <option key={t.id} value={t.id}>
              {t.nombre} ({t.hora_inicio.slice(0,5)} – {t.hora_fin.slice(0,5)})
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Día" error={errors.fecha}>
        <Select value={form.fecha} onChange={e => set('fecha', e.target.value)}>
          <option value="">— Seleccionar —</option>
          {fechas.map((f, i) => (
            <option key={f} value={f}>{DIAS[i]} {new Date(f + 'T00:00:00').toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit' })}</option>
          ))}
        </Select>
      </FormField>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Asignar turno</Button>
      </div>
    </form>
  )
}
