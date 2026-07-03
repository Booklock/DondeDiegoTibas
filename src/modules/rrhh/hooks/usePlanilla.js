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

  async function crearEmpleado(data) {
    const { error } = await supabase.from('empleados_planilla').insert(data)
    if (!error) await fetchEmpleados()
    return { error }
  }

  async function actualizarEmpleado(id, data) {
    const { error } = await supabase.from('empleados_planilla').update(data).eq('id', id)
    if (!error) await fetchEmpleados()
    return { error }
  }

  async function desactivarEmpleado(id) {
    await supabase.from('empleados_planilla').update({ activo: false }).eq('id', id)
    await fetchEmpleados()
  }

  return { empleados, loading, crearEmpleado, actualizarEmpleado, desactivarEmpleado }
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

  async function guardarTurno(empleado_id, fecha, horas) {
    if (horas === null || horas === '' || Number(horas) === 0) {
      await supabase.from('turnos_trabajo').delete().eq('empleado_id', empleado_id).eq('fecha', fecha)
    } else {
      await supabase.from('turnos_trabajo').upsert(
        { empleado_id, fecha, horas: Number(horas) },
        { onConflict: 'empleado_id,fecha' }
      )
    }
    await fetch()
  }

  return { turnos, loading, guardarTurno, refetch: fetch }
}
