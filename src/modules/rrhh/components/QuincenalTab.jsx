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
  let dias_feriado = 0
  const detalle_feriados = []

  dias.forEach(d => {
    const t = turnoMap[`${emp.id}-${d}`]
    if (!t || t.es_libre || t.incapacitado) return
    if (t.es_feriado || feriadoSet.has(d)) {
      dias_feriado++
      detalle_feriados.push(d)
    }
  })

  const valorDia = (emp.salario_base ?? 0) / 30
  const base = (emp.salario_base ?? 0) / 2
  const recargo_feriado = dias_feriado * valorDia
  const pago = base + recargo_feriado

  return { dias_feriado, detalle_feriados, valorDia, base, recargo_feriado, pago }
}

function ColillaQ({ emp, dias, turnoMap, feriadoSet, ferList, quincenaLabel, onClose }) {
  const { dias_feriado, detalle_feriados, valorDia, base, recargo_feriado, pago } =
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

          {dias_feriado > 0 ? (
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
                <span>Recargo ({dias_feriado} día{dias_feriado > 1 ? 's' : ''})</span>
                <span>+{fmt(recargo_feriado)}</span>
              </div>
              <p className="text-[11px] text-purple-400">Base ya incluye ×1 · recargo agrega el segundo ×1</p>
            </div>
          ) : (
            <p className="text-xs text-center text-gray-400 py-1">Sin feriados trabajados en este período</p>
          )}

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
  const [saving, setSaving]   = useState({})

  const dias = useMemo(() => getDiasQuincena(year, month, quincena), [year, month, quincena])
  const { list: ferList, set: feriadoSet } = useMemo(() => getFeriadosCR(year), [year])
  const feriadosEnPeriodo = useMemo(() => ferList.filter(f => dias.includes(f.fecha)), [ferList, dias])
  const quincenaLabel = `${quincena === 1 ? '1ra quincena' : '2da quincena'} de ${MESES[month-1]} ${year}`

  useEffect(() => {
    supabase.from('empleados_planilla').select('*')
      .eq('activo', true).eq('tipo_pago', 'quincenal').order('nombre')
      .then(({ data }) => setEmps(data ?? []))
  }, [])

  async function reloadTurnos() {
    if (!dias.length) return
    const { data } = await supabase.from('turnos_trabajo').select('*')
      .gte('fecha', dias[0]).lte('fecha', dias[dias.length - 1])
    setTurnos(data ?? [])
  }

  useEffect(() => { reloadTurnos() }, [dias[0], dias[dias.length - 1]])

  const turnoMap = useMemo(() => {
    const m = {}
    turnos.forEach(t => { m[`${t.empleado_id}-${t.fecha}`] = t })
    return m
  }, [turnos])

  async function toggleFeriado(empId, fecha, trabajó) {
    const key = `${empId}-${fecha}`
    setSaving(s => ({ ...s, [key]: true }))
    // Borrar cualquier registro existente
    await supabase.from('turnos_trabajo').delete().eq('empleado_id', empId).eq('fecha', fecha)
    if (trabajó) {
      await supabase.from('turnos_trabajo').insert({
        empleado_id: empId,
        fecha,
        es_feriado: true,
        horas: 8,
        es_libre: false,
        incapacitado: false,
      })
    }
    await reloadTurnos()
    setSaving(s => ({ ...s, [key]: false }))
  }

  function navMes(delta) {
    let nm = month + delta, ny = year
    if (nm < 1) { nm = 12; ny-- }
    if (nm > 12) { nm = 1; ny++ }
    setMonth(nm); setYear(ny)
  }

  return (
    <div>
      {/* Navegación */}
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

      {/* Panel: marcar feriados trabajados */}
      {feriadosEnPeriodo.length > 0 && empleados.length > 0 && (
        <div className="mb-5 border border-purple-200 rounded-xl overflow-hidden">
          <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
            <p className="text-sm font-semibold text-purple-800">¿Quién trabajó los feriados?</p>
            <p className="text-xs text-purple-500 mt-0.5">Tapá el nombre del empleado para marcar que trabajó ese día</p>
          </div>
          <div className="divide-y divide-purple-100">
            {feriadosEnPeriodo.map(f => (
              <div key={f.fecha} className="px-4 py-3">
                <p className="text-sm font-semibold text-purple-700 mb-2">
                  {f.nombre}
                  <span className="ml-2 text-xs font-normal text-purple-400">
                    {new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {empleados.map(emp => {
                    const key = `${emp.id}-${f.fecha}`
                    const worked = !!turnoMap[key]
                    const isSaving = saving[key]
                    return (
                      <button
                        key={emp.id}
                        onClick={() => toggleFeriado(emp.id, f.fecha, !worked)}
                        disabled={isSaving}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          worked
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-500 hover:bg-purple-100 hover:text-purple-700'
                        } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        {worked ? '✓ ' : ''}{emp.nombre}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla resumen */}
      {empleados.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          No hay empleados quincenales. Agregá uno en la pestaña <strong>Planilla</strong> con tipo &ldquo;Quincenal fijo&rdquo;.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Empleado</th>
                <th className="text-center px-3 py-3 font-semibold text-purple-600">Días feriado</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Bruto</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Neto</th>
                <th className="px-2 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empleados.map(emp => {
                const { dias_feriado, valorDia, base, recargo_feriado, pago } = calcPagoQ(emp, dias, turnoMap, feriadoSet)
                const ccss = pago * CCSS_PCT
                return (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{emp.nombre}</p>
                      <p className="text-xs text-gray-400">{fmt(emp.salario_base ?? 0)}/mes · base {fmt(base)}</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {dias_feriado > 0 ? (
                        <div>
                          <span className="inline-block bg-purple-100 text-purple-700 font-semibold text-xs px-2 py-0.5 rounded-full">
                            {dias_feriado} día{dias_feriado > 1 ? 's' : ''}
                          </span>
                          <p className="text-[11px] text-purple-400 mt-0.5">+{fmt(recargo_feriado)}</p>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-700">{fmt(pago)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-brand-700">{fmt(pago - ccss)}</span>
                      <p className="text-[11px] text-gray-400">-CCSS {fmt(ccss)}</p>
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
                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-600">Total quincena</td>
                <td className="px-4 py-3 text-right">
                  {(() => {
                    const totalBruto = empleados.reduce((s, emp) =>
                      s + calcPagoQ(emp, dias, turnoMap, feriadoSet).pago, 0)
                    return (
                      <div>
                        <p className="text-xs text-gray-400">Bruto: {fmt(totalBruto)}</p>
                        <p className="font-bold text-gray-900">{fmt(totalBruto * (1 - CCSS_PCT))}</p>
                      </div>
                    )
                  })()}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        Feriado = salario ÷ 30 × 2. Feriados detectados automáticamente del calendario oficial de Costa Rica.
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
