import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export function useProductos() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    setLoading(true)
    const { data } = await supabase.from('productos').select('*').order('nombre')
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

  const productosConAlerta = productos.filter(p => Number(p.stock_actual) <= Number(p.stock_minimo) && Number(p.stock_minimo) > 0)

  return { productos, productosConAlerta, loading, crearProducto, actualizarProducto, eliminarProducto }
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
      .limit(30)
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
