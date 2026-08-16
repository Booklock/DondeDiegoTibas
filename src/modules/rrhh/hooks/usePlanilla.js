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

  async function crearEmpleado({ nombre, salario_base, rol, tipo_pago }) {
    const { error } = await supabase.from('empleados_planilla').insert({ nombre, salario_base, rol, tipo_pago })
    if (!error) await fetchEmpleados()
    return { error }
  }

  async function actualizarEmpleado(id, { nombre, salario_base, rol, tipo_pago }) {
    const { error } = await supabase.from('empleados_planilla').update({ nombre, salario_base, rol, tipo_pago }).eq('id', id)
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

  // turnoData: { hora_inicio, hora_fin, almuerzo_min, es_feriado, incapacitado, es_libre }
  // null → borrar
  async function guardarTurno(empleado_id, fecha, turnoData) {
    if (!turnoData) {
      await supabase.from('turnos_trabajo').delete().eq('empleado_id', empleado_id).eq('fecha', fecha)
    } else if (turnoData.es_libre) {
      await supabase.from('turnos_trabajo').upsert(
        { empleado_id, fecha, hora_inicio: null, hora_fin: null, almuerzo_min: 0, horas: 0,
          es_feriado: false, incapacitado: false, es_libre: true },
        { onConflict: 'empleado_id,fecha' }
      )
    } else if (!turnoData.hora_inicio || !turnoData.hora_fin) {
      await supabase.from('turnos_trabajo').delete().eq('empleado_id', empleado_id).eq('fecha', fecha)
    } else {
      const horas = calcHorasNetas(turnoData.hora_inicio, turnoData.hora_fin, turnoData.almuerzo_min ?? 60)
      await supabase.from('turnos_trabajo').upsert(
        { empleado_id, fecha,
          hora_inicio:  turnoData.hora_inicio,
          hora_fin:     turnoData.hora_fin,
          almuerzo_min: turnoData.almuerzo_min ?? 60,
          horas,
          es_feriado:   turnoData.es_feriado   ?? false,
          incapacitado: turnoData.incapacitado  ?? false,
          es_libre:     false,
        },
        { onConflict: 'empleado_id,fecha' }
      )
    }
    await fetch()
  }

  // Aplica plantillas a la semana (solo días sin turno existente)
  async function aplicarSemana(empleados, dias, plantillaMap) {
    const rows = []
    empleados.forEach(emp => {
      const plantEmp = plantillaMap[emp.id]
      if (!plantEmp) return
      dias.forEach((fecha, pos) => {
        const existe = turnos.some(t => t.empleado_id === emp.id && t.fecha === fecha)
        if (existe) return
        const p = plantEmp[pos]
        if (!p) return
        rows.push({
          empleado_id:  emp.id,
          fecha,
          hora_inicio:  p.es_libre ? null : (p.hora_inicio ?? null),
          hora_fin:     p.es_libre ? null : (p.hora_fin    ?? null),
          almuerzo_min: p.almuerzo_min ?? 60,
          horas:        p.es_libre ? 0 : calcHorasNetas(p.hora_inicio, p.hora_fin, p.almuerzo_min ?? 60),
          es_feriado:   false,
          incapacitado: false,
          es_libre:     p.es_libre ?? false,
        })
      })
    })
    if (rows.length === 0) return { count: 0 }
    const { error } = await supabase.from('turnos_trabajo').insert(rows)
    if (!error) await fetch()
    return { count: rows.length, error }
  }

  return { turnos, loading, guardarTurno, aplicarSemana, refetch: fetch }
}

export function usePlantillas() {
  const [plantillas, setPlantillas] = useState([])  // named templates [{id, nombre, orden}]
  const [detalles, setDetalles]     = useState([])  // plantillas_horario rows
  const [loading, setLoading]       = useState(true)

  async function fetchAll() {
    setLoading(true)
    const [{ data: ps }, { data: ds }] = await Promise.all([
      supabase.from('plantillas').select('*').order('orden'),
      supabase.from('plantillas_horario').select('*'),
    ])
    setPlantillas(ps ?? [])
    setDetalles(ds ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // { plantilla_id: { empleado_id: { pos: row } } }
  const plantillaMap = {}
  detalles.forEach(d => {
    if (!plantillaMap[d.plantilla_id]) plantillaMap[d.plantilla_id] = {}
    if (!plantillaMap[d.plantilla_id][d.empleado_id]) plantillaMap[d.plantilla_id][d.empleado_id] = {}
    plantillaMap[d.plantilla_id][d.empleado_id][d.pos] = d
  })

  // rows: [{ empleado_id, pos, es_libre, hora_inicio, hora_fin, almuerzo_min }]
  async function guardarPlantilla(plantilla_id, rows) {
    const data = rows.map(r => ({ plantilla_id, ...r }))
    const { error } = await supabase
      .from('plantillas_horario')
      .upsert(data, { onConflict: 'plantilla_id,empleado_id,pos' })
    if (!error) await fetchAll()
    return { error }
  }

  return { plantillas, plantillaMap, loading, guardarPlantilla }
}

export function useHorasExtra(semanaInicio) {
  const [rows, setRows] = useState([])

  async function fetchRows() {
    if (!semanaInicio) return
    const { data } = await supabase
      .from('horas_extra_semana')
      .select('*')
      .eq('semana_inicio', semanaInicio)
    setRows(data ?? [])
  }

  useEffect(() => { fetchRows() }, [semanaInicio])

  const horasExtraMap = {}
  rows.forEach(r => {
    horasExtraMap[r.empleado_id] = {
      horas:            Number(r.horas),
      horas_feriado_ot: Number(r.horas_feriado_ot ?? 0),
      notas:            r.notas ?? '',
    }
  })

  async function guardarHorasExtra(empleado_id, horas, horas_feriado_ot = 0, notas = '') {
    if (!horas || Number(horas) === 0) {
      await supabase.from('horas_extra_semana')
        .delete()
        .eq('empleado_id', empleado_id)
        .eq('semana_inicio', semanaInicio)
    } else {
      await supabase.from('horas_extra_semana').upsert(
        { empleado_id, semana_inicio: semanaInicio, horas: Number(horas), horas_feriado_ot: Number(horas_feriado_ot) || 0, notas },
        { onConflict: 'empleado_id,semana_inicio' }
      )
    }
    await fetchRows()
  }

  return { horasExtraMap, guardarHorasExtra }
}
