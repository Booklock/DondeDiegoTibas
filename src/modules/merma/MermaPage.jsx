import { useState, useEffect, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { FormField, Input, Select, Textarea } from '../../components/ui/FormField'
import { Scale, Save, Edit2, Trash2, Download, AlertTriangle } from 'lucide-react'

const CORTES      = ['Posta', 'Panzada', 'Alita', 'Pork Belly', 'Costilla']
const OTRO        = 'Otro'
const PROVEEDORES = ['Diego', 'Mafad', 'Gustavo']

function localDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtFecha(d) {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}
const fmtKg  = n => `${Number(n).toLocaleString('es-CR', { maximumFractionDigits: 3 })} kg`
const fmtPct = n => `${n.toLocaleString('es-CR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

function calcMerma(antes, despues) {
  const a = Number(antes), d = Number(despues)
  if (!(a > 0) || !(d >= 0) || d > a) return null
  return (a - d) / a * 100
}

function vacio() {
  return { corte: '', corte_otro: '', proveedor: '', peso_antes: '', peso_despues: '', fecha_prueba: localDateStr(), fecha_compra: '', notas: '' }
}

function desdeFila(p) {
  const estandar = CORTES.includes(p.corte)
  return {
    corte:        estandar ? p.corte : OTRO,
    corte_otro:   estandar ? '' : p.corte,
    proveedor:    p.proveedor,
    peso_antes:   String(Number(p.peso_antes)),
    peso_despues: String(Number(p.peso_despues)),
    fecha_prueba: p.fecha_prueba,
    fecha_compra: p.fecha_compra ?? '',
    notas:        p.notas ?? '',
  }
}

function Opciones({ opciones, valor, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map(o => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            valor === o ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300'
          }`}>{o}</button>
      ))}
    </div>
  )
}

