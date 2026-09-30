import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { FormField, Input } from '../../components/ui/FormField'
import {
  Trophy, ChevronLeft, ChevronRight, Save, Eye, PenLine,
  Download, FileText, Share2, Plus, Edit2, Hash
} from 'lucide-react'
import { renderRanking, canvasToBlob, canvasToPdfBlob, descargarBlob, compartirBlob } from './utils/exportar'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function addDays(str, n) {
  const d = new Date(str + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}
function lunesDe(d) {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return toDateStr(x)
}
function fmtDia(str, opts) {
  return new Date(str + 'T00:00:00').toLocaleDateString('es-CR', opts)
}
function semanaLabel(lunes) {
  const dom = addDays(lunes, 6)
  return `Semana del ${fmtDia(lunes, { day: 'numeric', month: 'short' })} al ${fmtDia(dom, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

/** Ranking con empates: mismo total → misma posición. */
function calcularRanking(vendedores, ventas) {
  const totales = {}
  ventas.forEach(v => { totales[v.vendedor_id] = (totales[v.vendedor_id] ?? 0) + Number(v.monto) })
  const filas = vendedores
    .filter(v => v.activo || totales[v.id])
    .map(v => ({ id: v.id, nombre: v.nombre, codigo: v.codigo, total: totales[v.id] ?? 0 }))
    .sort((a, b) => b.total - a.total || a.codigo - b.codigo)
  const max = filas[0]?.total ?? 0
  let posicion = 0
  let anterior = null
  return filas.map((f, i) => {
    if (f.total !== anterior) { posicion = i + 1; anterior = f.total }
    return { ...f, posicion, diferencia: max - f.total }
  })
}

// ── Registrar ventas ─────────────────────────────────────────────────────────

function RegistrarTab({ lunes, vendedores, ventas, onSaved }) {
  const hoy = toDateStr(new Date())
  const [diaIdx, setDiaIdx]       = useState(0)
  const [valores, setValores]     = useState({})
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg]             = useState('')

  useEffect(() => {
    const idx = [0,1,2,3,4,5,6].find(i => addDays(lunes, i) === hoy)
    setDiaIdx(idx ?? 0)
  }, [lunes, hoy])

  const fecha   = addDays(lunes, diaIdx)
  const activos = vendedores.filter(v => v.activo)

  useEffect(() => {
    const init = {}
    ventas.filter(v => v.fecha === fecha).forEach(v => { init[v.vendedor_id] = String(Number(v.monto)) })
    setValores(init)
  }, [fecha, ventas])

  const acumulado = useMemo(() => {
    const t = {}
    ventas.forEach(v => { t[v.vendedor_id] = (t[v.vendedor_id] ?? 0) + Number(v.monto) })
    return t
  }, [ventas])

  const totalDia = activos.reduce((s, v) => s + (parseFloat(valores[v.id]) || 0), 0)

  async function handleGuardar() {
    setGuardando(true)
    setMsg('')
    const existentes = ventas.filter(v => v.fecha === fecha)
    const upserts = []
    const borrar  = []
    activos.forEach(v => {
      const raw = (valores[v.id] ?? '').trim()
      const n   = parseFloat(raw)
      if (raw === '' || isNaN(n)) {
        const ex = existentes.find(e => e.vendedor_id === v.id)
        if (ex) borrar.push(ex.id)
      } else {
        upserts.push({ vendedor_id: v.id, fecha, monto: Math.max(0, n), updated_at: new Date().toISOString() })
      }
    })
    const ops = []
    if (upserts.length) ops.push(supabase.from('ventas_competencia').upsert(upserts, { onConflict: 'vendedor_id,fecha' }))
    if (borrar.length)  ops.push(supabase.from('ventas_competencia').delete().in('id', borrar))
    const res = await Promise.all(ops)
    const err = res.find(r => r.error)?.error
    setGuardando(false)
    setMsg(err ? `Error: ${err.message}` : `Ventas del ${fmtDia(fecha, { weekday: 'long', day: 'numeric', month: 'short' })} guardadas.`)
    setTimeout(() => setMsg(''), 4000)
    if (!err) onSaved()
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-7 gap-1.5">
        {DIAS.map((d, i) => {
          const f = addDays(lunes, i)
          const tieneVentas = ventas.some(v => v.fecha === f)
          return (
            <button key={d} onClick={() => setDiaIdx(i)}
              className={`relative rounded-xl py-2 text-center transition-colors border ${
                i === diaIdx ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300'
              }`}>
              <span className="block text-xs font-semibold">{d}</span>
              <span className={`block text-[11px] ${i === diaIdx ? 'text-red-100' : 'text-gray-400'}`}>{fmtDia(f, { day: 'numeric' })}</span>
              {tieneVentas && (
                <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${i === diaIdx ? 'bg-white' : 'bg-green-500'}`} />
              )}
            </button>
          )
        })}
      </div>

      <p className="text-sm text-gray-500">
        Ingresá la venta de cada vendedor para el <strong className="text-gray-800">{fmtDia(fecha, { weekday: 'long', day: 'numeric', month: 'long' })}</strong>.
        Dejá vacío si no vendió.
      </p>

      {activos.length === 0 ? (
        <p className="text-center text-gray-400 py-10 border border-dashed border-gray-200 rounded-xl text-sm">
          No hay vendedores activos. Agregálos en la pestaña “Vendedores”.
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {activos.map(v => (
            <div key={v.id} className="flex items-center gap-3 px-4 py-3">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-brand-50 text-brand-700 font-bold text-sm shrink-0">
                {v.codigo}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{v.nombre}</p>
                <p className="text-xs text-gray-400">Acumulado: {fmt(acumulado[v.id])}</p>
              </div>
              <div className="relative w-36 shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₡</span>
                <input
                  type="number" inputMode="decimal" min="0" step="1"
                  value={valores[v.id] ?? ''}
                  onChange={e => setValores(s => ({ ...s, [v.id]: e.target.value }))}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-b-xl">
            <span className="text-sm font-semibold text-gray-600">Total del día</span>
            <span className="text-sm font-bold text-gray-900">{fmt(totalDia)}</span>
          </div>
        </div>
      )}

      {msg && (
        <div className={`px-4 py-2 rounded-xl text-sm ${msg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {msg}
        </div>
      )}

      {activos.length > 0 && (
        <Button onClick={handleGuardar} loading={guardando} className="w-full justify-center">
          <Save size={16} /> Guardar ventas del día
        </Button>
      )}
    </div>
  )
}

// ── Exportar (PNG / PDF / compartir) ─────────────────────────────────────────

function ExportarBotones({ modo, lunes, ranking }) {
  const [trabajando, setTrabajando] = useState('')
  const [error, setError]           = useState('')
  const base = `competencia-${modo}-${lunes}`

  async function generar(tipo) {
    setTrabajando(tipo)
    setError('')
    try {
      const canvas = await renderRanking({ modo, semanaLabel: semanaLabel(lunes), ranking })
      if (tipo === 'png') {
        descargarBlob(await canvasToBlob(canvas), `${base}.png`)
      } else if (tipo === 'pdf') {
        descargarBlob(await canvasToPdfBlob(canvas), `${base}.pdf`)
      } else {
        const blob = await canvasToBlob(canvas)
        const ok = await compartirBlob(blob, `${base}.png`, 'Competencia de ventas')
        if (!ok) descargarBlob(blob, `${base}.png`)
      }
    } catch (e) {
      setError(e?.message ?? 'No se pudo generar el archivo.')
    }
    setTrabajando('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => generar('png')} loading={trabajando === 'png'}>
          <Download size={14} /> Imagen
        </Button>
        <Button size="sm" variant="secondary" onClick={() => generar('pdf')} loading={trabajando === 'pdf'}>
          <FileText size={14} /> PDF
        </Button>
        <Button size="sm" onClick={() => generar('share')} loading={trabajando === 'share'}>
          <Share2 size={14} /> Compartir
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

function Medalla({ posicion }) {
  const colores = {
    1: 'bg-yellow-400 text-white',
    2: 'bg-gray-400 text-white',
    3: 'bg-amber-600 text-white',
  }
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm shrink-0 ${colores[posicion] ?? 'bg-brand-50 text-brand-700'}`}>
      {posicion}
    </span>
  )
}

// ── Vista manager ────────────────────────────────────────────────────────────

function ManagerTab({ lunes, ranking, ventas }) {
  const porDia = useMemo(() => {
    const m = {}
    ventas.forEach(v => { m[`${v.vendedor_id}|${v.fecha}`] = Number(v.monto) })
    return m
  }, [ventas])
  const totalSemana = ranking.reduce((s, r) => s + r.total, 0)
  const hayVentas   = totalSemana > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Total vendido en la semana</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(totalSemana)}</p>
        </div>
        <ExportarBotones modo="manager" lunes={lunes} ranking={ranking} />
      </div>

      {!hayVentas ? (
        <p className="text-center text-gray-400 py-10 border border-dashed border-gray-200 rounded-xl text-sm">
          Todavía no hay ventas registradas esta semana.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {ranking.map(r => (
              <div key={r.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                r.posicion === 1 ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'
              }`}>
                <Medalla posicion={r.posicion} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {r.nombre} <span className="text-xs font-normal text-gray-400">#{r.codigo}</span>
                  </p>
                  {r.posicion !== 1 && (
                    <p className="text-xs text-gray-500">A {fmt(r.diferencia)} del 1er lugar</p>
                  )}
                </div>
                <p className="font-bold text-brand-700 shrink-0">{fmt(r.total)}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2 text-sm">Detalle por día</h3>
            <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500">
                    <th className="text-left font-semibold px-3 py-2 sticky left-0 bg-gray-50">Vendedor</th>
                    {DIAS.map((d, i) => (
                      <th key={d} className="text-right font-semibold px-3 py-2 whitespace-nowrap">
                        {d} {fmtDia(addDays(lunes, i), { day: 'numeric' })}
                      </th>
                    ))}
                    <th className="text-right font-semibold px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ranking.map(r => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap sticky left-0 bg-white">
                        {r.nombre} <span className="text-gray-400">#{r.codigo}</span>
                      </td>
                      {DIAS.map((d, i) => {
                        const m = porDia[`${r.id}|${addDays(lunes, i)}`]
                        return (
                          <td key={d} className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">
                            {m != null ? fmt(m) : <span className="text-gray-300">—</span>}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-right font-bold text-gray-900 whitespace-nowrap">{fmt(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Vista empleados ──────────────────────────────────────────────────────────

function EmpleadoTab({ lunes, ranking }) {
  const hayVentas = ranking.some(r => r.total > 0)
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500 max-w-md">
          Esta vista no muestra montos vendidos, solo cuántos colones le faltan a cada quien para alcanzar el primer lugar.
          Descargala o compartila para enviarla al grupo.
        </p>
        <ExportarBotones modo="empleado" lunes={lunes} ranking={ranking} />
      </div>

      {!hayVentas ? (
        <p className="text-center text-gray-400 py-10 border border-dashed border-gray-200 rounded-xl text-sm">
          Todavía no hay ventas registradas esta semana.
        </p>
      ) : (
        <div className="space-y-2">
          {ranking.map(r => (
            <div key={r.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
              r.posicion === 1 ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'
            }`}>
              <Medalla posicion={r.posicion} />
              <p className="flex-1 min-w-0 font-semibold text-gray-900 truncate">{r.nombre}</p>
              {r.posicion === 1 ? (
                <p className="flex items-center gap-1.5 font-bold text-yellow-700 shrink-0">
                  <Trophy size={16} /> ¡Primer lugar!
                </p>
              ) : (
                <div className="text-right shrink-0">
                  <p className="font-bold text-brand-700">− {fmt(r.diferencia)}</p>
                  <p className="text-[11px] text-gray-400">para el 1er lugar</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Vendedores (códigos de romana) ───────────────────────────────────────────

function VendedoresTab({ vendedores, onSaved }) {
  const [modal, setModal]   = useState(null) // null | {} (nuevo) | vendedor
  const [form, setForm]     = useState({ codigo: '', nombre: '' })
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  function abrir(v) {
    setModal(v ?? {})
    setForm({ codigo: v?.codigo ?? '', nombre: v?.nombre ?? '' })
    setError('')
  }

  function mensajeError(err) {
    return err.code === '23505'
      ? 'Ese código ya lo tiene otro vendedor activo. Cambiá o desactivá el otro primero.'
      : err.message
  }

  async function handleGuardar() {
    const codigo = parseInt(form.codigo, 10)
    const nombre = form.nombre.trim()
    if (isNaN(codigo) || !nombre) { setError('Código y nombre son obligatorios.'); return }
    setSaving(true)
    const q = modal.id
      ? supabase.from('ventas_vendedores').update({ codigo, nombre }).eq('id', modal.id)
      : supabase.from('ventas_vendedores').insert({ codigo, nombre })
    const { error: err } = await q
    setSaving(false)
    if (err) { setError(mensajeError(err)); return }
    setModal(null)
    onSaved()
  }

  async function toggleActivo(v) {
    const { error: err } = await supabase.from('ventas_vendedores').update({ activo: !v.activo }).eq('id', v.id)
    if (err) { alert(mensajeError(err)); return }
    onSaved()
  }

  const ordenados = [...vendedores].sort((a, b) => (b.activo - a.activo) || a.codigo - b.codigo)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500 max-w-md">
          Cada vendedor se identifica con su código de la romana. Si el código cambia, editalo aquí: el historial de ventas se conserva.
        </p>
        <Button size="sm" onClick={() => abrir(null)}>
          <Plus size={14} /> Nuevo vendedor
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {ordenados.map(v => (
          <div key={v.id} className={`flex items-center gap-3 px-4 py-3 ${v.activo ? '' : 'opacity-50'}`}>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-brand-50 text-brand-700 font-bold text-sm shrink-0">
              {v.codigo}
            </span>
            <p className="flex-1 min-w-0 font-medium text-gray-900 text-sm truncate">
              {v.nombre}
              {!v.activo && <span className="ml-2 text-xs text-gray-400">(inactivo)</span>}
            </p>
            <button onClick={() => toggleActivo(v)}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-100">
              {v.activo ? 'Desactivar' : 'Activar'}
            </button>
            <button onClick={() => abrir(v)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
              <Edit2 size={15} />
            </button>
          </div>
        ))}
        {ordenados.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">No hay vendedores.</p>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal?.id ? 'Editar vendedor' : 'Nuevo vendedor'} size="sm">
        <div className="space-y-4">
          <FormField label="Código de la romana">
            <Input type="number" inputMode="numeric" min="0" value={form.codigo}
              onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ej: 3" />
          </FormField>
          <FormField label="Nombre">
            <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Taylor" />
          </FormField>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={handleGuardar} loading={saving}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'registrar',  label: 'Registrar',  icon: PenLine },
  { id: 'manager',    label: 'Manager',    icon: Trophy },
  { id: 'empleados',  label: 'Empleados',  icon: Eye },
  { id: 'vendedores', label: 'Vendedores', icon: Hash },
]

export default function CompetenciaPage() {
  const [tab, setTab]               = useState('registrar')
  const [lunes, setLunes]           = useState(() => lunesDe(new Date()))
  const [vendedores, setVendedores] = useState([])
  const [ventas, setVentas]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  const cargar = useCallback(async () => {
    const [vRes, sRes] = await Promise.all([
      supabase.from('ventas_vendedores').select('*').order('codigo'),
      supabase.from('ventas_competencia').select('id, vendedor_id, fecha, monto')
        .gte('fecha', lunes).lte('fecha', addDays(lunes, 6)),
    ])
    const err = vRes.error ?? sRes.error
    setError(err ? `No se pudieron cargar los datos: ${err.message}. ¿Corriste la migración v26?` : '')
    setVendedores(vRes.data ?? [])
    setVentas(sRes.data ?? [])
    setLoading(false)
  }, [lunes])

  useEffect(() => { cargar() }, [cargar])

  const ranking   = useMemo(() => calcularRanking(vendedores, ventas), [vendedores, ventas])
  const esActual  = lunes === lunesDe(new Date())

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <PageHeader
        title="Competencia de ventas"
        subtitle="Ventas acumuladas de lunes a domingo por vendedor"
      />

      <div className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-2 py-2 mb-5">
        <button onClick={() => setLunes(l => addDays(l, -7))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Semana anterior">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900">{semanaLabel(lunes)}</p>
          {esActual
            ? <p className="text-xs text-green-600 font-medium">Semana en curso</p>
            : <button onClick={() => setLunes(lunesDe(new Date()))} className="text-xs text-brand-600 font-medium hover:underline">Ir a la semana actual</button>}
        </div>
        <button onClick={() => setLunes(l => addDays(l, 7))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Semana siguiente">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'registrar'  && <RegistrarTab lunes={lunes} vendedores={vendedores} ventas={ventas} onSaved={cargar} />}
          {tab === 'manager'    && <ManagerTab lunes={lunes} ranking={ranking} ventas={ventas} />}
          {tab === 'empleados'  && <EmpleadoTab lunes={lunes} ranking={ranking} />}
          {tab === 'vendedores' && <VendedoresTab vendedores={vendedores} onSaved={cargar} />}
        </>
      )}
    </div>
  )
}
