import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export function useVacaciones(empleadoId) {
  const [vacaciones, setVacaciones] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchVacaciones() {
    if (!empleadoId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('vacaciones')
      .select('*')
      .eq('empleado_id', empleadoId)
      .order('created_at', { ascending: false })
    setVacaciones(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchVacaciones() }, [empleadoId])

  async function registrarVacacion(data) {
    const { error } = await supabase.from('vacaciones').insert({ empleado_id: empleadoId, ...data })
    if (!error) await fetchVacaciones()
    return { error }
  }

  async function actualizarVacacion(id, data) {
    const { error } = await supabase.from('vacaciones').update(data).eq('id', id)
    if (!error) await fetchVacaciones()
    return { error }
  }

  const totalAcumulado = vacaciones.reduce((sum, v) => sum + Number(v.dias_acumulados), 0)
  const totalUsado = vacaciones.reduce((sum, v) => sum + Number(v.dias_usados), 0)

  return { vacaciones, loading, totalAcumulado, totalUsado, registrarVacacion, actualizarVacacion }
}
