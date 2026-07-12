import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export function useRotacion(desde, hasta) {
  const [asignaciones, setAsignaciones] = useState([])
  const [duenos, setDuenos] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchAll() {
    setLoading(true)
    const [{ data: rot }, { data: perfs }] = await Promise.all([
      supabase
        .from('rotacion_duenos')
        .select('*, perfil:perfiles(nombre, apellidos)')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('fecha')
        .order('hora_inicio'),
      supabase
        .from('perfiles')
        .select('id, nombre, apellidos')
        .eq('rol', 'dueno')
        .order('nombre'),
    ])
    setAsignaciones(rot ?? [])
    setDuenos(perfs ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [desde, hasta])

  async function asignar(data) {
    const { error } = await supabase.from('rotacion_duenos').insert(data)
    if (!error) await fetchAll()
    return { error }
  }

  async function eliminar(id) {
    await supabase.from('rotacion_duenos').delete().eq('id', id)
    await fetchAll()
  }

  return { asignaciones, duenos, loading, asignar, eliminar }
}
