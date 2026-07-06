import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

// Suma los gastos marcados "pagado_desde_caja" para una fecha concreta
export async function fetchGastosCaja(fecha) {
  const { data } = await supabase
    .from('gastos_operativos')
    .select('monto')
    .eq('fecha', fecha)
    .eq('pagado_desde_caja', true)
  return (data ?? []).reduce((s, g) => s + Number(g.monto), 0)
}

export function useCierresDiarios({ desde, hasta } = {}) {
  const [cierres, setCierres] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    setLoading(true)
    let q = supabase.from('cierres_diarios').select('*').order('fecha', { ascending: false })
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)
    const { data } = await q
    setCierres(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [desde, hasta])

  async function guardarCierre(data) {
    const { error } = await supabase
      .from('cierres_diarios')
      .upsert(data, { onConflict: 'fecha' })
    if (!error) await fetch()
    return { error }
  }

  async function eliminarCierre(id) {
    const { error } = await supabase.from('cierres_diarios').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  return { cierres, loading, guardarCierre, eliminarCierre, refetch: fetch }
}

export function useGastosOperativos({ desde, hasta } = {}) {
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    setLoading(true)
    let q = supabase
      .from('gastos_operativos')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)
    const { data } = await q
    setGastos(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [desde, hasta])

  async function crearGasto({ fecha, proveedor, descripcion, monto, pagado_desde_caja }) {
    const { error } = await supabase
      .from('gastos_operativos')
      .insert({ fecha, proveedor, descripcion, monto, pagado_desde_caja: pagado_desde_caja ?? false })
    if (!error) await fetch()
    return { error }
  }

  async function eliminarGasto(id) {
    const { error } = await supabase.from('gastos_operativos').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  return { gastos, loading, crearGasto, eliminarGasto }
}
