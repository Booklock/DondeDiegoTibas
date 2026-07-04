import { useState, useMemo } from 'react'
import { useCierresDiarios, useGastosOperativos } from './hooks/useCierresDiarios'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { FormField, Input, Textarea } from '../../components/ui/FormField'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Plus, CheckCircle, AlertTriangle, TrendingDown, TrendingUp, DollarSign,
  ClipboardList, LayoutDashboard, ShoppingBag, ChevronDown, ChevronUp, Trash2, Pencil
} from 'lucide-react'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'short' }) : '—'
const fmtShort = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) : '—'

const ROYALTY_PCT = 0.06
const HORAS_SEMANA = 54

// ── Helpers de semana (Vie → Jue) ─────────────────────────────
function getSemanaKey(fechaStr) {
  const d = new Date(fechaStr + 'T00:00:00')
  const dia = d.getDay()
  const desde = dia === 5 ? 0 : dia === 6 ? 1 : dia + 2
  const viernes = new Date(d)
  viernes.setDate(d.getDate() - desde)
  return viernes.toISOString().slice(0, 10)
}

function agruparPorSemana(cierres) {
  const grupos = {}
  cierres.forEach(c => {
    const key = getSemanaKey(c.fecha)
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(c)
  })
  return Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0]))
}

function fmtSemana(inicioStr) {
  const fin = new Date(inicioStr + 'T00:00:00')
  fin.setDate(fin.getDate() + 6)
  const opts = { day: 'numeric', month: 'short' }
  return `${new Date(inicioStr + 'T00:00:00').toLocaleDateString('es-CR', opts)} — ${fin.toLocaleDateString('es-CR', opts)}`
}

// ── Formulario cierre diario ───────────────────────────────────
function CierreDiarioForm({ inicial, onSubmit, onCancel }) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    fecha: hoy, romana: '', facturacion: '', inicio_caja: '', efectivo: '', datafono: '', uber: '', sinoe: '', notas: '',
    ...inicial,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const n = k => Number(form[k]) || 0

  const efectivoVentas = n('efectivo') - n('inicio_caja')
  const totalCanales = efectivoVentas + n('datafono') + n('uber') + n('sinoe')
  const diferencia = n('romana') - totalCanales

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.romana && !form.efectivo) { setError('Ingresá al menos la romana o un canal.'); return }
    setLoading(true)
    const { error } = await onSubmit({
      fecha: form.fecha,
      romana:      n('romana'),
      facturacion: n('facturacion'),
      inicio_caja: n('inicio_caja'),
      efectivo:    n('efectivo'),
      datafono:    n('datafono'),
      uber:        n('uber'),
      sinoe:       n('sinoe'),
      notas: form.notas || null,
    })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Fecha">
          <Input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
        </FormField>
        <FormField label="Romana (₡)">
          <Input type="number" min="0" step="0.01" placeholder="Total romana" value={form.romana} onChange={e => set('romana', e.target.value)} />
        </FormField>
      </div>

      <FormField label="Facturación del sistema (₡)">
        <Input type="number" min="0" step="0.01" placeholder="Lo que dice el sistema de facturación" value={form.facturacion} onChange={e => set('facturacion', e.target.value)} />
      </FormField>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Canales de pago</p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Inicio de caja (₡)">
            <Input type="number" min="0" step="0.01" placeholder="Fondo inicial del día" value={form.inicio_caja} onChange={e => set('inicio_caja', e.target.value)} />
          </FormField>
          <FormField label="Efectivo total en caja (₡)">
            <Input type="number" min="0" step="0.01" placeholder="Conteo final del efectivo" value={form.efectivo} onChange={e => set('efectivo', e.target.value)} />
          </FormField>
          <FormField label="Datafono (₡)">
            <Input type="number" min="0" step="0.01" placeholder="0" value={form.datafono} onChange={e => set('datafono', e.target.value)} />
          </FormField>
          <FormField label="Uber (₡)">
            <Input type="number" min="0" step="0.01" placeholder="0" value={form.uber} onChange={e => set('uber', e.target.value)} />
          </FormField>
          <FormField label="Sinoe Móvil (₡)">
            <Input type="number" min="0" step="0.01" placeholder="0" value={form.sinoe} onChange={e => set('sinoe', e.target.value)} />
          </FormField>
        </div>

        {/* Resumen de cuadre */}
        {(totalCanales > 0 || n('romana') > 0) && (
          <div className={`mt-3 rounded-xl px-4 py-3 space-y-2 ${
            diferencia === 0 ? 'bg-green-50 border border-green-200' :
            Math.abs(diferencia) < 1000 ? 'bg-yellow-50 border border-yellow-200' :
            'bg-red-50 border border-red-200'
          }`}>
            {n('inicio_caja') > 0 && (
              <p className="text-xs text-gray-500">
                Efectivo ventas: <strong className="text-gray-700">{fmt(efectivoVentas)}</strong>
                <span className="ml-1 text-gray-400">({fmt(n('efectivo'))} total − {fmt(n('inicio_caja'))} inicio)</span>
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Total canales: <strong>{fmt(totalCanales)}</strong> · Romana: <strong>{fmt(n('romana'))}</strong>
              </span>
              {diferencia === 0
                ? <span className="flex items-center gap-1 text-green-700 font-semibold text-sm"><CheckCircle size={15} /> Cuadra</span>
                : <span className="flex items-center gap-1 text-red-700 font-semibold text-sm">
                    <AlertTriangle size={15} />
                    {diferencia > 0 ? `Faltante ${fmt(diferencia)}` : `Sobrante ${fmt(-diferencia)}`}
                  </span>
              }
            </div>
          </div>
        )}
      </div>

      <FormField label="Notas (opcional)">
        <Textarea value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Observaciones del día..." />
      </FormField>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Guardar cierre</Button>
      </div>
    </form>
  )
}

