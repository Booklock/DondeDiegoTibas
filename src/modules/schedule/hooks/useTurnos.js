import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export function useTurnos() {
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    setLoading(true)
    const { data } = await supabase.from('turnos').select('*').order('hora_inicio')
    setTurnos(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  async function crearTurno(data) {
    const { error } = await supabase.from('turnos').insert(data)
    if (!error) await fetch()
    return { error }
  }

  async function actualizarTurno(id, data) {
    const { error } = await supabase.from('turnos').update(data).eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  async function eliminarTurno(id) {
    const { error } = await supabase.from('turnos').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  return { turnos, loading, crearTurno, actualizarTurno, eliminarTurno }
}
