import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export function useProveedores() {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    setLoading(true)
    const { data } = await supabase
      .from('proveedores')
      .select(`
        *,
        contactos:contactos_proveedor(*),
        productos:producto_proveedor(
          id, precio_costo, es_principal,
          producto:productos(id, nombre, sku, unidad_medida)
        )
      `)
      .order('nombre')
    setProveedores(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  async function crearProveedor(data) {
    const { error } = await supabase.from('proveedores').insert(data)
    if (!error) await fetch()
    return { error }
  }

  async function actualizarProveedor(id, data) {
    const { error } = await supabase.from('proveedores').update(data).eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  async function toggleActivo(id, activo) {
    await supabase.from('proveedores').update({ activo }).eq('id', id)
    await fetch()
  }

  async function agregarContacto(proveedor_id, data) {
    const { error } = await supabase.from('contactos_proveedor').insert({ proveedor_id, ...data })
    if (!error) await fetch()
    return { error }
  }

  async function eliminarContacto(id) {
    await supabase.from('contactos_proveedor').delete().eq('id', id)
    await fetch()
  }

  async function agregarProducto(proveedorId, datos) {
    const { nombre, sku, unidad_medida, precio_costo, es_principal } = datos
    const { data: prod, error: e1 } = await supabase
      .from('productos')
      .insert({ nombre, sku: sku || null, unidad_medida: unidad_medida || 'unidades', precio_costo: Number(precio_costo) || 0 })
      .select('id')
      .single()
    if (e1) return { error: e1 }
    const { error: e2 } = await supabase
      .from('producto_proveedor')
      .insert({ producto_id: prod.id, proveedor_id: proveedorId, precio_costo: Number(precio_costo) || null, es_principal: !!es_principal })
    if (!e2) await fetch()
    return { error: e2 }
  }

  async function desvincularProducto(vinculoId) {
    await supabase.from('producto_proveedor').delete().eq('id', vinculoId)
    await fetch()
  }

  async function editarProducto(productoId, vinculoId, datos) {
    const { nombre, sku, unidad_medida, precio_costo, es_principal } = datos
    const { error: e1 } = await supabase
      .from('productos')
      .update({ nombre, sku: sku || null, unidad_medida })
      .eq('id', productoId)
    if (e1) return { error: e1 }
    const { error: e2 } = await supabase
      .from('producto_proveedor')
      .update({ precio_costo: Number(precio_costo) || null, es_principal: !!es_principal })
      .eq('id', vinculoId)
    if (!e2) await fetch()
    return { error: e2 }
  }

  return { proveedores, loading, crearProveedor, actualizarProveedor, toggleActivo, agregarContacto, eliminarContacto, agregarProducto, desvincularProducto, editarProducto }
}
