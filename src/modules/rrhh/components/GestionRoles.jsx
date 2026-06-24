import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { Table } from '../../../components/ui/Table'
import { Badge } from '../../../components/ui/Badge'
import { Select } from '../../../components/ui/FormField'

const ROLE_COLOR = { dueno: 'orange', empleado: 'blue' }
const ROLE_LABEL = { dueno: 'Dueño', empleado: 'Empleado' }

export function GestionRoles() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [toast, setToast] = useState('')

  async function fetchUsuarios() {
    setLoading(true)
    const { data } = await supabase
      .from('perfiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsuarios(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUsuarios() }, [])

  async function cambiarRol(userId, nuevoRol) {
    setSavingId(userId)
    const { error } = await supabase
      .from('perfiles')
      .update({ rol: nuevoRol })
      .eq('id', userId)
    setSavingId(null)
    if (!error) {
      setUsuarios(u => u.map(p => p.id === userId ? { ...p, rol: nuevoRol } : p))
      setToast('Rol actualizado.')
      setTimeout(() => setToast(''), 2500)
    }
  }

  const columns = [
    {
      key: 'nombre', label: 'Usuario', render: r => (
        <div>
          <p className="font-medium text-gray-900">{r.nombre} {r.apellidos}</p>
          <p className="text-xs text-gray-400">{r.email}</p>
        </div>
      )
    },
    {
      key: 'rol_actual', label: 'Rol actual', render: r => (
        <Badge color={ROLE_COLOR[r.rol]}>{ROLE_LABEL[r.rol]}</Badge>
      )
    },
    {
      key: 'created_at', label: 'Registro', render: r => (
        <span className="text-gray-500 text-xs">
          {new Date(r.created_at).toLocaleDateString('es-CR')}
        </span>
      )
    },
    {
      key: 'cambiar', label: 'Cambiar rol', render: r => (
        <div className="flex items-center gap-2">
          <Select
            className="w-36 py-1.5 text-xs"
            value={r.rol}
            disabled={savingId === r.id}
            onChange={e => cambiarRol(r.id, e.target.value)}
          >
            <option value="empleado">Empleado</option>
            <option value="dueno">Dueño</option>
          </Select>
          {savingId === r.id && (
            <span className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin inline-block" />
          )}
        </div>
      )
    },
  ]

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-gray-500 mb-4">
        Todos los usuarios registrados. Cambiá el rol directamente desde el selector.
      </p>
      <Table columns={columns} data={usuarios} emptyMessage="No hay usuarios registrados" />
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </>
  )
}
