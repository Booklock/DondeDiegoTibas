// Cálculo del salario bruto de un empleado de planilla en un período
// cualquiera (un mes, un rango de fechas o el año de aguinaldo).
// Usado por Contadora (planilla mensual / por rango) y por el aguinaldo.

import { getFeriadosCR } from './feriados'

export const CCSS_PCT = 0.1083

export function localStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

/** Fechas 'YYYY-MM-DD' de `desde` a `hasta`, ambas incluidas. */
export function diasEntre(desde, hasta) {
  const dias = []
  const d = new Date(desde + 'T00:00:00')
  const fin = new Date(hasta + 'T00:00:00')
  while (d <= fin) {
    dias.push(localStr(d))
    d.setDate(d.getDate() + 1)
  }
  return dias
}

/** Feriados de Costa Rica de todos los años que toca el rango. */
export function feriadosEntre(desde, hasta) {
  const set = new Set()
  for (let y = Number(desde.slice(0, 4)); y <= Number(hasta.slice(0, 4)); y++) {
    getFeriadosCR(y).set.forEach(f => set.add(f))
  }
  return set
}

function diasDelMes(fechaStr) {
  const [y, m] = fechaStr.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/**
 * Bruto de un empleado en los `dias` dados.
 * - Quincenal: salario base proporcional a los días del período
 *   (un mes completo = salario base) + feriados − incapacidades.
 * - Semanal (por horas): según los turnos registrados, con extras ×1.5,
 *   feriado ×2 y extra en feriado ×3.
 */
export function calcBrutoPeriodo(emp, dias, turnoMap, feriadoSet) {
  const salario = Number(emp.salario_base) || 0
  const hHora   = salario * 7 / (30 * 48)
  const valDia  = salario / 30
  let dias_trab = 0, dias_incap = 0, dias_fer = 0
  let hrs_reg = 0, hrs_ot = 0, hrs_fer_n = 0, hrs_fer_ot = 0
  let base_periodo = 0

  dias.forEach(d => {
    base_periodo += salario / diasDelMes(d)
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
    bruto = base_periodo + monto_extras - dias_incap * valDia
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
}
