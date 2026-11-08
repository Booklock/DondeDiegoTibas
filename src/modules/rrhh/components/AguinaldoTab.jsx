import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { supabase, fetchAll } from '../../../lib/supabase'
import { usePlanilla } from '../hooks/usePlanilla'
import { ChevronLeft, ChevronRight, Download, AlertTriangle } from 'lucide-react'
import { diasEntre, feriadosEntre, calcBrutoPeriodo } from '../utils/salarios'
import { periodoAguinaldo, anioAguinaldoActual, diasNaturales, hoyStr } from '../utils/beneficios'

const fmt      = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)
const fmtFecha = d => new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })

export function AguinaldoTab() {
  const { empleados, loading: empLoading } = usePlanilla()
  const [anio, setAnio]       = useState(anioAguinaldoActual)
  const [turnos, setTurnos]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const { desde, hasta } = periodoAguinaldo(anio)
  const hoy   = hoyStr()
  const corte = hasta < hoy ? hasta : hoy   // hasta dónde hay salarios ya devengados
  const enCurso = desde <= hoy && hoy <= hasta
  const futuro  = desde > hoy

  useEffect(() => {
    if (futuro) { setTurnos([]); setLoading(false); return }
    setLoading(true)
    fetchAll(() => supabase.from('turnos_trabajo').select('*')
      .gte('fecha', desde).lte('fecha', corte).order('fecha').order('id'))
      .then(({ data, error: err }) => {
        setError(err ? err.message : '')
        setTurnos(data)
        setLoading(false)
      })
  }, [desde, corte, futuro])

  const turnoMap = useMemo(() => {
    const m = {}
    turnos.forEach(t => { m[`${t.empleado_id}-${t.fecha}`] = t })
    return m
  }, [turnos])

  const filas = useMemo(() => {
    if (futuro) return []
    const feriadoSet = feriadosEntre(desde, corte)
    return empleados.map(emp => {
      const inicio = emp.fecha_ingreso && emp.fecha_ingreso > desde ? emp.fecha_ingreso : desde
      if (inicio > corte) {
        return { emp, inicio, salarios: 0, acumulado: 0, proyeccion: 0 }
      }
      const { bruto } = calcBrutoPeriodo(emp, diasEntre(inicio, corte), turnoMap, feriadoSet)
      const acumulado = bruto / 12
      // Lo que falta del período se estima con el salario base mensual
      const restantes  = corte < hasta ? diasNaturales(corte, hasta) - 1 : 0
      const proyeccion = acumulado + (Number(emp.salario_base) || 0) * restantes / 365
      return { emp, inicio, salarios: bruto, acumulado, proyeccion }
    })
  }, [empleados, turnoMap, desde, hasta, corte, futuro])

  const totAcumulado  = filas.reduce((s, f) => s + f.acumulado, 0)
  const totProyeccion = filas.reduce((s, f) => s + f.proyeccion, 0)
  const sinIngreso    = empleados.filter(e => !e.fecha_ingreso).length

  function handleExport() {
    const rows = filas.map(f => ({
      'Empleado':               f.emp.nombre,
      'Tipo pago':              f.emp.tipo_pago,
      'Cuenta desde':           f.inicio,
      'Salarios brutos':        Math.round(f.salarios),
      'Aguinaldo acumulado':    Math.round(f.acumulado),
      'Proyección al 30 nov':   Math.round(f.proyeccion),
    }))
    rows.push({ 'Empleado': 'TOTAL', 'Aguinaldo acumulado': Math.round(totAcumulado), 'Proyección al 30 nov': Math.round(totProyeccion) })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Aguinaldo')
    XLSX.writeFile(wb, `Aguinaldo_${anio}.xlsx`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setAnio(a => a - 1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
          <div className="text-center min-w-[220px]">
            <p className="font-semibold text-gray-800">Aguinaldo {anio}</p>
            <p className="text-xs text-gray-400">{fmtFecha(desde)} – {fmtFecha(hasta)}</p>
          </div>
          <button onClick={() => setAnio(a => a + 1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
          {anio !== anioAguinaldoActual() && (
            <button onClick={() => setAnio(anioAguinaldoActual())}
              className="text-xs text-brand-600 font-medium px-2 py-1 rounded-lg hover:bg-brand-50">Período actual</button>
          )}
        </div>
        {filas.length > 0 && (
          <button onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors">
            <Download size={14} /> Descargar Excel
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Aguinaldo = suma de salarios brutos (incluye extras y feriados) del 1 dic al 30 nov ÷ 12, sin cargas sociales.
        Para empleados por horas se usan los turnos registrados en la planilla.
        {enCurso && ' La proyección estima lo que falta del período con el salario base.'}
      </p>

      {sinIngreso > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center gap-2">
          <AlertTriangle size={14} />
          {sinIngreso} empleado{sinIngreso !== 1 ? 's' : ''} sin fecha de ingreso: se cuenta desde el inicio del período. Agregala en la pestaña Vacaciones.
        </p>
      )}
      {error && <div className="px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700">{error}</div>}

      {empLoading || loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : futuro ? (
        <p className="text-center text-gray-400 py-12 border border-dashed border-gray-200 rounded-xl">Este período todavía no ha empezado.</p>
      ) : filas.length === 0 ? (
        <p className="text-center text-gray-400 py-12 border border-dashed border-gray-200 rounded-xl">No hay empleados activos.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Empleado</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-500">Cuenta desde</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-500">Salarios brutos</th>
                <th className="text-right px-3 py-3 font-semibold text-brand-600">Aguinaldo {enCurso ? 'a hoy' : ''}</th>
                {enCurso && <th className="text-right px-4 py-3 font-semibold text-gray-600">Proyección al 30 nov</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filas.map(f => (
                <tr key={f.emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{f.emp.nombre}</p>
                    <p className="text-xs text-gray-400 capitalize">{f.emp.tipo_pago}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{fmtFecha(f.inicio)}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{fmt(f.salarios)}</td>
                  <td className="px-3 py-3 text-right font-bold text-brand-700">{fmt(f.acumulado)}</td>
                  {enCurso && <td className="px-4 py-3 text-right text-gray-800">{fmt(f.proyeccion)}</td>}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={3} className="px-4 py-3 font-semibold text-gray-600">TOTAL</td>
                <td className="px-3 py-3 text-right font-bold text-brand-700">{fmt(totAcumulado)}</td>
                {enCurso && <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(totProyeccion)}</td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
