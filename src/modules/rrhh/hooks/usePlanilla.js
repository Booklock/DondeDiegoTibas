import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export function usePlanilla() {
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchEmpleados() {
    setLoading(true)
    const { data } = await supabase
      .from('empleados_planilla')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    setEmpleados(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchEmpleados() }, [])

  async function crearEmpleado({ nombre, salario_base, rol }) {
    const { error } = await supabase.from('empleados_planilla').insert({ nombre, salario_base, rol })
    if (!error) await fetchEmpleados()
    return { error }
  }

  async function actualizarEmpleado(id, { nombre, salario_base, rol }) {
    const { error } = await supabase.from('empleados_planilla').update({ nombre, salario_base, rol }).eq('id', id)
    if (!error) await fetchEmpleados()
    return { error }
  }

  async function desactivarEmpleado(id) {
    await supabase.from('empleados_planilla').update({ activo: false }).eq('id', id)
    await fetchEmpleados()
  }

  return { empleados, loading, crearEmpleado, actualizarEmpleado, desactivarEmpleado }
}

// Calcula horas netas dado hora inicio "HH:MM", hora fin "HH:MM" y minutos de almuerzo
export function calcHorasNetas(hora_inicio, hora_fin, almuerzo_min = 60) {
  if (!hora_inicio || !hora_fin) return 0
  const [hi, mi] = hora_inicio.split(':').map(Number)
  const [hf, mf] = hora_fin.split(':').map(Number)
  const minutos = (hf * 60 + mf) - (hi * 60 + mi) - almuerzo_min
  return Math.max(0, Math.round(minutos / 60 * 100) / 100)
}

export function useTurnos(fechaInicio, fechaFin) {
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(false)

  async function fetch() {
    if (!fechaInicio || !fechaFin) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('turnos_trabajo')
      .select('*')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
    setTurnos(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [fechaInicio, fechaFin])

  // turnoData: { hora_inicio, hora_fin, almuerzo_min } — null para borrar
  async function guardarTurno(empleado_id, fecha, turnoData) {
    if (!turnoData || !turnoData.hora_inicio || !turnoData.hora_fin) {
      await supabase.from('turnos_trabajo').delete().eq('empleado_id', empleado_id).eq('fecha', fecha)
    } else {
      const horas = calcHorasNetas(turnoData.hora_inicio, turnoData.hora_fin, turnoData.almuerzo_min ?? 60)
      await supabase.from('turnos_trabajo').upsert(
        {
          empleado_id,
          fecha,
          hora_inicio:  turnoData.hora_inicio,
          hora_fin:     turnoData.hora_fin,
          almuerzo_min: turnoData.almuerzo_min ?? 60,
          horas,
        },
        { onConflict: 'empleado_id,fecha' }
      )
    }
    await fetch()
  }

  return { turnos, loading, guardarTurno, refetch: fetch }
}
