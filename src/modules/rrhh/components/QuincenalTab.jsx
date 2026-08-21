import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { getFeriadosCR } from '../utils/feriados'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n)
const CCSS_PCT = 0.1083
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function localStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getDiasQuincena(year, month, quincena) {
  const dias = []
  if (quincena === 1) {
    for (let d = 1; d <= 15; d++) dias.push(localStr(new Date(year, month - 1, d)))
  } else {
    const fin = new Date(year, month, 0).getDate()
    for (let d = 16; d <= fin; d++) dias.push(localStr(new Date(year, month - 1, d)))
  }
  return dias
}

function hHoraEmp(emp) {
  return (emp.salario_base ?? 0) * 7 / (30 * 48)
}

function calcPagoQ(emp, dias, turnoMap, feriadoSet) {
  let hrs_regular = 0
  let hrs_feriado_normal = 0
  let hrs_feriado_ot = 0
  dias.forEach(d => {
    const t = turnoMap[`${emp.id}-${d}`]
    if (!t || t.es_libre || t.incapacitado) return
    const h = Number(t.horas) || 0
    if (t.es_feriado || feriadoSet.has(d)) {
      hrs_feriado_normal += Math.min(h, 8)
      hrs_feriado_ot += Math.max(0, h - 8)
    } else {
      hrs_regular += h
    }
  })
  const hh = hHoraEmp(emp)
  const base = (emp.salario_base ?? 0) / 2
  const pago = base
    + hrs_feriado_normal * hh      // +×1 feriado (total ×2)
    + hrs_feriado_ot * hh * 2      // +×2 OT feriado (total ×3)
  return { hrs_regular, hrs_feriado_normal, hrs_feriado_ot, base, pago }
}

function fmtTime(t) { return t ? t.slice(0,5) : '—' }

