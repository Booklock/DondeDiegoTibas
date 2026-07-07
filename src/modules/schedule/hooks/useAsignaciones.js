import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00') // local midnight, not UTC
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

export function weekDates(baseDate) {
  const monday = startOfWeek(baseDate)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return localDateStr(d)
  })
}

export function useAsignaciones(weekBase) {
  const [asignaciones, setAsignaciones] = useState([])
  const [loading, setLoading] = useState(true)

  const fechas = weekDates(weekBase)

  async function fetch() {
    setLoading(true)
    const { data } = await supabase
      .from('asignaciones_turno')
      .select(`
        *,
        empleado:empleados(id, perfil:perfiles(nombre, apellidos)),
        turno:turnos(nombre, hora_inicio, hora_fin)
      `)
      .gte('fecha', fechas[0])
      .lte('fecha', fechas[6])
      .order('fecha')
    setAsignaciones(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [weekBase])

  async function asignar({ empleado_id, turno_id, fecha, notas }) {
    const { error } = await supabase.from('asignaciones_turno').upsert(
      { empleado_id, turno_id, fecha, notas },
      { onConflict: 'empleado_id,turno_id,fecha' }
    )
    if (!error) await fetch()
    return { error }
  }

  async function eliminarAsignacion(id) {
    const { error } = await supabase.from('asignaciones_turno').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  return { asignaciones, fechas, loading, asignar, eliminarAsignacion, refetch: fetch }
}

export function useAsignacionesEmpleado(perfilId, weekBase) {
  const [asignaciones, setAsignaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const fechas = weekDates(weekBase)

  useEffect(() => {
    if (!perfilId) return
    async function fetch() {
      setLoading(true)
      // Get empleado id for this perfil
      const { data: emp } = await supabase
        .from('empleados').select('id').eq('perfil_id', perfilId).maybeSingle()
      if (!emp) { setLoading(false); return }

      const { data } = await supabase
        .from('asignaciones_turno')
        .select(`*, turno:turnos(nombre, hora_inicio, hora_fin)`)
        .eq('empleado_id', emp.id)
        .gte('fecha', fechas[0])
        .lte('fecha', fechas[6])
        .order('fecha')
      setAsignaciones(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [perfilId, weekBase])

  return { asignaciones, fechas, loading }
}
