import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export function useProveedores() {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    setLoading(true)
    const { data } = await supabase
      .from('proveedores')
      .select('*, contactos:contactos_proveedor(*)')
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

  return { proveedores, loading, crearProveedor, actualizarProveedor, toggleActivo, agregarContacto, eliminarContacto }
}
