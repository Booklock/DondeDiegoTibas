import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export function useCierres({ desde, hasta } = {}) {
  const [cierres, setCierres] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    setLoading(true)
    let q = supabase
      .from('cierres_caja')
      .select(`*, ingresos(*), gastos(*, categoria:categorias_gasto(nombre, tipo))`)
      .order('fecha', { ascending: false })
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)
    const { data } = await q
    setCierres(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [desde, hasta])

  async function crearCierre({ fecha, ingresos, gastos, notas }) {
    // Upsert cierre
    const { data: cierre, error } = await supabase
      .from('cierres_caja')
      .upsert({ fecha, notas, total_ingresos: 0, total_gastos: 0 }, { onConflict: 'fecha' })
      .select().single()
    if (error) return { error }

    // Delete previous entries for this date
    await supabase.from('ingresos').delete().eq('cierre_id', cierre.id)
    await supabase.from('gastos').delete().eq('cierre_id', cierre.id)

    // Insert ingresos
    if (ingresos?.length) {
      await supabase.from('ingresos').insert(ingresos.map(i => ({ ...i, cierre_id: cierre.id })))
    }

    // Insert gastos
    if (gastos?.length) {
      await supabase.from('gastos').insert(gastos.map(g => ({ ...g, cierre_id: cierre.id })))
    }

    // Update totals
    const totalIngresos = ingresos?.reduce((s, i) => s + Number(i.monto), 0) ?? 0
    const totalGastos = gastos?.reduce((s, g) => s + Number(g.monto), 0) ?? 0
    await supabase.from('cierres_caja').update({ total_ingresos: totalIngresos, total_gastos: totalGastos }).eq('id', cierre.id)

    await fetch()
    return { data: cierre }
  }

  return { cierres, loading, crearCierre, refetch: fetch }
}

export function useCategorias() {
  const [categorias, setCategorias] = useState([])
  useEffect(() => {
    supabase.from('categorias_gasto').select('*').order('tipo').then(({ data }) => setCategorias(data ?? []))
  }, [])
  return { categorias }
}
