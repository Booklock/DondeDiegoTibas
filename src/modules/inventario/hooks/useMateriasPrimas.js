import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export function useMateriasPrimas() {
  const [materias, setMaterias] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    setLoading(true)
    const { data } = await supabase
      .from('materias_primas')
      .select('*')
      .order('nombre')
    setMaterias(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  async function crearMateria({ nombre, costo_unitario, unidad_medida }) {
    const { error } = await supabase.from('materias_primas').insert({ nombre, costo_unitario, unidad_medida })
    if (!error) await fetch()
    return { error }
  }

  async function actualizarMateria(id, { nombre, costo_unitario, unidad_medida }) {
    const { error } = await supabase.from('materias_primas').update({ nombre, costo_unitario, unidad_medida }).eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  async function toggleActivo(id, activo) {
    await supabase.from('materias_primas').update({ activo }).eq('id', id)
    await fetch()
  }

  return { materias, loading, crearMateria, actualizarMateria, toggleActivo }
}

export function useRecepciones({ desde, hasta } = {}) {
  const [recepciones, setRecepciones] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    setLoading(true)
    let q = supabase
      .from('recepciones_materia_prima')
      .select('*, materia_prima:materias_primas(id, nombre, costo_unitario, unidad_medida)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)
    const { data } = await q
    setRecepciones(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [desde, hasta])

  async function registrarRecepcion({ materia_prima_id, fecha, cantidad, notas }) {
    const { error } = await supabase
      .from('recepciones_materia_prima')
      .insert({ materia_prima_id, fecha, cantidad: Number(cantidad), notas: notas || null })
    if (!error) await fetch()
    return { error }
  }

  async function eliminarRecepcion(id) {
    const { error } = await supabase.from('recepciones_materia_prima').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  return { recepciones, loading, registrarRecepcion, eliminarRecepcion, refetch: fetch }
}
