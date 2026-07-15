import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { Button } from '../../../components/ui/Button'
import { Printer, Mail, X } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'short' }) : '—'
const fmtShort = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) : '—'
const fmtTime = t => t ? t.slice(0, 5) : '—'

const HORAS_STD = 8
const CCSS_PCT  = 0.1083  // 10.83% empleado

const DIAS_NOMBRES_ES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

// Salario hora efectiva desde salario base mensual
function salarioHora(emp) {
  return (emp.salario_base ?? emp.salario_hora ?? 0) / 4.33 / 48
}

function buildFilas(emp, dias, turnoMap) {
  const hHora = salarioHora(emp)
  return dias.map(fecha => {
    const turno = turnoMap[`${emp.id}-${fecha}`] ?? null
    const horas = turno?.horas ?? 0
    const esFeriado    = turno?.es_feriado   ?? false
    const incapacitado = turno?.incapacitado  ?? false
    const ordH = Math.min(horas, HORAS_STD)
    const extH = Math.max(horas - HORAS_STD, 0)
    let montoOrd, montoExt
    if (esFeriado) {
      montoOrd = ordH * hHora * 2
      montoExt = extH * hHora * 1.5 * 2
    } else if (incapacitado) {
      montoOrd = ordH * hHora * 0.5
      montoExt = 0
    } else {
      montoOrd = ordH * hHora
      montoExt = extH * hHora * 1.5
    }
    return { fecha, turno, horas, ordH, extH, montoOrd, montoExt, esFeriado, incapacitado }
  })
}

