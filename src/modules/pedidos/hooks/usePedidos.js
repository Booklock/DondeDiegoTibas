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

  async function marcarPagado(pedidoId, fecha_pago, categoria_id) {
    const pedido = pedidos.find(p => p.id === pedidoId)
    if (!pedido) return { error: new Error('Pedido no encontrado') }

    const subtotal = (pedido.lineas ?? []).reduce((s, l) => s + Number(l.cantidad) * Number(l.precio_unitario), 0)
    const total = pedido.aplica_iva ? subtotal * 1.13 : subtotal

    const { error: e1 } = await supabase.from('pedidos')
      .update({ pagado: true, fecha_pago })
      .eq('id', pedidoId)
    if (e1) return { error: e1 }

    // Buscar o crear cierre para esa fecha
    let cierreId
    const { data: existe } = await supabase.from('cierres_caja')
      .select('id').eq('fecha', fecha_pago).maybeSingle()
    if (existe) {
      cierreId = existe.id
    } else {
      const { data: nuevo, error: e2 } = await supabase.from('cierres_caja')
        .insert({ fecha: fecha_pago, total_ingresos: 0, total_gastos: 0 })
        .select('id').single()
      if (e2) return { error: e2 }
      cierreId = nuevo.id
    }

    // Insertar gasto
    const descripcion = `Pago pedido — ${pedido.proveedor?.nombre ?? ''}${pedido.numero ? ` #${pedido.numero}` : ''}`
    const { error: e3 } = await supabase.from('gastos').insert({
      cierre_id: cierreId, categoria_id, descripcion, monto: total,
    })
    if (e3) return { error: e3 }

    // Actualizar total_gastos del cierre
    const { data: todosGastos } = await supabase.from('gastos').select('monto').eq('cierre_id', cierreId)
    const nuevoTotal = (todosGastos ?? []).reduce((s, g) => s + Number(g.monto), 0)
    await supabase.from('cierres_caja').update({ total_gastos: nuevoTotal }).eq('id', cierreId)

    await fetch()
    return {}
  }

  return { pedidos, loading, crearPedido, marcarEntregado, cancelarPedido, marcarPagado, refetch: fetch }
}
