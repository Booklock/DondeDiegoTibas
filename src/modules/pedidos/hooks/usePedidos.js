import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export function usePedidos() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    setLoading(true)
    const { data } = await supabase
      .from('pedidos')
      .select(`
        *,
        proveedor:proveedores(id, nombre),
        lineas:pedido_lineas(*)
      `)
      .order('fecha_pedido', { ascending: false })
    setPedidos(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  async function crearPedido(pedidoData, lineas) {
    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert(pedidoData)
      .select()
      .single()
    if (error) return { error }

    if (lineas.length > 0) {
      const { error: lineasError } = await supabase
        .from('pedido_lineas')
        .insert(lineas.map(l => ({ ...l, pedido_id: pedido.id })))
      if (lineasError) return { error: lineasError }
    }

    await fetch()
    return { data: pedido }
  }

  async function marcarEntregado(pedidoId) {
    const pedido = pedidos.find(p => p.id === pedidoId)
    if (!pedido) return { error: new Error('Pedido no encontrado') }

    const hoy = new Date().toISOString().slice(0, 10)

    const { error: pedidoError } = await supabase
      .from('pedidos')
      .update({ estado: 'entregado', fecha_entrega: hoy })
      .eq('id', pedidoId)
    if (pedidoError) return { error: pedidoError }

    // Crear movimientos de entrada en inventario por cada línea con producto vinculado
    const movimientos = (pedido.lineas ?? [])
      .filter(l => l.producto_id)
      .map(l => ({
        producto_id: l.producto_id,
        tipo: 'entrada',
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        notas: `Pedido entregado${pedido.numero ? ` #${pedido.numero}` : ''}`,
        fecha: hoy,
        es_venta: false,
        es_ajuste: false,
      }))

    if (movimientos.length > 0) {
      const { error: movError } = await supabase
        .from('movimientos_inventario')
        .insert(movimientos)
      if (movError) return { error: movError }
    }

    await fetch()
    return {}
  }

  async function cancelarPedido(pedidoId) {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: 'cancelado' })
      .eq('id', pedidoId)
    if (!error) await fetch()
    return { error }
  }

  return { pedidos, loading, crearPedido, marcarEntregado, cancelarPedido, refetch: fetch }
}
