import { useState } from 'react'
import { useCategorias } from '../hooks/useCierres'
import { Button } from '../../../components/ui/Button'
import { FormField, Input, Select, Textarea } from '../../../components/ui/FormField'
import { Plus, Trash2 } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n)

function LineaItem({ item, onUpdate, onRemove, children }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1 space-y-2">{children}</div>
      <button type="button" onClick={onRemove} className="mt-1 p-1 hover:bg-red-100 rounded-lg transition-colors">
        <Trash2 size={14} className="text-red-400" />
      </button>
    </div>
  )
}

export function CierreForm({ onSubmit, onCancel }) {
  const { categorias } = useCategorias()
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [notas, setNotas] = useState('')
  const [ingresos, setIngresos] = useState([{ descripcion: '', monto: '' }])
  const [gastos, setGastos] = useState([{ categoria_id: '', descripcion: '', monto: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function addIngreso() { setIngresos(p => [...p, { descripcion: '', monto: '' }]) }
  function addGasto() { setGastos(p => [...p, { categoria_id: '', descripcion: '', monto: '' }]) }
  function updateIngreso(i, f, v) { setIngresos(p => p.map((x, j) => j === i ? { ...x, [f]: v } : x)) }
  function updateGasto(i, f, v) { setGastos(p => p.map((x, j) => j === i ? { ...x, [f]: v } : x)) }
  function removeIngreso(i) { setIngresos(p => p.filter((_, j) => j !== i)) }
  function removeGasto(i) { setGastos(p => p.filter((_, j) => j !== i)) }

  const totalIngresos = ingresos.reduce((s, i) => s + (Number(i.monto) || 0), 0)
  const totalGastos = gastos.reduce((s, g) => s + (Number(g.monto) || 0), 0)
  const ganancia = totalIngresos - totalGastos

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const validIngresos = ingresos.filter(i => i.monto && Number(i.monto) > 0)
    const validGastos = gastos.filter(g => g.monto && Number(g.monto) > 0 && g.categoria_id)
    if (!validIngresos.length && !validGastos.length) {
      setError('Agregá al menos un ingreso o gasto válido.')
      return
    }
    setLoading(true)
    const { error } = await onSubmit({
      fecha, notas,
      ingresos: validIngresos.map(i => ({ ...i, monto: Number(i.monto) })),
      gastos: validGastos.map(g => ({ ...g, monto: Number(g.monto) })),
    })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Fecha">
          <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        </FormField>
        <FormField label="Notas opcionales">
          <Input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones..." />
        </FormField>
      </div>

      {/* Ingresos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Ingresos</p>
          <Button type="button" size="sm" variant="ghost" onClick={addIngreso}><Plus size={13} /> Agregar</Button>
        </div>
        <div className="space-y-2">
          {ingresos.map((ing, i) => (
            <LineaItem key={i} onRemove={() => removeIngreso(i)}>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Descripción (opcional)" value={ing.descripcion} onChange={e => updateIngreso(i, 'descripcion', e.target.value)} />
                <Input type="number" min="0" step="0.01" placeholder="Monto ₡" value={ing.monto} onChange={e => updateIngreso(i, 'monto', e.target.value)} />
              </div>
            </LineaItem>
          ))}
        </div>
        <p className="text-right text-sm font-semibold text-green-700 mt-2">Total ingresos: {fmt(totalIngresos)}</p>
      </div>

      {/* Gastos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Gastos</p>
          <Button type="button" size="sm" variant="ghost" onClick={addGasto}><Plus size={13} /> Agregar</Button>
        </div>
        <div className="space-y-2">
          {gastos.map((g, i) => (
            <LineaItem key={i} onRemove={() => removeGasto(i)}>
              <div className="grid grid-cols-3 gap-2">
                <Select value={g.categoria_id} onChange={e => updateGasto(i, 'categoria_id', e.target.value)}>
                  <option value="">— Categoría —</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </Select>
                <Input placeholder="Descripción (opcional)" value={g.descripcion} onChange={e => updateGasto(i, 'descripcion', e.target.value)} />
                <Input type="number" min="0" step="0.01" placeholder="Monto ₡" value={g.monto} onChange={e => updateGasto(i, 'monto', e.target.value)} />
              </div>
            </LineaItem>
          ))}
        </div>
        <p className="text-right text-sm font-semibold text-red-600 mt-2">Total gastos: {fmt(totalGastos)}</p>
      </div>

      {/* Resumen */}
      <div className={`rounded-xl p-4 ${ganancia >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700">Ganancia neta:</span>
          <span className={`text-xl font-bold ${ganancia >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(ganancia)}</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Guardar cierre</Button>
      </div>
    </form>
  )
}
