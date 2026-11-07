// Cálculos de vacaciones y aguinaldo (Costa Rica).

import { localStr } from './salarios'

export function hoyStr() {
  return localStr(new Date())
}

/** Meses completos laborados desde `ingreso` hasta `hasta` (fechas 'YYYY-MM-DD'). */
export function mesesCompletos(ingreso, hasta = hoyStr()) {
  if (!ingreso || ingreso > hasta) return 0
  const [y1, m1, d1] = ingreso.split('-').map(Number)
  const [y2, m2, d2] = hasta.split('-').map(Number)
  return Math.max(0, (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0))
}

/** Vacaciones: se gana 1 día por cada mes completo laborado. */
export function saldoVacaciones(empleado, vacaciones) {
  const ganados = mesesCompletos(empleado.fecha_ingreso)
  const tomados = vacaciones
    .filter(v => v.empleado_id === empleado.id)
    .reduce((s, v) => s + Number(v.dias), 0)
  return { ganados, tomados, disponibles: ganados - tomados }
}

/** Días naturales entre dos fechas, ambas incluidas. */
export function diasNaturales(desde, hasta) {
  if (!desde || !hasta || hasta < desde) return 0
  const ms = new Date(hasta + 'T00:00:00') - new Date(desde + 'T00:00:00')
  return Math.round(ms / 86400000) + 1
}

/**
 * Período de aguinaldo que termina el 30 de noviembre de `anio`
 * (va del 1 de diciembre del año anterior al 30 de noviembre).
 */
export function periodoAguinaldo(anio) {
  return { desde: `${anio - 1}-12-01`, hasta: `${anio}-11-30` }
}

/** Año del período de aguinaldo en curso (en diciembre ya corre el siguiente). */
export function anioAguinaldoActual(fecha = new Date()) {
  return fecha.getMonth() === 11 ? fecha.getFullYear() + 1 : fecha.getFullYear()
}
