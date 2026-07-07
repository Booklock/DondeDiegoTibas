import { useState, useMemo } from 'react'
import { useMateriasPrimas, useRecepciones } from '../hooks/useMateriasPrimas'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { FormField, Input } from '../../../components/ui/FormField'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, PackageOpen, ToggleLeft, ToggleRight, CalendarCheck } from 'lucide-react'

const fmt  = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)
const fmtN = n => Number(n ?? 0).toLocaleString('es-CR', { maximumFractionDigits: 3 })
const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })
const fmtShort = d => new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function getSemanaKey(fechaStr) {
  const d = new Date(fechaStr + 'T00:00:00')
  const dia = d.getDay()
  const lunes = new Date(d)
  lunes.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1))
  return localDateStr(lunes)
}
function getSemanaActual() { return getSemanaKey(localDateStr(new Date())) }
function getDiasSemana(inicioStr) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicioStr + 'T00:00:00')
    d.setDate(d.getDate() + i)
    return localDateStr(d)
  })
}
function fmtSemana(inicioStr) {
  const fin = new Date(inicioStr + 'T00:00:00')
  fin.setDate(fin.getDate() + 6)
  const opts = { day: 'numeric', month: 'short' }
  return `${new Date(inicioStr + 'T00:00:00').toLocaleDateString('es-CR', opts)} — ${fin.toLocaleDateString('es-CR', opts)}`
}

// ── Formulario materia prima ──────────────────────────────────
function MateriaForm({ inicial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({ nombre: '', costo_unitario: '', unidad_medida: '', ...inicial })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es requerido.'); return }
    if (!form.unidad_medida.trim()) { setError('La unidad de medida es requerida.'); return }
    setLoading(true)
    const { error } = await onSubmit({
      nombre: form.nombre.trim(),
      costo_unitario: Number(form.costo_unitario) || 0,
      unidad_medida: form.unidad_medida.trim(),
    })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Nombre del producto">
        <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Chicharrón, Sal, Aceite..." />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Costo unitario (₡)">
          <Input type="number" min="0" step="0.01" value={form.costo_unitario}
            onChange={e => set('costo_unitario', e.target.value)} placeholder="0.00" />
        </FormField>
        <FormField label="Unidad de medida">
          <Input value={form.unidad_medida} onChange={e => set('unidad_medida', e.target.value)}
            placeholder="kg, bolsa 5kg, caja 12u..." />
        </FormField>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Guardar</Button>
      </div>
    </form>
  )
}

