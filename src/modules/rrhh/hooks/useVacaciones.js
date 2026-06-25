import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

// 12 días/año, proporcional a días trabajados desde fecha_ingreso
export function calcularDiasGanados(fechaIngreso) {
  if (!fechaIngreso) return 0
  const ingreso = new Date(fechaIngreso + 'T00:00:00')
  const hoy = new Date()
  const dias = Math.max(0, (hoy - ingreso) / (1000 * 60 * 60 * 24))
  return Math.floor((dias / 365) * 12 * 10) / 10
}

// Cuenta días hábiles (lun-sáb) entre dos fechas inclusive
export function diasHabilesEntreFechas(desde, hasta) {
  if (!desde || !hasta) return 0
  let count = 0
  const d = new Date(desde + 'T00:00:00')
  const end = new Date(hasta + 'T00:00:00')
  if (end < d) return 0
  while (d <= end) {
    if (d.getDay() !== 0) count++ // 0 = domingo
    d.setDate(d.getDate() + 1)
  }
  return count
}

export function useVacaciones(empleadoId, fechaIngreso) {
  const [vacaciones, setVacaciones] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchVacaciones() {
    if (!empleadoId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('vacaciones')
      .select('*')
      .eq('empleado_id', empleadoId)
      .order('fecha_inicio', { ascending: false })
    setVacaciones(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchVacaciones() }, [empleadoId])

  async function registrarVacacion({ fecha_inicio, fecha_fin, notas }) {
    const dias = diasHabilesEntreFechas(fecha_inicio, fecha_fin)
    const { error } = await supabase.from('vacaciones').insert({
      empleado_id: empleadoId,
      dias_acumulados: dias, // satisface constraint dias_usados <= dias_acumulados
      dias_usados: dias,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      notas: notas || null,
    })
    if (!error) await fetchVacaciones()
    return { error }
  }

  async function eliminarVacacion(id) {
    const { error } = await supabase.from('vacaciones').delete().eq('id', id)
    if (!error) await fetchVacaciones()
    return { error }
  }

  const diasGanados = calcularDiasGanados(fechaIngreso)
  const totalUsado = vacaciones.reduce((sum, v) => sum + Number(v.dias_usados), 0)
  const disponibles = Math.max(0, diasGanados - totalUsado)

  return {
    vacaciones, loading,
    diasGanados, totalUsado, disponibles,
    registrarVacacion, eliminarVacacion,
  }
}
