import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { ChevronLeft, ChevronRight, FileText, X } from 'lucide-react'
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

function calcPagoQ(emp, dias, turnoMap, feriadoSet) {
  let dias_regulares = 0
  let dias_feriado = 0
  const detalle_feriados = []

  dias.forEach(d => {
    const t = turnoMap[`${emp.id}-${d}`]
    if (!t || t.es_libre || t.incapacitado) return
    if (t.es_feriado || feriadoSet.has(d)) {
      dias_feriado++
      detalle_feriados.push(d)
    } else {
      dias_regulares++
    }
  })

  const valorDia = (emp.salario_base ?? 0) / 30
  const base = (emp.salario_base ?? 0) / 2
  // El feriado ya está cubierto en la base (×1); el recargo es el segundo ×1 para llegar a ×2 total
  const recargo_feriado = dias_feriado * valorDia
  const pago = base + recargo_feriado

  return { dias_regulares, dias_feriado, detalle_feriados, valorDia, base, recargo_feriado, pago }
}

function ColillaQ({ emp, dias, turnoMap, feriadoSet, ferList, quincenaLabel, onClose }) {
  const { dias_regulares, dias_feriado, detalle_feriados, valorDia, base, recargo_feriado, pago } =
    calcPagoQ(emp, dias, turnoMap, feriadoSet)
  const ccss = pago * CCSS_PCT
  const neto = pago - ccss

  const ferNombres = Object.fromEntries(ferList.map(f => [f.fecha, f.nombre]))

  function fmtDia(fechaStr) {
    const d = new Date(fechaStr + 'T00:00:00')
    return d.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        {/* Encabezado boleta */}
        <div className="bg-brand-600 rounded-t-2xl px-6 py-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium opacity-75 uppercase tracking-wide">Boleta de pago</p>
              <h3 className="font-bold text-lg mt-0.5">{emp.nombre}</h3>
              <p className="text-xs opacity-75 mt-1">{quincenaLabel}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
              <X size={16}/>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Salario base */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Salario mensual</span>
              <span>{fmt(emp.salario_base ?? 0)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Valor día (÷ 30)</span>
              <span>{fmt(valorDia)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-800 border-t pt-1.5">
              <span>Base quincena (÷ 2)</span>
              <span>{fmt(base)}</span>
            </div>
          </div>

          {/* Feriados */}
          {dias_feriado > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Feriados trabajados</p>
              {detalle_feriados.map(f => (
                <div key={f} className="flex justify-between text-sm">
                  <span className="text-purple-700">
                    {fmtDia(f)}
                    {ferNombres[f] && <span className="text-purple-400 ml-1">— {ferNombres[f]}</span>}
                  </span>
                  <span className="font-medium text-purple-800">× 2 = {fmt(valorDia * 2)}</span>
                </div>
              ))}
              <div className="border-t border-purple-200 pt-1.5 flex justify-between text-sm font-semibold text-purple-800">
                <span>Recargo feriados ({dias_feriado} día{dias_feriado > 1 ? 's' : ''})</span>
                <span>+{fmt(recargo_feriado)}</span>
              </div>
              <p className="text-[11px] text-purple-400">Base ya incluye ×1 · Recargo agrega el ×2</p>
            </div>
          )}

          {/* Totales */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between font-semibold text-gray-800 border-t pt-1.5">
              <span>Salario bruto</span>
              <span>{fmt(pago)}</span>
            </div>
            <div className="flex justify-between text-red-500">
              <span>Deducción CCSS (10.83%)</span>
              <span>-{fmt(ccss)}</span>
            </div>
          </div>

          <div className="bg-brand-50 rounded-xl p-4 flex justify-between items-center">
            <span className="font-bold text-brand-800">Neto a pagar</span>
            <span className="font-bold text-brand-700 text-xl">{fmt(neto)}</span>
          </div>

          {dias_feriado === 0 && (
            <p className="text-xs text-center text-gray-400">Sin feriados trabajados en este período</p>
          )}
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

  const quincenaLabel = `${quincena === 1 ? '1ra quincena' : '2da quincena'} de ${MESES[month-1]} ${year}`

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

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navMes(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18}/></button>
          <div className="text-center min-w-[200px]">
            <p className="font-semibold text-gray-800">{quincenaLabel}</p>
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
                <th className="text-center px-2 py-3 text-xs font-semibold text-purple-600 min-w-[55px]">Fer.</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 min-w-[150px]">Bruto / Neto</th>
                <th className="px-2 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empleados.map(emp => {
                const { dias_feriado, base, pago } = calcPagoQ(emp, dias, turnoMap, feriadoSet)
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
                      const tiene = t && !esLibre && !t.incapacitado
                      return (
                        <td key={d} className={`px-0.5 py-1 text-center text-xs ${
                          esFer && tiene ? 'bg-purple-50' : ''
                        }`}>
                          {esLibre
                            ? <span className="text-green-400">L</span>
                            : tiene
                              ? <span className={`font-medium ${esFer ? 'text-purple-600' : 'text-gray-700'}`}>✓</span>
                              : <span className="text-gray-200">—</span>}
                        </td>
                      )
                    })}
                    <td className="px-2 py-3 text-center">
                      {dias_feriado > 0
                        ? <span className="text-purple-600 font-semibold text-xs">{dias_feriado}d</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-gray-400">{fmt(pago)}</span>
                      {dias_feriado > 0 && <span className="text-[10px] text-purple-400 ml-1">+fer.</span>}
                      <p className="font-bold text-brand-700">{fmt(pago * (1 - CCSS_PCT))}</p>
                      <p className="text-[10px] text-gray-400">-CCSS {fmt(pago * CCSS_PCT)}</p>
                    </td>
                    <td className="px-2 py-3">
                      <button
                        onClick={() => setColilla({ emp })}
                        className="p-1.5 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Ver boleta de pago">
                        <FileText size={13} className="text-brand-500"/>
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
        Feriado = salario ÷ 30 × 2. Morado = feriado. L = día libre. ✓ = día trabajado.
      </p>

      {colilla && (
        <ColillaQ
          emp={colilla.emp}
          dias={dias}
          turnoMap={turnoMap}
          feriadoSet={feriadoSet}
          ferList={ferList}
          quincenaLabel={quincenaLabel}
          onClose={() => setColilla(null)}
        />
      )}
    </div>
  )
}
