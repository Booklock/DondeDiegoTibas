import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export function useProductos() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    setLoading(true)
    const { data } = await supabase
      .from('productos')
      .select(`
        *,
        proveedores:producto_proveedor(
          id, precio_costo, es_principal,
          proveedor:proveedores(id, nombre)
        )
      `)
      .order('nombre')
    setProductos(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  async function crearProducto(data) {
    const { error } = await supabase.from('productos').insert(data)
    if (!error) await fetch()
    return { error }
  }

  async function actualizarProducto(id, data) {
    const { error } = await supabase.from('productos').update(data).eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  async function eliminarProducto(id) {
    const { error } = await supabase.from('productos').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  async function vincularProveedor(producto_id, proveedor_id, precio_costo, es_principal) {
    const { error } = await supabase.from('producto_proveedor').upsert(
      { producto_id, proveedor_id, precio_costo, es_principal },
      { onConflict: 'producto_id,proveedor_id' }
    )
    if (!error) await fetch()
    return { error }
  }

  async function desvincularProveedor(id) {
    const { error } = await supabase.from('producto_proveedor').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  const productosConAlerta = productos.filter(
    p => Number(p.stock_actual) <= Number(p.stock_minimo) && Number(p.stock_minimo) > 0
  )

  return {
    productos, productosConAlerta, loading,
    crearProducto, actualizarProducto, eliminarProducto,
    vincularProveedor, desvincularProveedor,
    refetch: fetch,
  }
}

export function useMovimientos(productoId) {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(false)

  async function fetch() {
    if (!productoId) return
    setLoading(true)
    const { data } = await supabase
      .from('movimientos_inventario')
      .select('*')
      .eq('producto_id', productoId)
      .order('fecha', { ascending: false })
      .limit(50)
    setMovimientos(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [productoId])

  async function registrarMovimiento(data) {
    const { error } = await supabase.from('movimientos_inventario').insert(data)
    if (!error) await fetch()
    return { error }
  }

  return { movimientos, loading, registrarMovimiento, refetch: fetch }
}

export function useVentasProducto({ desde, hasta } = {}) {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      let q = supabase
        .from('movimientos_inventario')
        .select(`
          id, fecha, cantidad, precio_unitario, notas,
          producto:productos(id, nombre, unidad_medida, precio_costo, precio_venta)
        `)
        .eq('tipo', 'salida')
        .eq('es_venta', true)
        .order('fecha', { ascending: false })
      if (desde) q = q.gte('fecha', desde)
      if (hasta) q = q.lte('fecha', hasta)
      const { data } = await q
      setVentas(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [desde, hasta])

  // Agrupado por producto
  const porProducto = ventas.reduce((acc, v) => {
    const id = v.producto?.id
    if (!id) return acc
    if (!acc[id]) acc[id] = {
      producto: v.producto,
      unidades: 0,
      ingresos: 0,
      costo: 0,
    }
    acc[id].unidades += Number(v.cantidad)
    acc[id].ingresos += Number(v.cantidad) * Number(v.precio_unitario ?? v.producto?.precio_venta ?? 0)
    acc[id].costo    += Number(v.cantidad) * Number(v.producto?.precio_costo ?? 0)
    return acc
  }, {})

  const resumen = Object.values(porProducto).map(r => ({
    ...r,
    ganancia: r.ingresos - r.costo,
    margen: r.ingresos > 0 ? ((r.ingresos - r.costo) / r.ingresos) * 100 : 0,
  })).sort((a, b) => b.ingresos - a.ingresos)

  return { ventas, resumen, loading }
}