function MermaForm({ inicial, onGuardar, onCancel, submitLabel }) {
  const [form, setForm]     = useState(inicial ?? vacio())
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const merma = calcMerma(form.peso_antes, form.peso_despues)
  const despuesMayor = Number(form.peso_despues) > Number(form.peso_antes) && form.peso_antes !== ''
  const compraDespues = form.fecha_compra && form.fecha_prueba && form.fecha_compra > form.fecha_prueba

  async function handleSubmit(e) {
    e.preventDefault()
    const corte = form.corte === OTRO ? form.corte_otro.trim() : form.corte
    if (!corte)                  { setError(form.corte === OTRO ? 'Escribí qué corte es.' : 'Elegí el corte de carne.'); return }
    if (!form.proveedor)         { setError('Elegí el proveedor.'); return }
    if (!(Number(form.peso_antes) > 0)) { setError('El peso antes de cocinar debe ser mayor a 0.'); return }
    if (form.peso_despues === '' || Number(form.peso_despues) < 0) { setError('Ingresá el peso después de cocinar.'); return }
    if (despuesMayor)            { setError('El peso después de cocinar no puede ser mayor al de antes.'); return }
    if (!form.fecha_prueba)      { setError('Elegí la fecha de la prueba.'); return }
    setSaving(true)
    setError('')
    const { error: err } = await onGuardar({
      corte,
      proveedor:    form.proveedor,
      peso_antes:   Number(form.peso_antes),
      peso_despues: Number(form.peso_despues),
      fecha_prueba: form.fecha_prueba,
      fecha_compra: form.fecha_compra || null,
      notas:        form.notas.trim() || null,
    })
    setSaving(false)
    if (err) setError(err.message)
    else if (!inicial) setForm(vacio())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Corte de carne">
        <Opciones opciones={[...CORTES, OTRO]} valor={form.corte} onChange={v => set('corte', v)} />
        {form.corte === OTRO && (
          <Input className="mt-2" value={form.corte_otro} onChange={e => set('corte_otro', e.target.value)}
            placeholder="¿Qué corte es?" autoFocus />
        )}
      </FormField>

      <FormField label="Proveedor de carne">
        <Opciones opciones={PROVEEDORES} valor={form.proveedor} onChange={v => set('proveedor', v)} />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Peso antes de cocinar (kg)">
          <Input type="number" inputMode="decimal" min="0" step="0.001" value={form.peso_antes}
            onChange={e => set('peso_antes', e.target.value)} placeholder="Ej: 10.5" />
        </FormField>
        <FormField label="Peso después de cocinar (kg)">
          <Input type="number" inputMode="decimal" min="0" step="0.001" value={form.peso_despues}
            onChange={e => set('peso_despues', e.target.value)} placeholder="Ej: 6.8" />
        </FormField>
      </div>

      <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${
        despuesMayor ? 'bg-red-50 border border-red-200' : 'bg-brand-50 border border-brand-100'
      }`}>
        <span className="text-sm font-semibold text-gray-700">Merma</span>
        {despuesMayor ? (
          <span className="text-sm text-red-600 flex items-center gap-1"><AlertTriangle size={14} /> El peso después es mayor que el de antes</span>
        ) : merma != null ? (
          <div className="text-right">
            <span className="text-2xl font-bold text-brand-700">{fmtPct(merma)}</span>
            <p className="text-xs text-gray-500">
              Se pierden {fmtKg(Number(form.peso_antes) - Number(form.peso_despues))} · rinde {fmtPct(100 - merma)}
            </p>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Ingresá ambos pesos</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Fecha de la prueba">
          <Input type="date" value={form.fecha_prueba} onChange={e => set('fecha_prueba', e.target.value)} />
        </FormField>
        <FormField label="Fecha en que se compró la carne">
          <Input type="date" value={form.fecha_compra} max={form.fecha_prueba || undefined}
            onChange={e => set('fecha_compra', e.target.value)} />
        </FormField>
      </div>
      {compraDespues && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle size={12} /> La fecha de compra es posterior a la de la prueba.
        </p>
      )}

      <FormField label="Notas (opcional)">
        <Textarea rows={2} value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Ej: tiempo de cocción, freidora usada…" />
      </FormField>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" loading={saving}><Save size={15} /> {submitLabel}</Button>
      </div>
    </form>
  )
}

/** Promedio de merma agrupado por una columna (corte o proveedor). */
function promedios(pruebas, campo) {
  const g = {}
  pruebas.forEach(p => {
    const m = calcMerma(p.peso_antes, p.peso_despues)
    if (m == null) return
    g[p[campo]] ??= { suma: 0, n: 0 }
    g[p[campo]].suma += m
    g[p[campo]].n++
  })
  return Object.entries(g)
    .map(([clave, { suma, n }]) => ({ clave, promedio: suma / n, n }))
    .sort((a, b) => a.clave.localeCompare(b.clave))
}

function TablaPromedios({ titulo, filas }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{titulo}</h3>
      {filas.length === 0 ? <p className="text-sm text-gray-400">Sin datos</p> : (
        <ul className="divide-y divide-gray-100">
          {filas.map(f => (
            <li key={f.clave} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-gray-700">{f.clave} <span className="text-xs text-gray-400">({f.n} prueba{f.n !== 1 ? 's' : ''})</span></span>
              <span className="font-bold text-brand-700">{fmtPct(f.promedio)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function MermaPage() {
  const { esDueno } = useAuth()
  const [pruebas, setPruebas]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [toast, setToast]       = useState('')
  const [editando, setEditando] = useState(null)
  const [fCorte, setFCorte]     = useState('')
  const [fProv, setFProv]       = useState('')

  const cargar = useCallback(async () => {
    const { data, error: err } = await supabase.from('pruebas_merma').select('*')
      .order('fecha_prueba', { ascending: false }).order('created_at', { ascending: false })
    setError(err ? `No se pudieron cargar las pruebas: ${err.message}. ¿Corriste la migración v28?` : '')
    setPruebas(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  async function crear(row) {
    const { error: err } = await supabase.from('pruebas_merma').insert(row)
    if (!err) { showToast('Prueba de merma guardada.'); await cargar() }
    return { error: err }
  }
  async function actualizar(row) {
    const { error: err } = await supabase.from('pruebas_merma').update(row).eq('id', editando.id)
    if (!err) { setEditando(null); showToast('Prueba actualizada.'); await cargar() }
    return { error: err }
  }
  async function eliminar(p) {
    if (!confirm(`¿Eliminar la prueba de ${p.corte} del ${fmtFecha(p.fecha_prueba)}?`)) return
    const { error: err } = await supabase.from('pruebas_merma').delete().eq('id', p.id)
    if (err) alert(err.message)
    else await cargar()
  }

  const cortesUsados = useMemo(() => [...new Set(pruebas.map(p => p.corte))].sort(), [pruebas])
  const filtradas = useMemo(() => pruebas.filter(p =>
    (!fCorte || p.corte === fCorte) && (!fProv || p.proveedor === fProv)
  ), [pruebas, fCorte, fProv])

  function handleExport() {
    const rows = filtradas.map(p => ({
      'Fecha prueba':      p.fecha_prueba,
      'Fecha compra':      p.fecha_compra ?? '',
      'Corte':             p.corte,
      'Proveedor':         p.proveedor,
      'Peso antes (kg)':   Number(p.peso_antes),
      'Peso después (kg)': Number(p.peso_despues),
      'Merma (%)':         Math.round(calcMerma(p.peso_antes, p.peso_despues) * 10) / 10,
      'Notas':             p.notas ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Merma')
    XLSX.writeFile(wb, `Merma_${localDateStr()}.xlsx`)
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader title="Merma de carne" subtitle="Porcentaje de peso que se pierde al cocinar cada corte" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Scale size={17} /> Nueva prueba</h2>
            <MermaForm onGuardar={crear} submitLabel="Guardar prueba" />
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {error && <div className="px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TablaPromedios titulo="Merma promedio por corte" filas={promedios(filtradas, 'corte')} />
            <TablaPromedios titulo="Merma promedio por proveedor" filas={promedios(filtradas, 'proveedor')} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={fCorte} onChange={e => setFCorte(e.target.value)} className="!w-auto">
              <option value="">Todos los cortes</option>
              {cortesUsados.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select value={fProv} onChange={e => setFProv(e.target.value)} className="!w-auto">
              <option value="">Todos los proveedores</option>
              {PROVEEDORES.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            {filtradas.length > 0 && (
              <button onClick={handleExport}
                className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors">
                <Download size={14} /> Descargar Excel
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtradas.length === 0 ? (
            <p className="text-center text-gray-400 py-12 border border-dashed border-gray-200 rounded-xl text-sm">
              {pruebas.length === 0 ? 'Todavía no hay pruebas de merma registradas.' : 'No hay pruebas con estos filtros.'}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500">Prueba</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-500">Corte</th>
                    <th className="text-left px-3 py-3 font-semibold text-gray-500">Proveedor</th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-500">Antes</th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-500">Después</th>
                    <th className="text-right px-3 py-3 font-semibold text-brand-600">Merma</th>
                    {esDueno && <th className="px-2 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtradas.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-gray-800">{fmtFecha(p.fecha_prueba)}</p>
                        <p className="text-xs text-gray-400">Compra: {fmtFecha(p.fecha_compra)}</p>
                      </td>
                      <td className="px-3 py-3 text-gray-800">
                        {p.corte}
                        {p.notas && <p className="text-xs text-gray-400 max-w-[180px] truncate" title={p.notas}>{p.notas}</p>}
                      </td>
                      <td className="px-3 py-3 text-gray-600">{p.proveedor}</td>
                      <td className="px-3 py-3 text-right text-gray-600">{fmtKg(p.peso_antes)}</td>
                      <td className="px-3 py-3 text-right text-gray-600">{fmtKg(p.peso_despues)}</td>
                      <td className="px-3 py-3 text-right font-bold text-brand-700">{fmtPct(calcMerma(p.peso_antes, p.peso_despues) ?? 0)}</td>
                      {esDueno && (
                        <td className="px-2 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => setEditando(p)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Editar">
                              <Edit2 size={13} className="text-gray-400" />
                            </button>
                            <button onClick={() => eliminar(p)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Eliminar">
                              <Trash2 size={13} className="text-red-400" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editando && (
        <Modal open onClose={() => setEditando(null)} title="Editar prueba de merma">
          <MermaForm inicial={desdeFila(editando)} onGuardar={actualizar} onCancel={() => setEditando(null)} submitLabel="Guardar cambios" />
        </Modal>
      )}

      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">{toast}</div>}
    </div>
  )
}
