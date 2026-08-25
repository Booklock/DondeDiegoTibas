import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/ui/PageHeader'
import { getFeriadosCR } from '../rrhh/utils/feriados'
import { ChevronLeft, ChevronRight, Users, TrendingDown, BarChart2 } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)
const CCSS_PCT = 0.1083
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function localStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function getMonthRange(year, month) {
  return {
    desde: `${year}-${String(month).padStart(2,'0')}-01`,
    hasta: localStr(new Date(year, month, 0)),
  }
}
function Spinner() {
  return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"/></div>
}

// ── Planilla Tab ──────────────────────────────────────────────────────────────
function PlanillaTab({ year, month }) {
  const [empleados, setEmps] = useState([])
  const [turnos, setTurnos]   = useState([])
  const [loading, setLoading] = useState(true)
  const { desde, hasta } = getMonthRange(year, month)
  const { set: feriadoSet } = getFeriadosCR(year)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('empleados_planilla').select('*').eq('activo', true).order('nombre'),
      supabase.from('turnos_trabajo').select('*').gte('fecha', desde).lte('fecha', hasta),
    ]).then(([{ data: emps }, { data: tur }]) => {
      setEmps(emps ?? [])
      setTurnos(tur ?? [])
      setLoading(false)
    })
  }, [desde, hasta])

  const turnoMap = useMemo(() => {
    const m = {}
    turnos.forEach(t => { m[`${t.empleado_id}-${t.fecha}`] = t })
    return m
  }, [turnos])

  const diasDelMes = useMemo(() => {
    const dias = []
    const fin = new Date(year, month, 0).getDate()
    for (let d = 1; d <= fin; d++) dias.push(localStr(new Date(year, month - 1, d)))
    return dias
  }, [year, month])

  const filas = useMemo(() => empleados.map(emp => {
    const hHora   = emp.salario_base * 7 / (30 * 48)
    const valDia  = emp.salario_base / 30
    let dias_trab = 0, dias_incap = 0, dias_fer = 0
    let hrs_reg = 0, hrs_ot = 0, hrs_fer_n = 0, hrs_fer_ot = 0

    diasDelMes.forEach(d => {
      const t = turnoMap[`${emp.id}-${d}`]
      if (!t || t.es_libre) return
      if (t.incapacitado) { dias_incap++; return }
      const esFer = t.es_feriado || feriadoSet.has(d)
      const h     = Number(t.horas) || 0
      dias_trab++
      if (esFer) {
        dias_fer++
        hrs_fer_n  += Math.min(h, 8)
        hrs_fer_ot += Math.max(0, h - 8)
      } else {
        hrs_reg += Math.min(h, 8)
        hrs_ot  += Math.max(0, h - 8)
      }
    })

    let bruto, monto_extras
    if (emp.tipo_pago === 'quincenal') {
      monto_extras = dias_fer * valDia
      bruto = emp.salario_base + monto_extras - dias_incap * valDia
    } else {
      monto_extras =
        hrs_ot     * hHora * 0.5 +
        hrs_fer_n  * hHora * 1.0 +
        hrs_fer_ot * hHora * 2.0
      bruto =
        hrs_reg    * hHora +
        hrs_ot     * hHora * 1.5 +
        hrs_fer_n  * hHora * 2.0 +
        hrs_fer_ot * hHora * 3.0 -
        dias_incap * valDia
    }
    const ccss = bruto * CCSS_PCT
    return {
      nombre:       emp.nombre,
      tipo_pago:    emp.tipo_pago,
      salario_base: emp.salario_base,
      dias_trab,
      dias_incap,
      dias_fer,
      hrs_total:    emp.tipo_pago === 'semanal' ? Math.round((hrs_reg + hrs_ot + hrs_fer_n + hrs_fer_ot) * 10) / 10 : null,
      hrs_extra:    emp.tipo_pago === 'semanal' ? Math.round((hrs_ot + hrs_fer_ot) * 10) / 10 : null,
      monto_extras: Math.round(monto_extras),
      bruto:        Math.round(bruto),
      ccss:         Math.round(ccss),
      neto:         Math.round(bruto - ccss),
    }
  }), [empleados, turnoMap, diasDelMes, feriadoSet])

  if (loading) return <Spinner />
  if (filas.length === 0) return <p className="text-center text-gray-400 py-16 border border-dashed rounded-xl">No hay empleados activos.</p>

  const totBruto = filas.reduce((s, f) => s + f.bruto, 0)
  const totCCSS  = filas.reduce((s, f) => s + f.ccss,  0)
  const totNeto  = filas.reduce((s, f) => s + f.neto,  0)

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm whitespace-nowrap">
        <thead className="bg-gray-50 border-b border-gray-200 text-xs">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50">Empleado</th>
            <th className="text-center px-3 py-3 font-semibold text-gray-500">Días trab.</th>
            <th className="text-center px-3 py-3 font-semibold text-purple-600">Días feriado</th>
            <th className="text-center px-3 py-3 font-semibold text-gray-500">Horas tot.</th>
            <th className="text-center px-3 py-3 font-semibold text-orange-600">H. extra</th>
            <th className="text-right px-3 py-3 font-semibold text-gray-500">Salario base</th>
            <th className="text-right px-3 py-3 font-semibold text-orange-600">Monto extras</th>
            <th className="text-right px-3 py-3 font-semibold text-gray-700">Bruto</th>
            <th className="text-right px-3 py-3 font-semibold text-red-500">Ded. CCSS</th>
            <th className="text-right px-4 py-3 font-semibold text-brand-600">Total depositado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filas.map(f => (
            <tr key={f.nombre} className="hover:bg-gray-50">
              <td className="px-4 py-3 sticky left-0 bg-white">
                <p className="font-medium text-gray-900">{f.nombre}</p>
                <p className="text-xs text-gray-400 capitalize">{f.tipo_pago}</p>
              </td>
              <td className="px-3 py-3 text-center text-gray-700">{f.dias_trab}</td>
              <td className="px-3 py-3 text-center">
                {f.dias_fer > 0
                  ? <span className="font-semibold text-purple-600">{f.dias_fer}</span>
                  : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-3 py-3 text-center text-gray-600">
                {f.hrs_total != null ? f.hrs_total : <span className="text-gray-400 text-xs">por día</span>}
              </td>
              <td className="px-3 py-3 text-center">
                {f.hrs_extra != null && f.hrs_extra > 0
                  ? <span className="font-semibold text-orange-600">{f.hrs_extra}h</span>
                  : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-3 py-3 text-right text-gray-600">{fmt(f.salario_base)}</td>
              <td className="px-3 py-3 text-right">
                {f.monto_extras > 0
                  ? <span className="font-medium text-orange-600">{fmt(f.monto_extras)}</span>
                  : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-3 py-3 text-right text-gray-800">{fmt(f.bruto)}</td>
              <td className="px-3 py-3 text-right text-red-500">-{fmt(f.ccss)}</td>
              <td className="px-4 py-3 text-right font-bold text-brand-700">{fmt(f.neto)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-gray-200 bg-gray-50 text-sm">
          <tr>
            <td colSpan={7} className="px-4 py-3 font-semibold text-gray-600">TOTALES</td>
            <td className="px-3 py-3 text-right font-semibold text-gray-800">{fmt(totBruto)}</td>
            <td className="px-3 py-3 text-right font-semibold text-red-600">-{fmt(totCCSS)}</td>
            <td className="px-4 py-3 text-right font-bold text-brand-700 text-base">{fmt(totNeto)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── Gastos Tab ────────────────────────────────────────────────────────────────
function GastosTab({ year, month }) {
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const { desde, hasta } = getMonthRange(year, month)

  useEffect(() => {
    setLoading(true)
    supabase.from('gastos_operativos').select('*')
      .gte('fecha', desde).lte('fecha', hasta).order('fecha')
      .then(({ data }) => { setGastos(data ?? []); setLoading(false) })
  }, [desde, hasta])

  const total = gastos.reduce((s, g) => s + Number(g.monto), 0)

  if (loading) return <Spinner />

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-gray-500">Fecha</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500">N° Factura</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500">Proveedor</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500">Descripción</th>
            <th className="text-right px-4 py-3 font-semibold text-gray-500">Monto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {gastos.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No hay gastos registrados para este mes.</td></tr>
          ) : gastos.map(g => (
            <tr key={g.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                {new Date(g.fecha + 'T00:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">
                {g.numero_factura || <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-gray-600">{g.proveedor || <span className="text-gray-300">—</span>}</td>
              <td className="px-4 py-3 text-gray-800">
                {g.descripcion}
                {g.pagado_desde_caja && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">caja</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(g.monto)}</td>
            </tr>
          ))}
        </tbody>
        {gastos.length > 0 && (
          <tfoot className="border-t-2 border-gray-200 bg-gray-50">
            <tr>
              <td colSpan={4} className="px-4 py-3 font-semibold text-gray-600">Total gastos</td>
              <td className="px-4 py-3 text-right font-bold text-red-700 text-base">{fmt(total)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

// ── Ventas Tab ────────────────────────────────────────────────────────────────
function VentasTab({ year, month }) {
  const [cierres, setCierres] = useState([])
  const [loading, setLoading]  = useState(true)
  const { desde, hasta } = getMonthRange(year, month)

  useEffect(() => {
    setLoading(true)
    supabase.from('cierres_diarios').select('*')
      .gte('fecha', desde).lte('fecha', hasta).order('fecha')
      .then(({ data }) => { setCierres(data ?? []); setLoading(false) })
  }, [desde, hasta])

  const totales = useMemo(() => cierres.reduce((acc, c) => {
    const ef = Number(c.efectivo) - Number(c.inicio_caja ?? 0) + Number(c.gastos_caja ?? 0)
    return {
      efectivo:    acc.efectivo    + ef,
      datafono:    acc.datafono    + Number(c.datafono),
      uber:        acc.uber        + Number(c.uber),
      sinpe:       acc.sinpe       + Number(c.sinpe),
      romana:      acc.romana      + Number(c.romana),
      facturacion: acc.facturacion + Number(c.facturacion ?? 0),
    }
  }, { efectivo: 0, datafono: 0, uber: 0, sinpe: 0, romana: 0, facturacion: 0 }), [cierres])

  const totalCanales = totales.efectivo + totales.datafono + totales.uber + totales.sinpe

  if (loading) return <Spinner />

  const canales = [
    { label: 'Efectivo',   value: totales.efectivo,  color: 'green' },
    { label: 'Tarjeta',    value: totales.datafono,  color: 'blue'  },
    { label: 'Uber',       value: totales.uber,       color: 'gray'  },
    { label: 'Sinpe Móvil', value: totales.sinpe, color: 'purple' },
  ]
  const colCls = {
    green:  'bg-green-50  border-green-200  text-green-800',
    blue:   'bg-blue-50   border-blue-200   text-blue-800',
    gray:   'bg-gray-100  border-gray-200   text-gray-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
  }

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {canales.map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${colCls[color]}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-1">{label}</p>
            <p className="text-xl font-bold">{fmt(value)}</p>
            {totalCanales > 0 && (
              <p className="text-xs opacity-50 mt-0.5">{((value / totalCanales) * 100).toFixed(1)}%</p>
            )}
          </div>
        ))}
      </div>

      {/* Resumen */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 text-sm">
        {[
          { label: 'Total ingresos reales (canales)',    value: totalCanales,        bold: true },
          { label: 'Romana (indicador de ventas)',        value: totales.romana,       bold: false },
          { label: 'Facturación del sistema',              value: totales.facturacion, bold: false },
        ].map(({ label, value, bold }) => (
          <div key={label} className="flex justify-between items-center px-4 py-3">
            <span className={bold ? 'font-semibold text-gray-900' : 'text-gray-600'}>{label}</span>
            <span className={bold ? 'font-bold text-gray-900 text-base' : 'font-semibold text-gray-800'}>{fmt(value)}</span>
          </div>
        ))}
      </div>

      {/* Detalle por día */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Fecha</th>
              <th className="text-right px-3 py-3 font-semibold text-green-600">Efectivo</th>
              <th className="text-right px-3 py-3 font-semibold text-blue-600">Tarjeta</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-500">Uber</th>
              <th className="text-right px-3 py-3 font-semibold text-purple-600">Sinpe</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Total día</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cierres.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No hay cierres registrados para este mes.</td></tr>
            ) : cierres.map(c => {
              const ef    = Number(c.efectivo) - Number(c.inicio_caja ?? 0) + Number(c.gastos_caja ?? 0)
              const total = ef + Number(c.datafono) + Number(c.uber) + Number(c.sinpe)
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 capitalize">
                    {new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-700">{ef > 0 ? fmt(ef) : <span className="text-gray-200">—</span>}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{Number(c.datafono) > 0 ? fmt(c.datafono) : <span className="text-gray-200">—</span>}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{Number(c.uber) > 0 ? fmt(c.uber) : <span className="text-gray-200">—</span>}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{Number(c.sinpe) > 0 ? fmt(c.sinpe) : <span className="text-gray-200">—</span>}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(total)}</td>
                </tr>
              )
            })}
          </tbody>
          {cierres.length > 0 && (
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td className="px-4 py-3 font-semibold text-gray-600">TOTAL</td>
                <td className="px-3 py-3 text-right font-semibold text-green-700">{fmt(totales.efectivo)}</td>
                <td className="px-3 py-3 text-right font-semibold text-blue-700">{fmt(totales.datafono)}</td>
                <td className="px-3 py-3 text-right font-semibold text-gray-700">{fmt(totales.uber)}</td>
                <td className="px-3 py-3 text-right font-semibold text-purple-700">{fmt(totales.sinpe)}</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900 text-base">{fmt(totalCanales)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'planilla', label: 'Planilla mensual',   icon: Users        },
  { id: 'gastos',   label: 'Gastos',              icon: TrendingDown },
  { id: 'ventas',   label: 'Ventas por canal',    icon: BarChart2    },
]

export default function ContadoraPage() {
  const hoy = new Date()
  const [year, setYear]   = useState(hoy.getFullYear())
  const [month, setMonth] = useState(hoy.getMonth() + 1)
  const [tab, setTab]     = useState('planilla')

  function navMes(delta) {
    let nm = month + delta, ny = year
    if (nm < 1)  { nm = 12; ny-- }
    if (nm > 12) { nm = 1;  ny++ }
    setMonth(nm); setYear(ny)
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader title="Contadora" subtitle="Reportes mensuales para la contadora" />

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navMes(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18}/></button>
        <div className="text-center min-w-[180px]">
          <p className="font-semibold text-gray-800 text-lg">{MESES[month-1]} {year}</p>
        </div>
        <button onClick={() => navMes(1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18}/></button>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Icon size={15}/>{label}
          </button>
        ))}
      </div>

      {tab === 'planilla' && <PlanillaTab year={year} month={month}/>}
      {tab === 'gastos'   && <GastosTab   year={year} month={month}/>}
      {tab === 'ventas'   && <VentasTab   year={year} month={month}/>}
    </div>
  )
}