// ── Componente de colilla ──────────────────────────────────────
export function ColillaPago({ empleado, dias, turnoMap, semanaInicio, onClose }) {
  const [enviando, setEnviando] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')

  const hHora       = salarioHora(empleado)
  const salarioBase = empleado.salario_base ?? empleado.salario_hora ?? 0
  const esQuincenal = empleado.tipo_pago === 'quincenal'
  const filas       = buildFilas(empleado, dias, turnoMap)

  const totalOrdH  = filas.reduce((s, f) => s + f.ordH, 0)
  const totalExtH  = filas.reduce((s, f) => s + f.extH, 0)
  const totalOrdM  = filas.reduce((s, f) => s + f.montoOrd, 0)
  const totalExtM  = filas.reduce((s, f) => s + f.montoExt, 0)
  const brutoPago  = esQuincenal ? salarioBase / 2 : totalOrdM + totalExtM
  const ccss       = brutoPago * CCSS_PCT
  const netoPago   = brutoPago - ccss

  const semanaFin = new Date(semanaInicio + 'T00:00:00')
  semanaFin.setDate(semanaFin.getDate() + 6)

  const rolLabel = { cocinero: 'Cocinero/a', supervisor: 'Supervisor/a', servicio_cliente: 'Servicio al cliente' }[empleado.rol] ?? empleado.rol ?? '—'

  // Inyectar / limpiar estilos de impresión
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'colilla-print-style'
    // visibility:hidden + visibility:visible children works inside #root unlike display:none
    style.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 10mm; }
        html, body { margin: 0 !important; padding: 0 !important; }
        body * { visibility: hidden; }
        #colilla-print-root,
        #colilla-print-root * { visibility: visible; }
        #colilla-print-root {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          overflow: visible !important;
          background: white !important;
        }
        #colilla-print-root .no-print { display: none !important; visibility: hidden !important; }
        #colilla-print-root table { font-size: 9px !important; }
        #colilla-print-root .px-8 { padding-left: 10px !important; padding-right: 10px !important; }
      }
    `
    document.head.appendChild(style)
    return () => document.getElementById('colilla-print-style')?.remove()
  }, [])

  async function handleEmail() {
    setEnviando(true)
    setEmailMsg('')
    const { error } = await supabase.functions.invoke('enviar-colilla', {
      body: {
        empleado_nombre: empleado.nombre,
        semana_inicio:   semanaInicio,
        semana_fin:      semanaFin.toISOString().slice(0, 10),
        bruto:           brutoPago,
        ccss,
        neto:            netoPago,
        filas: filas.map(f => ({
          fecha:   f.fecha,
          entrada: fmtTime(f.turno?.hora_inicio),
          salida:  fmtTime(f.turno?.hora_fin),
          ordH:    f.ordH,
          extH:    f.extH,
          montoOrd: f.montoOrd,
          montoExt: f.montoExt,
        })),
      },
    })
    setEnviando(false)
    setEmailMsg(error
      ? `Error: ${error.message || 'Verificá que la Edge Function "enviar-colilla" esté desplegada y configurada con RESEND_API_KEY.'}`
      : 'Colilla enviada por correo.')
    setTimeout(() => setEmailMsg(''), 6000)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center py-6 px-4 overflow-y-auto">
      <div id="colilla-print-root" className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">

        {/* Barra de acciones (oculta en impresión) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Colilla de pago</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleEmail} loading={enviando}>
              <Mail size={14} /> Enviar por email
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer size={14} /> Imprimir / Guardar PDF
            </Button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors ml-1">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {emailMsg && (
          <div className={`no-print mx-6 mt-3 px-4 py-2 rounded-xl text-sm ${emailMsg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {emailMsg}
          </div>
        )}

        {/* ── Contenido imprimible ── */}
        <div className="px-8 py-6">

          {/* Encabezado */}
          <div className="flex items-center gap-5 mb-6 pb-6 border-b-2 border-gray-200">
            <img src="/logo.jpg" alt="Donde Diego Tibas" className="h-20 w-auto object-contain rounded-xl" />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Donde Diego Tibas</h1>
              <p className="text-gray-500 text-sm">Chicharronera</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-800">COLILLA DE PAGO</p>
              <p className="text-sm text-gray-500">
                {fmtShort(semanaInicio)} — {fmtShort(semanaFin.toISOString().slice(0, 10))}
              </p>
            </div>
          </div>

          {/* Info empleado */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Empleado</p>
              <p className="font-semibold text-gray-900 mt-0.5">{empleado.nombre}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Puesto</p>
              <p className="font-semibold text-gray-900 mt-0.5">{rolLabel}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Salario base</p>
              <p className="font-semibold text-gray-900 mt-0.5">{fmt(salarioBase)}<span className="text-xs text-gray-400 font-normal">/mes</span></p>
              {esQuincenal
                ? <p className="text-xs text-indigo-500 font-semibold mt-0.5">Pago quincenal</p>
                : <p className="text-xs text-gray-400">{fmt(hHora)}/h</p>
              }
            </div>
          </div>

          {/* Tabla de días */}
          {esQuincenal ? (
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 font-semibold text-gray-600">Fecha</th>
                  <th className="text-center py-2 font-semibold text-gray-600">Entrada</th>
                  <th className="text-center py-2 font-semibold text-gray-600">Salida</th>
                  <th className="text-center py-2 font-semibold text-gray-600">Almuerzo</th>
                  <th className="text-center py-2 font-semibold text-gray-600">Horas</th>
                  <th className="text-center py-2 font-semibold text-gray-400">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filas.map(({ fecha, turno, horas, esFeriado, incapacitado }) => (
                  <tr key={fecha} className={!turno || turno.es_libre ? 'opacity-40' : ''}>
                    <td className="py-2 text-gray-700 capitalize">{fmtDate(fecha)}</td>
                    <td className="py-2 text-center text-gray-700">{fmtTime(turno?.hora_inicio)}</td>
                    <td className="py-2 text-center text-gray-700">{fmtTime(turno?.hora_fin)}</td>
                    <td className="py-2 text-center text-gray-500">
                      {turno && !turno.es_libre ? (turno.almuerzo_min === 0 ? 'No' : `${turno.almuerzo_min}min`) : '—'}
                    </td>
                    <td className="py-2 text-center font-medium text-gray-800">{horas > 0 ? `${horas}h` : '—'}</td>
                    <td className="py-2 text-center text-xs text-gray-400">
                      {turno?.es_libre ? '🏖 Libre' : esFeriado ? 'Feriado' : incapacitado ? 'Incapacidad' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-semibold">
                  <td colSpan={4} className="pt-3 text-gray-600 text-sm">Total horas trabajadas</td>
                  <td className="pt-3 text-center text-gray-800">{totalOrdH + totalExtH}h</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          ) : (
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 font-semibold text-gray-600">Fecha</th>
                  <th className="text-center py-2 font-semibold text-gray-600">Entrada</th>
                  <th className="text-center py-2 font-semibold text-gray-600">Salida</th>
                  <th className="text-center py-2 font-semibold text-gray-600">Almuerzo</th>
                  <th className="text-center py-2 font-semibold text-gray-600">Hrs ord.</th>
                  <th className="text-center py-2 font-semibold text-orange-500">Hrs ext.</th>
                  <th className="text-right py-2 font-semibold text-gray-600">Monto ord.</th>
                  <th className="text-right py-2 font-semibold text-orange-500">Monto ext.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filas.map(({ fecha, turno, horas, ordH, extH, montoOrd, montoExt, esFeriado, incapacitado }) => (
                  <tr key={fecha} className={horas === 0 ? 'opacity-40' : ''}>
                    <td className="py-2 text-gray-700 capitalize">
                      <span>{fmtDate(fecha)}</span>
                      {esFeriado    && <span className="ml-1.5 text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Feriado ×2</span>}
                      {incapacitado && <span className="ml-1.5 text-[10px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">Incapacidad ½</span>}
                    </td>
                    <td className="py-2 text-center text-gray-700">{fmtTime(turno?.hora_inicio)}</td>
                    <td className="py-2 text-center text-gray-700">{fmtTime(turno?.hora_fin)}</td>
                    <td className="py-2 text-center text-gray-500">
                      {turno ? (turno.almuerzo_min === 0 ? 'No' : `${turno.almuerzo_min}min`) : '—'}
                    </td>
                    <td className="py-2 text-center font-medium text-gray-800">{ordH > 0 ? `${ordH}h` : '—'}</td>
                    <td className="py-2 text-center font-medium text-orange-600">{extH > 0 && !incapacitado ? `${extH}h` : '—'}</td>
                    <td className="py-2 text-right text-gray-700">{montoOrd > 0 ? fmt(montoOrd) : '—'}</td>
                    <td className="py-2 text-right text-orange-600">{montoExt > 0 ? fmt(montoExt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-semibold">
                  <td colSpan={4} className="pt-3 text-gray-600 text-sm">Totales</td>
                  <td className="pt-3 text-center text-gray-800">{totalOrdH}h</td>
                  <td className="pt-3 text-center text-orange-600">{totalExtH > 0 ? `${totalExtH}h` : '—'}</td>
                  <td className="pt-3 text-right text-gray-800">{fmt(totalOrdM)}</td>
                  <td className="pt-3 text-right text-orange-600">{totalExtM > 0 ? fmt(totalExtM) : '—'}</td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* Resumen de pago */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-5 py-2 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Resumen de pago{esQuincenal ? ' · Quincenal' : ''}
              </p>
            </div>
            <div className="px-5 py-4 space-y-2">
              {esQuincenal ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Salario base mensual</span>
                    <span className="font-medium text-gray-800">{fmt(salarioBase)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-100">
                    <span className="text-gray-800">Salario quincenal bruto (÷ 2)</span>
                    <span className="text-gray-900">{fmt(brutoPago)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Salario ordinario ({totalOrdH}h × {fmt(hHora)})</span>
                    <span className="font-medium text-gray-800">{fmt(totalOrdM)}</span>
                  </div>
                  {totalExtH > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-orange-600">Horas extra ({totalExtH}h × {fmt(hHora * 1.5)} · 1.5×)</span>
                      <span className="font-medium text-orange-700">{fmt(totalExtM)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-100">
                    <span className="text-gray-800">Salario bruto</span>
                    <span className="text-gray-900">{fmt(brutoPago)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm text-red-600">
                <span>(-) Deducción CCSS trabajador (10.83%)</span>
                <span className="font-medium">-{fmt(ccss)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-gray-200">
                <span className="font-bold text-gray-900">Salario neto a pagar</span>
                <span className="font-bold text-xl text-brand-700">{fmt(netoPago)}</span>
              </div>
            </div>
          </div>

          {/* Pie */}
          <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-2 gap-8 text-sm text-gray-500">
            <div>
              <p className="mb-8">Firma del empleador</p>
              <div className="border-t border-gray-400 pt-1">Donde Diego Tibas</div>
            </div>
            <div>
              <p className="mb-8">Firma del empleado</p>
              <div className="border-t border-gray-400 pt-1">{empleado.nombre}</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
