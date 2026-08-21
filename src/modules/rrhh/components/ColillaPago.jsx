import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { Button } from '../../../components/ui/Button'
import { Printer, Mail, X } from 'lucide-react'

const fmt      = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)
const fmtShort = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) : '—'

const CCSS_PCT = 0.1083

const ROL_LABEL = {
  cocinero:         'Ayudante de cocina',
  supervisor:       'Supervisor/a',
  servicio_cliente: 'Servicio al cliente',
}

export function ColillaPago({ empleado, dias, turnoMap, semanaInicio, horasExtraOT = 0, horasExtraFeriadoOT = 0, onClose }) {
  const [enviando, setEnviando] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')

  const salarioBase = empleado.salario_base ?? 0
  const esQuincenal = empleado.tipo_pago === 'quincenal'
  const rolLabel    = ROL_LABEL[empleado.rol] ?? empleado.rol ?? '—'

  // ── Cálculo ─────────────────────────────────────────────────
  const semanal = salarioBase / 30 * 7
  const hHora   = semanal / 48

  let hrsRegular       = 0
  let hrsFeriadoNormal = 0  // feriado ≤ 8h/día → ×2
  let hrsFeriadoOT     = 0  // feriado > 8h/día → ×3
  dias.forEach(d => {
    const t = turnoMap[`${empleado.id}-${d}`]
    if (!t || t.es_libre || t.incapacitado) return
    const h = Number(t.horas) || 0
    if (t.es_feriado) {
      hrsFeriadoNormal += Math.min(h, 8)
      hrsFeriadoOT     += Math.max(0, h - 8)
    } else {
      hrsRegular += h
    }
  })
  const hrsFeriado = hrsFeriadoNormal + hrsFeriadoOT
  const totalHoras = hrsRegular + hrsFeriado

  // Semanal
  const hrsExtra      = Math.max(0, hrsRegular - 48)
  const pagoExtra     = hrsExtra * hHora * 1.5
  const pagoFeriado   = hrsFeriadoNormal * hHora * 2
  const pagoFeriadoOT = hrsFeriadoOT * hHora * 3

  // Quincenal: base ya cubre ×1, solo se agrega el premio
  const premioClon      = hrsFeriado * hHora              // +×1 por feriado (total ×2)
  const premioOT        = horasExtraOT * hHora * 0.5      // +×0.5 OT normal (total ×1.5)
  const premioOTFeriado = horasExtraFeriadoOT * hHora * 2 // +×2 OT feriado (total ×3)

  const brutoPago = esQuincenal
    ? salarioBase / 2 + premioClon + premioOT + premioOTFeriado
    : Math.min(hrsRegular, 48) * hHora + pagoExtra + pagoFeriado + pagoFeriadoOT

  const ccss     = brutoPago * CCSS_PCT
  const netoPago = brutoPago - ccss

  const semanaFin = new Date(semanaInicio + 'T00:00:00')
  semanaFin.setDate(semanaFin.getDate() + 6)
  const semanaFinStr = semanaFin.toISOString().slice(0, 10)

  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'colilla-print-style'
    style.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 10mm; }
        html, body { margin: 0 !important; padding: 0 !important; }
        body * { visibility: hidden; }
        #colilla-print-root,
        #colilla-print-root * { visibility: visible; }
        #colilla-print-root {
          position: fixed !important;
          top: 0 !important; left: 0 !important;
          width: 100% !important; max-width: 100% !important;
          box-shadow: none !important; border-radius: 0 !important;
          overflow: visible !important; background: white !important;
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
        empleado_nombre:  empleado.nombre,
        semana_inicio:    semanaInicio,
        semana_fin:       semanaFinStr,
        es_quincenal:     esQuincenal,
        semanal:          esQuincenal ? null : semanal,
        horas_trabajadas: totalHoras,
        horas_extra:      esQuincenal ? horasExtraOT : hrsExtra,
        horas_feriado:    hrsFeriado,
        bruto:            brutoPago,
        ccss,
        neto:             netoPago,
      },
    })
    setEnviando(false)
    setEmailMsg(error
      ? `Error: ${error.message || 'Verificá que la Edge Function "enviar-colilla" esté desplegada.'}`
      : 'Colilla enviada por correo.')
    setTimeout(() => setEmailMsg(''), 6000)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center py-6 px-4 overflow-y-auto">
      <div id="colilla-print-root" className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">

        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Colilla de pago</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleEmail} loading={enviando}>
              <Mail size={14} /> Enviar por email
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer size={14} /> Imprimir / PDF
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

        <div className="px-8 py-6">

          <div className="flex items-center gap-5 mb-6 pb-6 border-b-2 border-gray-200">
            <img src="/logo.jpg" alt="Donde Diego Tibas" className="h-16 w-auto object-contain rounded-xl" />
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900">Donde Diego Tibas</h1>
              <p className="text-gray-500 text-sm">Chicharronera</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-800">COLILLA DE PAGO</p>
              <p className="text-sm text-gray-500">
                {fmtShort(semanaInicio)} — {fmtShort(semanaFinStr)}
              </p>
            </div>
          </div>

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
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Salario mensual</p>
              <p className="font-semibold text-gray-900 mt-0.5">{fmt(salarioBase)}</p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden mb-8">
            <div className="bg-gray-50 px-5 py-2 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Detalle de pago{esQuincenal ? ' · Quincenal' : ' · Semanal'}
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              {esQuincenal ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Salario base mensual</span>
                    <span className="font-medium text-gray-800">{fmt(salarioBase)}</span>
                  </div>
                  <div className="flex justify-between text-sm pb-2 border-b border-gray-100">
                    <span className="text-gray-600">Salario quincenal base (÷ 2)</span>
                    <span className="font-medium text-gray-800">{fmt(salarioBase / 2)}</span>
                  </div>
                  {hrsFeriado > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-600">Premio feriado ({hrsFeriado}h × {fmt(hHora)} · +×1)</span>
                      <span className="font-medium text-purple-700">+{fmt(premioClon)}</span>
                    </div>
                  )}
                  {horasExtraOT > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-orange-600">Horas extra normales ({horasExtraOT}h × {fmt(hHora * 0.5)} · +×0.5)</span>
                      <span className="font-medium text-orange-700">+{fmt(premioOT)}</span>
                    </div>
                  )}
                  {horasExtraFeriadoOT > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Horas extra feriado ({horasExtraFeriadoOT}h × {fmt(hHora * 2)} · +×2 = ×3)</span>
                      <span className="font-medium text-red-700">+{fmt(premioOTFeriado)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Horas trabajadas en la semana</span>
                    <span className="text-gray-700">{totalHoras}h</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-1 border-t border-gray-100">
                    <span className="text-gray-800">Salario quincenal bruto</span>
                    <span className="text-gray-900">{fmt(brutoPago)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tasa hora (mensual ÷ 30 × 7 ÷ 48)</span>
                    <span className="font-medium text-gray-800">{fmt(hHora)}/h</span>
                  </div>
                  <div className="flex justify-between text-sm pb-2 border-b border-gray-100">
                    <span className="text-gray-600">Horas trabajadas</span>
                    <span className="font-medium text-gray-800">
                      {totalHoras}h
                      {hrsExtra > 0 && <span className="text-orange-600 ml-1">({hrsExtra}h extra)</span>}
                      {hrsFeriado > 0 && <span className="text-purple-600 ml-1">({hrsFeriado}h feriado)</span>}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Horas regulares ({Math.min(hrsRegular, 48)}h × {fmt(hHora)})
                    </span>
                    <span className="font-medium text-gray-800">{fmt(Math.min(hrsRegular, 48) * hHora)}</span>
                  </div>
                  {hrsFeriadoNormal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-600">Horas feriado ({hrsFeriadoNormal}h × {fmt(hHora * 2)} · ×2)</span>
                      <span className="font-medium text-purple-700">+{fmt(pagoFeriado)}</span>
                    </div>
                  )}
                  {hrsFeriadoOT > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Horas extra feriado ({hrsFeriadoOT}h × {fmt(hHora * 3)} · ×3)</span>
                      <span className="font-medium text-red-700">+{fmt(pagoFeriadoOT)}</span>
                    </div>
                  )}
                  {hrsExtra > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-orange-600">Horas extra ({hrsExtra}h × {fmt(hHora * 1.5)} · ×1.5)</span>
                      <span className="font-medium text-orange-700">+{fmt(pagoExtra)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold pt-1 border-t border-gray-100">
                    <span className="text-gray-800">Salario bruto</span>
                    <span className="text-gray-900">{fmt(brutoPago)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-sm text-red-600 pt-1 border-t border-gray-100">
                <span>(-) Deducción CCSS trabajador (10.83%)</span>
                <span className="font-medium">-{fmt(ccss)}</span>
              </div>

              <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
                <span className="font-bold text-gray-900">Salario neto a pagar</span>
                <span className="font-bold text-2xl text-brand-700">{fmt(netoPago)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm text-gray-500">
            <div>
              <p className="mb-10">Firma del empleador</p>
              <div className="border-t border-gray-400 pt-1">Donde Diego Tibas</div>
            </div>
            <div>
              <p className="mb-10">Firma del empleado</p>
              <div className="border-t border-gray-400 pt-1">{empleado.nombre}</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
