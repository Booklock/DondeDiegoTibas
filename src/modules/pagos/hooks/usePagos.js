import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'

export function usePagos() {
  const [pendientes, setPendientes] = useState([])
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const { perfil } = useAuth()

  async function fetchAll() {
    setLoading(true)
    const [{ data: pend }, { data: hist }] = await Promise.all([
      supabase
        .from('pagos_pendientes')
        .select('*, registrado:perfiles!registrado_por(nombre, apellidos)')
        .eq('estado', 'pendiente')
        .order('fecha_registro'),
      supabase
        .from('pagos_pendientes')
        .select('*, registrado:perfiles!registrado_por(nombre, apellidos), pagado:perfiles!pagado_por(nombre, apellidos)')
        .eq('estado', 'pagado')
        .order('fecha_pago', { ascending: false })
        .limit(60),
    ])
    setPendientes(pend ?? [])
    setHistorial(hist ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  async function registrarPago(data) {
    const { error } = await supabase.from('pagos_pendientes').insert({
      ...data,
      registrado_por: perfil?.id ?? null,
    })
    if (!error) await fetchAll()
    return { error }
  }

  async function marcarPagado(pago) {
    const now = new Date().toISOString()
    const today = now.slice(0, 10)

    const { error: e1 } = await supabase
      .from('pagos_pendientes')
      .update({ estado: 'pagado', pagado_por: perfil?.id ?? null, fecha_pago: now })
      .eq('id', pago.id)
    if (e1) return { error: e1 }

    const { error: e2 } = await supabase.from('gastos_operativos').insert({
      fecha: today,
      proveedor: pago.proveedor_nombre ?? null,
      descripcion: pago.concepto,
      monto: pago.monto,
      pagado_desde_caja: false,
    })

    await fetchAll()
    return { error: e2 }
  }

  async function eliminarPago(id) {
    await supabase.from('pagos_pendientes').delete().eq('id', id)
    await fetchAll()
  }

  return { pendientes, historial, loading, registrarPago, marcarPagado, eliminarPago }
}
