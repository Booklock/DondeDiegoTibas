import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export function useEmpleados() {
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchEmpleados() {
    setLoading(true)
    const { data } = await supabase
      .from('empleados')
      .select(`
        *,
        perfil:perfiles(nombre, apellidos, email, telefono),
        salario_actual:salarios(monto, fecha_inicio)
      `)
      .order('created_at', { ascending: false })
    setEmpleados(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchEmpleados() }, [])

  async function crearEmpleadoConPerfil({ nombre, apellidos, email, password, telefono, cedula, puesto, fecha_ingreso, salario }) {
    // 1. Create auth user via admin (from client: invite user)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, apellidos, rol: 'empleado' }
      }
    })
    if (authError) return { error: authError }

    const userId = authData.user?.id
    if (!userId) return { error: new Error('No user id returned') }

    // Update perfil with phone
    if (telefono) {
      await supabase.from('perfiles').update({ telefono }).eq('id', userId)
    }

    // 2. Create empleado record
    const { data: empleadoData, error: empError } = await supabase
      .from('empleados')
      .insert({ perfil_id: userId, cedula, puesto, fecha_ingreso })
      .select()
      .single()
    if (empError) return { error: empError }

    // 3. Create initial salary
    if (salario) {
      await supabase.from('salarios').insert({
        empleado_id: empleadoData.id,
        monto: salario,
        fecha_inicio: fecha_ingreso,
      })
    }

    await fetchEmpleados()
    return { data: empleadoData }
  }

  async function actualizarEmpleado(empleadoId, perfilId, fields) {
    const { nombre, apellidos, telefono, cedula, puesto, estado, salario } = fields

    await supabase.from('perfiles').update({ nombre, apellidos, telefono }).eq('id', perfilId)
    await supabase.from('empleados').update({ cedula, puesto, estado }).eq('id', empleadoId)

    if (salario !== undefined) {
      // Close current salary and open new one
      const today = new Date().toISOString().slice(0, 10)
      await supabase
        .from('salarios')
        .update({ fecha_fin: today })
        .eq('empleado_id', empleadoId)
        .is('fecha_fin', null)

      await supabase.from('salarios').insert({
        empleado_id: empleadoId,
        monto: salario,
        fecha_inicio: today,
      })
    }

    await fetchEmpleados()
  }

  async function desactivarEmpleado(empleadoId) {
    await supabase.from('empleados').update({ estado: 'inactivo' }).eq('id', empleadoId)
    await fetchEmpleados()
  }

  return { empleados, loading, crearEmpleadoConPerfil, actualizarEmpleado, desactivarEmpleado, refetch: fetchEmpleados }
}