// ── Sección: catálogo de productos ────────────────────────────
function ProductosSection() {
  const { materias, loading, crearMateria, actualizarMateria, toggleActivo } = useMateriasPrimas()
  const [showCreate, setShowCreate] = useState(false)
  const [editando, setEditando] = useState(null)
  const [soloActivos, setSoloActivos] = useState(true)

  const lista = soloActivos ? materias.filter(m => m.activo) : materias

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {[['activos', true, 'Activos'], ['todos', false, 'Todos']].map(([, val, label]) => (
            <button key={label} onClick={() => setSoloActivos(val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${soloActivos === val ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={15} /> Nuevo producto</Button>
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          <PackageOpen size={36} className="mx-auto mb-3 text-gray-200" />
          No hay materias primas registradas.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Producto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Unidad</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500">Costo unitario</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map(m => (
                <tr key={m.id} className={`hover:bg-gray-50 transition-colors ${!m.activo ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{m.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{m.unidad_medida}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(m.costo_unitario)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditando(m)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <Pencil size={13} className="text-gray-400" />
                      </button>
                      <button onClick={() => toggleActivo(m.id, !m.activo)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                        title={m.activo ? 'Desactivar' : 'Activar'}>
                        {m.activo
                          ? <ToggleRight size={16} className="text-green-500" />
                          : <ToggleLeft size={16} className="text-gray-300" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo producto">
        <MateriaForm
          onSubmit={async d => { const { error } = await crearMateria(d); if (!error) setShowCreate(false); return { error } }}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      {editando && (
        <Modal open onClose={() => setEditando(null)} title={`Editar — ${editando.nombre}`}>
          <MateriaForm
            inicial={{ nombre: editando.nombre, costo_unitario: editando.costo_unitario, unidad_medida: editando.unidad_medida }}
            onSubmit={async d => { const { error } = await actualizarMateria(editando.id, d); if (!error) setEditando(null); return { error } }}
            onCancel={() => setEditando(null)}
          />
        </Modal>
      )}
    </>
  )
}

// ── Formulario recepción ──────────────────────────────────────
function RecepcionForm({ materias, onSubmit, onCancel }) {
  const today = localDateStr(new Date())
  const [form, setForm] = useState({ materia_prima_id: '', fecha: today, cantidad: '', notas: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const materia = materias.find(m => m.id === form.materia_prima_id)
  const subtotal = materia ? Number(form.cantidad) * Number(materia.costo_unitario) : 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.materia_prima_id) { setError('Seleccioná un producto.'); return }
    if (!form.cantidad || Number(form.cantidad) <= 0) { setError('Ingresá una cantidad válida.'); return }
    setLoading(true)
    const { error } = await onSubmit(form)
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Producto">
        <select
          value={form.materia_prima_id}
          onChange={e => set('materia_prima_id', e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">Seleccionar producto...</option>
          {materias.filter(m => m.activo).map(m => (
            <option key={m.id} value={m.id}>{m.nombre} ({m.unidad_medida})</option>
          ))}
        </select>
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Fecha">
          <Input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
        </FormField>
        <FormField label={`Cantidad${materia ? ` (${materia.unidad_medida})` : ''}`}>
          <Input type="number" min="0" step="0.001" value={form.cantidad}
            onChange={e => set('cantidad', e.target.value)} placeholder="0" />
        </FormField>
      </div>
      {subtotal > 0 && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl px-4 py-2.5 text-sm">
          <span className="text-brand-600">Subtotal: </span>
          <strong className="text-brand-800">{fmt(subtotal)}</strong>
          <span className="text-brand-400 ml-1">({fmtN(form.cantidad)} × {fmt(materia.costo_unitario)})</span>
        </div>
      )}
      <FormField label="Notas (opcional)">
        <Input value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Observaciones, proveedor..." />
      </FormField>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Registrar recepción</Button>
      </div>
    </form>
  )
}

// ── Sección: recepciones recientes ────────────────────────────
function RecepcionesSection({ materias }) {
  const hoy = localDateStr(new Date())
  const desde = (() => { const d = new Date(); d.setDate(d.getDate() - 13); return localDateStr(d) })()
  const { recepciones, loading, registrarRecepcion, eliminarRecepcion } = useRecepciones({ desde, hasta: hoy })
  const [showForm, setShowForm] = useState(false)

  const total = useMemo(() =>
    recepciones.reduce((s, r) => s + Number(r.cantidad) * Number(r.materia_prima?.costo_unitario ?? 0), 0)
  , [recepciones])

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowForm(true)}><Plus size={15} /> Registrar recepción</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : recepciones.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          No hay recepciones en los últimos 14 días.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Producto</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500">Cantidad</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500">Subtotal</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recepciones.map(r => {
                const subtotal = Number(r.cantidad) * Number(r.materia_prima?.costo_unitario ?? 0)
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap capitalize">{fmtDate(r.fecha)}</td>
                    <td className="px-4 py-3 text-gray-800">
                      {r.materia_prima?.nombre}
                      {r.notas && <p className="text-xs text-gray-400">{r.notas}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {fmtN(r.cantidad)} <span className="text-gray-400 text-xs">{r.materia_prima?.unidad_medida}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(subtotal)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { if (confirm('¿Eliminar esta recepción?')) eliminarRecepcion(r.id) }}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-600">Total (14 días)</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Registrar recepción de materia prima">
        <RecepcionForm
          materias={materias}
          onSubmit={async d => {
            const { error } = await registrarRecepcion(d)
            if (!error) setShowForm(false)
            return { error }
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </>
  )
}

// ── Sección: factura semanal ──────────────────────────────────
function FacturaSemanalSection({ materias }) {
  const [semana, setSemana] = useState(getSemanaActual)
  const dias = getDiasSemana(semana)
  const { recepciones, loading } = useRecepciones({ desde: dias[0], hasta: dias[6] })

  const semanaActual = getSemanaActual()

  function prevSemana() {
    const d = new Date(semana + 'T00:00:00'); d.setDate(d.getDate() - 7); setSemana(localDateStr(d))
  }
  function nextSemana() {
    const d = new Date(semana + 'T00:00:00'); d.setDate(d.getDate() + 7); setSemana(localDateStr(d))
  }

  // Agrupar por producto
  const grupos = useMemo(() => {
    const m = {}
    recepciones.forEach(r => {
      const id = r.materia_prima_id
      if (!m[id]) m[id] = { materia: r.materia_prima, items: [] }
      m[id].items.push(r)
    })
    return Object.values(m).sort((a, b) => a.materia?.nombre.localeCompare(b.materia?.nombre))
  }, [recepciones])

  const totalFactura = useMemo(() =>
    grupos.reduce((s, g) => {
      const costo = Number(g.materia?.costo_unitario ?? 0)
      return s + g.items.reduce((ss, r) => ss + Number(r.cantidad) * costo, 0)
    }, 0)
  , [grupos])

  return (
    <>
      {/* Navegador de semana */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={prevSemana} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center min-w-52">
            <p className="text-sm font-semibold text-gray-800">{fmtSemana(semana)}</p>
            <p className="text-xs text-gray-400">Lunes a domingo</p>
          </div>
          <button onClick={nextSemana} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
        {semana !== semanaActual && (
          <button onClick={() => setSemana(semanaActual)}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors">
            Semana actual
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : grupos.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          <CalendarCheck size={36} className="mx-auto mb-3 text-gray-200" />
          No hay recepciones registradas esta semana.
        </div>
      ) : (
        <>
          {/* Tabla por producto */}
          <div className="space-y-3 mb-6">
            {grupos.map(({ materia, items }) => {
              const costo = Number(materia?.costo_unitario ?? 0)
              const totalCantidad = items.reduce((s, r) => s + Number(r.cantidad), 0)
              const subtotal = totalCantidad * costo
              return (
                <div key={materia?.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div>
                      <span className="font-semibold text-gray-900">{materia?.nombre}</span>
                      <span className="ml-2 text-xs text-gray-400">{fmt(costo)} / {materia?.unidad_medida}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{fmt(subtotal)}</p>
                      <p className="text-xs text-gray-400">{fmtN(totalCantidad)} {materia?.unidad_medida} total</p>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {items.map(r => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span className="text-gray-500 capitalize">{fmtDate(r.fecha)}</span>
                        {r.notas && <span className="text-gray-400 text-xs mx-2">{r.notas}</span>}
                        <div className="flex items-center gap-4 ml-auto">
                          <span className="text-gray-700">{fmtN(r.cantidad)} {materia?.unidad_medida}</span>
                          <span className="text-gray-600 font-medium">{fmt(Number(r.cantidad) * costo)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Total a pagar */}
          <div className="bg-brand-50 border-2 border-brand-200 rounded-2xl px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide">Total a pagar</p>
                <p className="text-xs text-brand-400 mt-0.5">
                  Semana {fmtShort(dias[0])} — {fmtShort(dias[6])} · Se paga el lunes {fmtShort((() => {
                    const sig = new Date(dias[6] + 'T00:00:00')
                    sig.setDate(sig.getDate() + 1)
                    return localDateStr(sig)
                  })())}
                </p>
              </div>
              <p className="text-3xl font-bold text-brand-800">{fmt(totalFactura)}</p>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── Tab principal exportado ───────────────────────────────────
export function MateriaPrimaTab() {
  const { materias, loading: loadMaterias } = useMateriasPrimas()
  const [sub, setSub] = useState('recepciones')

  const SUBS = [
    ['recepciones', 'Recepciones'],
    ['factura',     'Factura semanal'],
    ['productos',   'Productos'],
  ]

  return (
    <>
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {SUBS.map(([id, label]) => (
          <button key={id} onClick={() => setSub(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sub === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {sub === 'productos'   && <ProductosSection />}
      {sub === 'recepciones' && <RecepcionesSection materias={materias} />}
      {sub === 'factura'     && <FacturaSemanalSection materias={materias} />}
    </>
  )
}