function ColillaQ({ emp, dias, turnoMap, feriadoSet, onClose }) {
  const { hrs_regular, hrs_feriado_normal, hrs_feriado_ot, base, pago } = calcPagoQ(emp, dias, turnoMap, feriadoSet)
  const hh = hHoraEmp(emp)
  const ccss = pago * CCSS_PCT
  const neto = pago - ccss

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">{emp.nombre}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16}/></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">{dias[0]} → {dias[dias.length-1]}</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Salario base quincena</span>
            <span className="font-medium">{fmt(base)}</span>
          </div>
          {hrs_feriado_normal > 0 && (
            <div className="flex justify-between text-purple-700">
              <span>{hrs_feriado_normal}h feriado (×2) → recargo</span>
              <span>+{fmt(hrs_feriado_normal * hh)}</span>
            </div>
          )}
          {hrs_feriado_ot > 0 && (
            <div className="flex justify-between text-red-600">
              <span>{hrs_feriado_ot}h feriado OT (×3) → recargo</span>
              <span>+{fmt(hrs_feriado_ot * hh * 2)}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Bruto</span><span>{fmt(pago)}</span>
          </div>
          <div className="flex justify-between text-red-500">
            <span>CCSS (10.83%)</span><span>-{fmt(ccss)}</span>
          </div>
          <div className="bg-brand-50 rounded-xl p-3 flex justify-between font-bold text-brand-700 text-base">
            <span>Neto a pagar</span><span>{fmt(neto)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function QuincenalTab() {
  const hoy = new Date()
  const [year, setYear]       = useState(hoy.getFullYear())
  const [month, setMonth]     = useState(hoy.getMonth() + 1)
  const [quincena, setQ]      = useState(hoy.getDate() <= 15 ? 1 : 2)
  const [empleados, setEmps]  = useState([])
  const [turnos, setTurnos]   = useState([])
  const [colilla, setColilla] = useState(null)

  const dias = useMemo(() => getDiasQuincena(year, month, quincena), [year, month, quincena])
  const { list: ferList, set: feriadoSet } = useMemo(() => getFeriadosCR(year), [year])
  const feriadosEnPeriodo = useMemo(() => ferList.filter(f => dias.includes(f.fecha)), [ferList, dias])

  useEffect(() => {
    supabase.from('empleados_planilla').select('*')
      .eq('activo', true).eq('tipo_pago', 'quincenal').order('nombre')
      .then(({ data }) => setEmps(data ?? []))
  }, [])

  useEffect(() => {
    if (!dias.length) return
    supabase.from('turnos_trabajo').select('*')
      .gte('fecha', dias[0]).lte('fecha', dias[dias.length - 1])
      .then(({ data }) => setTurnos(data ?? []))
  }, [dias[0], dias[dias.length - 1]])

  const turnoMap = useMemo(() => {
    const m = {}
    turnos.forEach(t => { m[`${t.empleado_id}-${t.fecha}`] = { ...t, horas: Number(t.horas) } })
    return m
  }, [turnos])

  function navMes(delta) {
    let nm = month + delta, ny = year
    if (nm < 1) { nm = 12; ny-- }
    if (nm > 12) { nm = 1; ny++ }
    setMonth(nm); setYear(ny)
  }

  const titulo = `${quincena === 1 ? '1ra quincena' : '2da quincena'} de ${MESES[month-1]} ${year}`

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navMes(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18}/></button>
          <div className="text-center min-w-[200px]">
            <p className="font-semibold text-gray-800">{titulo}</p>
            <p className="text-xs text-gray-400">{dias[0]} → {dias[dias.length-1]}</p>
          </div>
          <button onClick={() => navMes(1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18}/></button>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[1,2].map(q => (
            <button key={q} onClick={() => setQ(q)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                quincena === q ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {q === 1 ? '1ra (1–15)' : '2da (16–fin)'}
            </button>
          ))}
        </div>
      </div>

      {feriadosEnPeriodo.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-purple-700">Feriados en este período:</span>
          {feriadosEnPeriodo.map(f => (
            <span key={f.fecha} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              {f.nombre} ({f.fecha.slice(8)}/{f.fecha.slice(5,7)})
            </span>
          ))}
        </div>
      )}

      {empleados.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          No hay empleados quincenales. Agregá uno en la pestaña <strong>Planilla</strong> con tipo &ldquo;Quincenal fijo&rdquo;.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[160px]">Empleado</th>
                {dias.map(d => {
                  const dd = d.slice(8)
                  const esFer = feriadoSet.has(d)
                  return (
                    <th key={d} className={`text-center px-1 py-2 min-w-[40px] text-xs font-medium ${
                      esFer ? 'text-purple-600 bg-purple-50' : 'text-gray-500'
                    }`}>{dd}</th>
                  )
                })}
                <th className="text-center px-2 py-3 text-xs font-semibold text-purple-600 min-w-[55px]">h fer.</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 min-w-[150px]">Bruto / Neto</th>
                <th className="px-2 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empleados.map(emp => {
                const { hrs_feriado_normal, hrs_feriado_ot, base, pago } = calcPagoQ(emp, dias, turnoMap, feriadoSet)
                const hrsFer = hrs_feriado_normal + hrs_feriado_ot
                return (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 sticky left-0 bg-white">
                      <p className="font-medium text-gray-900">{emp.nombre}</p>
                      <p className="text-xs text-gray-400">{fmt(emp.salario_base ?? 0)}/mes · base {fmt(base)}</p>
                    </td>
                    {dias.map(d => {
                      const t = turnoMap[`${emp.id}-${d}`]
                      const esFer = t?.es_feriado || feriadoSet.has(d)
                      const esLibre = t?.es_libre
                      const h = t && !esLibre ? Number(t.horas) : null
                      return (
                        <td key={d} className={`px-0.5 py-1 text-center text-xs ${
                          esFer && h ? 'bg-purple-50' : ''
                        }`}>
                          {esLibre
                            ? <span className="text-green-400">L</span>
                            : h
                              ? <span className={`font-medium ${ esFer ? 'text-purple-600' : 'text-gray-700'}`}>{h}</span>
                              : <span className="text-gray-200">—</span>}
                        </td>
                      )
                    })}
                    <td className="px-2 py-3 text-center">
                      {hrsFer > 0
                        ? <span className="text-purple-600 font-semibold text-xs">{hrsFer}h</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-gray-400">{fmt(pago)}</span>
                      {hrsFer > 0 && <span className="text-[10px] text-purple-400 ml-1">+feriado</span>}
                      <p className="font-bold text-brand-700">{fmt(pago * (1 - CCSS_PCT))}</p>
                      <p className="text-[10px] text-gray-400">-CCSS {fmt(pago * CCSS_PCT)}</p>
                    </td>
                    <td className="px-2 py-3">
                      <button
                        onClick={() => setColilla({ emp, dias, turnoMap, feriadoSet })}
                        className="p-1.5 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Colilla de pago">
                        <Clock size={13} className="text-brand-500"/>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td className="px-4 py-3 text-xs font-semibold text-gray-500 sticky left-0 bg-gray-50"
                  colSpan={dias.length + 1}>Total quincena</td>
                <td colSpan={3} className="px-4 py-3 text-right">
                  {(() => {
                    const totalBruto = empleados.reduce((s, emp) =>
                      s + calcPagoQ(emp, dias, turnoMap, feriadoSet).pago, 0)
                    return totalBruto > 0 ? (
                      <div>
                        <p className="text-xs text-gray-400">Bruto: {fmt(totalBruto)}</p>
                        <p className="font-bold text-gray-900">Total neto: {fmt(totalBruto * (1 - CCSS_PCT))}</p>
                      </div>
                    ) : null
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        Feriados detectados automáticamente del calendario oficial de Costa Rica. Morado = feriado. L = día libre. Los turnos se registran desde la pestaña Planilla.
      </p>

      {colilla && (
        <ColillaQ
          emp={colilla.emp}
          dias={colilla.dias}
          turnoMap={colilla.turnoMap}
          feriadoSet={colilla.feriadoSet}
          onClose={() => setColilla(null)}
        />
      )}
    </div>
  )
}