// ── Card de un cierre ──────────────────────────────────────────
function CierreCard({ cierre, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const inicioCaja = Number(cierre.inicio_caja ?? 0)
  const efectivoVentas = Number(cierre.efectivo) - inicioCaja
  const totalCanales = efectivoVentas + Number(cierre.datafono) + Number(cierre.uber) + Number(cierre.sinoe)
  const diferencia = Number(cierre.romana) - totalCanales
  const cuadra = Math.abs(diferencia) < 0.01

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(x => !x)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-gray-800 capitalize">{fmtDate(cierre.fecha)}</span>
          <span className="text-sm font-bold text-gray-900">{fmt(cierre.romana)}</span>
          {cuadra
            ? <Badge color="green"><CheckCircle size={11} className="inline mr-1" />Cuadra</Badge>
            : <Badge color={Math.abs(diferencia) < 5000 ? 'yellow' : 'red'}>
                <AlertTriangle size={11} className="inline mr-1" />
                {diferencia > 0 ? `Faltante ${fmt(diferencia)}` : `Sobrante ${fmt(-diferencia)}`}
              </Badge>
          }
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={e => { e.stopPropagation(); onEdit(cierre) }} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <Pencil size={13} className="text-gray-400" />
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); onDelete(cierre.id) }} className="p-1.5 hover:bg-red-50 rounded-lg">
            <Trash2 size={13} className="text-red-400" />
          </button>
          {expanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Romana</span>
              <span className="font-semibold text-gray-800">{fmt(cierre.romana)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Facturación</span>
              <span className="font-semibold text-gray-800">{fmt(cierre.facturacion)}</span>
            </div>
            <div className="col-span-2 border-t border-gray-200 pt-2 mt-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Canales de pago</p>
            </div>
            {inicioCaja > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Inicio de caja</span>
                <span className="font-medium text-gray-500">{fmt(inicioCaja)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Efectivo {inicioCaja > 0 ? '(ventas)' : ''}</span>
              <span className={`font-medium ${efectivoVentas > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                {inicioCaja > 0 ? `${fmt(efectivoVentas)}` : fmt(cierre.efectivo)}
              </span>
            </div>
            {[['Datafono', cierre.datafono], ['Uber', cierre.uber], ['Sinoe Móvil', cierre.sinoe]].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className={`font-medium ${Number(val) > 0 ? 'text-gray-800' : 'text-gray-300'}`}>{fmt(val)}</span>
              </div>
            ))}
            <div className="col-span-2 border-t border-gray-200 pt-2 mt-1 flex justify-between">
              <span className="text-gray-600 font-medium">Total canales</span>
              <span className="font-bold text-gray-900">{fmt(totalCanales)}</span>
            </div>
            {!cuadra && (
              <div className="col-span-2 flex justify-between">
                <span className={diferencia > 0 ? 'text-red-600' : 'text-yellow-600'}>
                  {diferencia > 0 ? 'Faltante' : 'Sobrante'}
                </span>
                <span className={`font-bold ${diferencia > 0 ? 'text-red-700' : 'text-yellow-700'}`}>{fmt(Math.abs(diferencia))}</span>
              </div>
            )}
          </div>
          {cierre.notas && <p className="text-xs text-gray-400 italic mt-3">{cierre.notas}</p>}
        </div>
      )}
    </div>
  )
}

// ── Tab: Cierres diarios ───────────────────────────────────────
function CierresTab() {
  const { cierres, loading, guardarCierre, eliminarCierre } = useCierresDiarios()
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)

  const grupos = useMemo(() => agruparPorSemana(cierres), [cierres])

  async function handleGuardar(data) {
    const { error } = await guardarCierre(data)
    if (!error) { setShowForm(false); setEditando(null) }
    return { error }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este cierre?')) return
    await eliminarCierre(id)
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowForm(true)}><Plus size={15} /> Registrar cierre del día</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : cierres.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          No hay cierres registrados. Comenzá agregando el cierre de hoy.
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(([semana, dias]) => {
            const totalRomana = dias.reduce((s, c) => s + Number(c.romana), 0)
            const royalty = totalRomana * ROYALTY_PCT
            return (
              <div key={semana}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-sm font-semibold text-gray-600">{fmtSemana(semana)}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">Romana semanal: <strong className="text-gray-800">{fmt(totalRomana)}</strong></span>
                    <span className="text-orange-600 font-semibold">Royalty 6%: {fmt(royalty)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {dias.map(c => (
                    <CierreCard
                      key={c.id}
                      cierre={c}
                      onEdit={setEditando}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Registrar cierre del día" size="lg">
        <CierreDiarioForm onSubmit={handleGuardar} onCancel={() => setShowForm(false)} />
      </Modal>

      {editando && (
        <Modal open onClose={() => setEditando(null)} title={`Editar cierre — ${fmtShort(editando.fecha)}`} size="lg">
          <CierreDiarioForm
            inicial={editando}
            onSubmit={handleGuardar}
            onCancel={() => setEditando(null)}
          />
        </Modal>
      )}
    </>
  )
}

// ── Tab: Gastos ────────────────────────────────────────────────
function GastoForm({ onSubmit, onCancel }) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ fecha: hoy, proveedor: '', descripcion: '', monto: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.descripcion.trim()) { setError('La descripción es requerida.'); return }
    if (!form.monto || Number(form.monto) <= 0) { setError('Ingresá un monto válido.'); return }
    setLoading(true)
    const { error } = await onSubmit({
      fecha: form.fecha,
      proveedor: form.proveedor.trim() || null,
      descripcion: form.descripcion.trim(),
      monto: Number(form.monto),
    })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Fecha">
          <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
        </FormField>
        <FormField label="Monto (₡)">
          <Input type="number" min="0" step="0.01" placeholder="0" value={form.monto}
            onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
        </FormField>
      </div>
      <FormField label="Proveedor (opcional)">
        <Input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} placeholder="A quién se le pagó" />
      </FormField>
      <FormField label="Descripción">
        <Input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Qué se compró o pagó" />
      </FormField>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>Registrar gasto</Button>
      </div>
    </form>
  )
}

function GastosTab() {
  const { gastos, loading, crearGasto, eliminarGasto } = useGastosOperativos()
  const [showForm, setShowForm] = useState(false)

  const totalGastos = useMemo(() => gastos.reduce((s, g) => s + Number(g.monto), 0), [gastos])

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este gasto?')) return
    await eliminarGasto(id)
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowForm(true)}><Plus size={15} /> Registrar gasto</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : gastos.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          No hay gastos registrados.
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500">Proveedor</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500">Descripción</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500">Monto</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gastos.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtShort(g.fecha)}</td>
                    <td className="px-4 py-3 text-gray-600">{g.proveedor || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-800">{g.descripcion}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(g.monto)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(g.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-600">Total gastos</td>
                  <td className="px-4 py-3 text-right font-bold text-red-700">{fmt(totalGastos)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Registrar gasto">
        <GastoForm
          onSubmit={async data => {
            const { error } = await crearGasto(data)
            if (!error) setShowForm(false)
            return { error }
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </>
  )
}

// ── Tab: Dashboard ─────────────────────────────────────────────
function DashboardTab() {
  const [periodo, setPeriodo] = useState('semana')
  const hoy = new Date()

  const { desde, hasta } = useMemo(() => {
    const hasta = hoy.toISOString().slice(0, 10)
    let d = new Date(hoy)
    if (periodo === 'semana') d.setDate(d.getDate() - 6)
    else if (periodo === 'mes') d = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    else d = new Date(hoy.getFullYear(), 0, 1)
    return { desde: d.toISOString().slice(0, 10), hasta }
  }, [periodo])

  const { cierres, loading: loadCierres } = useCierresDiarios({ desde, hasta })
  const { gastos, loading: loadGastos } = useGastosOperativos({ desde, hasta })

  const totalRomana  = useMemo(() => cierres.reduce((s, c) => s + Number(c.romana), 0), [cierres])
  const totalGastos  = useMemo(() => gastos.reduce((s, g) => s + Number(g.monto), 0), [gastos])
  const royalty      = totalRomana * ROYALTY_PCT
  const neto         = totalRomana - royalty - totalGastos

  const grupos = useMemo(() => agruparPorSemana(cierres), [cierres])

  const chartData = useMemo(() => {
    const byDay = {}
    cierres.forEach(c => { byDay[c.fecha] = { fecha: fmtShort(c.fecha), Romana: Number(c.romana) } })
    gastos.forEach(g => {
      if (!byDay[g.fecha]) byDay[g.fecha] = { fecha: fmtShort(g.fecha), Romana: 0 }
      byDay[g.fecha].Gastos = (byDay[g.fecha].Gastos ?? 0) + Number(g.monto)
    })
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
  }, [cierres, gastos])

  const loading = loadCierres || loadGastos

  return (
    <>
      <div className="flex gap-2 mb-6">
        {[['semana', 'Últimos 7 días'], ['mes', 'Este mes'], ['año', 'Este año']].map(([id, label]) => (
          <button key={id} onClick={() => setPeriodo(id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${periodo === id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Ventas (Romana)', value: fmt(totalRomana), icon: TrendingUp, color: 'green' },
              { label: 'Royalty franquiciador (6%)', value: fmt(royalty), icon: ShoppingBag, color: 'orange' },
              { label: 'Gastos operativos', value: fmt(totalGastos), icon: TrendingDown, color: 'red' },
              { label: 'Ganancia neta', value: fmt(neto), icon: DollarSign, color: neto >= 0 ? 'blue' : 'orange',
                subtitle: 'Romana − royalty − gastos' },
            ].map(({ label, value, icon: Icon, color, subtitle }) => {
              const cls = { green: 'bg-green-50 border-green-100 text-green-700', red: 'bg-red-50 border-red-100 text-red-700', blue: 'bg-blue-50 border-blue-100 text-blue-700', orange: 'bg-orange-50 border-orange-100 text-orange-700' }[color]
              return (
                <div key={label} className={`rounded-xl border p-4 ${cls}`}>
                  <div className="flex items-center gap-2 mb-2 opacity-70">
                    <Icon size={15} />
                    <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="text-xl font-bold">{value}</p>
                  {subtitle && <p className="text-xs opacity-60 mt-1">{subtitle}</p>}
                </div>
              )
            })}
          </div>

          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-4">Romana vs Gastos por día</p>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={chartData} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₡${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend />
                  <Bar dataKey="Romana" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Royalty semanal */}
          {grupos.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Royalty semanal (6% romana)</p>
              <div className="space-y-2">
                {grupos.map(([semana, dias]) => {
                  const romana = dias.reduce((s, c) => s + Number(c.romana), 0)
                  return (
                    <div key={semana} className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{fmtSemana(semana)}</span>
                      <div className="flex gap-6 text-sm">
                        <span className="text-gray-500">Romana: <strong className="text-gray-800">{fmt(romana)}</strong></span>
                        <span className="text-orange-700 font-semibold">Royalty: {fmt(romana * ROYALTY_PCT)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

// ── Página principal ───────────────────────────────────────────
const TABS = [
  { id: 'dashboard', label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'cierres',   label: 'Cierres diarios', icon: ClipboardList },
  { id: 'gastos',    label: 'Gastos',           icon: TrendingDown },
]

export default function FinanzasPage() {
  const [tab, setTab] = useState('dashboard')
  return (
    <div className="p-6">
      <PageHeader title="Finanzas" subtitle="Cierres diarios, romana, canales y gastos" />
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>
      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'cierres'   && <CierresTab />}
      {tab === 'gastos'    && <GastosTab />}
    </div>
  )
}
