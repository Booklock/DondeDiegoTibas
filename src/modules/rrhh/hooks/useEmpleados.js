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

  // Crea usuario nuevo en auth + perfil + empleado
  async function crearEmpleadoNuevo({ nombre, apellidos, email, password, telefono, cedula, puesto, fecha_ingreso, salario }) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, apellidos } }
    })
    if (authError) return { error: authError }

    const userId = authData.user?.id
    if (!userId) return { error: new Error('No se obtuvo ID de usuario.') }

    await supabase.from('perfiles').upsert({
      id: userId, nombre, apellidos, email, rol: 'empleado',
      ...(telefono ? { telefono } : {})
    }, { onConflict: 'id' })

    return crearFichaEmpleado({ perfil_id: userId, cedula, puesto, fecha_ingreso, salario, fecha_inicio: fecha_ingreso })
  }

  // Crea solo la ficha de empleado para un perfil ya existente
  async function crearFichaEmpleado({ perfil_id, cedula, puesto, fecha_ingreso, salario }) {
    const { data: empleadoData, error: empError } = await supabase
      .from('empleados')
      .insert({ perfil_id, cedula, puesto, fecha_ingreso })
      .select()
      .single()
    if (empError) return { error: empError }

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

  return { empleados, loading, crearEmpleadoNuevo, crearFichaEmpleado, actualizarEmpleado, desactivarEmpleado, refetch: fetchEmpleados }
}

// Perfiles que ya tienen cuenta pero no tienen ficha de empleado todavía
export function usePendientes() {
  const [pendientes, setPendientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      // Todos los perfiles
      const { data: perfiles } = await supabase.from('perfiles').select('id, nombre, apellidos, email, rol')
      // IDs que ya tienen empleado
      const { data: empleados } = await supabase.from('empleados').select('perfil_id')
      const conFicha = new Set((empleados ?? []).map(e => e.perfil_id))
      setPendientes((perfiles ?? []).filter(p => !conFicha.has(p.id)))
      setLoading(false)
    }
    fetch()
  }, [])

  return { pendientes, loading }
}
