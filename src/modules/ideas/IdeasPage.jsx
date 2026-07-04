import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useEffect } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { FormField, Input, Textarea } from '../../components/ui/FormField'
import { Plus, Pencil, Trash2, Lightbulb } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)

const ESTADOS = [
  { id: 'no_iniciada', label: 'No iniciada',  color: 'gray'   },
  { id: 'en_proceso',  label: 'En proceso',   color: 'blue'   },
  { id: 'completada',  label: 'Completada',   color: 'green'  },
  { id: 'rechazada',   label: 'Rechazada',    color: 'red'    },
]

function estadoInfo(id) {
  return ESTADOS.find(e => e.id === id) ?? ESTADOS[0]
}

// ── Hook ──────────────────────────────────────────────────────
function useIdeas() {
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    const { data } = await supabase
      .from('ideas')
      .select('*')
      .order('created_at', { ascending: false })
    setIdeas(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  async function crearIdea(data) {
    const { error } = await supabase.from('ideas').insert(data)
    if (!error) fetch()
    return { error }
  }

  async function actualizarIdea(id, data) {
    const { error } = await supabase.from('ideas').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) fetch()
    return { error }
  }

  async function eliminarIdea(id) {
    await supabase.from('ideas').delete().eq('id', id)
    fetch()
  }

  return { ideas, loading, crearIdea, actualizarIdea, eliminarIdea }
}

// ── Formulario ────────────────────────────────────────────────
function IdeaForm({ inicial, onSubmit, onCancel, submitLabel = 'Guardar' }) {
  const [form, setForm] = useState({
    titulo: '', descripcion: '', propuesto_por: '', estado: 'no_iniciada', costo_implementacion: '',
    ...inicial,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.titulo.trim()) { setError('El título es requerido.'); return }
    setLoading(true)
    const { error } = await onSubmit({
      titulo:               form.titulo.trim(),
      descripcion:          form.descripcion.trim() || null,
      propuesto_por:        form.propuesto_por.trim() || null,
      estado:               form.estado,
      costo_implementacion: form.costo_implementacion ? Number(form.costo_implementacion) : null,
    })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Título">
        <Input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Nombre de la idea o mejora" />
      </FormField>
      <FormField label="Descripción (opcional)">
        <Textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Detalle de la idea..." />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Propuesto por (opcional)">
          <Input value={form.propuesto_por} onChange={e => set('propuesto_por', e.target.value)} placeholder="Nombre" />
        </FormField>
        <FormField label="Costo estimado (₡, opcional)">
          <Input type="number" min="0" step="0.01" value={form.costo_implementacion}
            onChange={e => set('costo_implementacion', e.target.value)} placeholder="0" />
        </FormField>
      </div>
      <FormField label="Estado">
        <div className="flex flex-wrap gap-2 pt-1">
          {ESTADOS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => set('estado', id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                form.estado === id
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </FormField>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>{submitLabel}</Button>
      </div>
    </form>
  )
}

// ── Card de idea ──────────────────────────────────────────────
function IdeaCard({ idea, onEdit, onDelete, onCambiarEstado }) {
  const { label, color } = estadoInfo(idea.estado)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-gray-900 text-sm">{idea.titulo}</h3>
            <Badge color={color}>{label}</Badge>
          </div>
          {idea.descripcion && (
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{idea.descripcion}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            {idea.propuesto_por && <span>Por: <strong className="text-gray-600">{idea.propuesto_por}</strong></span>}
            {idea.costo_implementacion != null && (
              <span>Costo est.: <strong className="text-gray-600">{fmt(idea.costo_implementacion)}</strong></span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(idea)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
            <Pencil size={13} className="text-gray-400" />
          </button>
          <button onClick={() => onDelete(idea.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
            <Trash2 size={13} className="text-red-400" />
          </button>
        </div>
      </div>

      {/* Cambio rápido de estado */}
      <div className="flex gap-1.5 mt-4 pt-3 border-t border-gray-100">
        {ESTADOS.map(({ id, label: lbl }) => (
          <button
            key={id}
            onClick={() => onCambiarEstado(idea.id, id)}
            disabled={idea.estado === id}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              idea.estado === id
                ? 'bg-brand-600 text-white cursor-default'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────
const FILTROS = [
  { id: 'todas',      label: 'Todas'       },
  { id: 'no_iniciada', label: 'No iniciadas' },
  { id: 'en_proceso',  label: 'En proceso'  },
  { id: 'completada',  label: 'Completadas' },
  { id: 'rechazada',   label: 'Rechazadas'  },
]

export default function IdeasPage() {
  const { ideas, loading, crearIdea, actualizarIdea, eliminarIdea } = useIdeas()
  const [filtro, setFiltro] = useState('todas')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [toast, setToast] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const ideasFiltradas = useMemo(() => (
    filtro === 'todas' ? ideas : ideas.filter(i => i.estado === filtro)
  ), [ideas, filtro])

  async function handleCrear(data) {
    const { error } = await crearIdea(data)
    if (error) return { error }
    setShowForm(false)
    showToast('Idea registrada.')
    return {}
  }

  async function handleEditar(data) {
    const { error } = await actualizarIdea(editando.id, data)
    if (error) return { error }
    setEditando(null)
    showToast('Idea actualizada.')
    return {}
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta idea?')) return
    await eliminarIdea(id)
    showToast('Idea eliminada.')
  }

  async function handleCambiarEstado(id, nuevoEstado) {
    await actualizarIdea(id, { estado: nuevoEstado })
  }

  const conteos = useMemo(() => {
    const c = {}
    ESTADOS.forEach(e => { c[e.id] = ideas.filter(i => i.estado === e.id).length })
    return c
  }, [ideas])

  return (
    <div className="p-6">
      <PageHeader
        title="Ideas y mejoras"
        subtitle={`${ideas.length} ideas registradas`}
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nueva idea
          </Button>
        }
      />

      {/* Resumen por estado */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {ESTADOS.map(({ id, label, color }) => (
          <button
            key={id}
            onClick={() => setFiltro(filtro === id ? 'todas' : id)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              filtro === id ? 'ring-2 ring-brand-500' : 'hover:border-gray-300'
            } bg-white border-gray-200`}
          >
            <p className="text-2xl font-bold text-gray-900">{conteos[id]}</p>
            <Badge color={color} className="mt-1">{label}</Badge>
          </button>
        ))}
      </div>

      {/* Filtro tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {FILTROS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFiltro(id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtro === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ideasFiltradas.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          <Lightbulb size={32} className="mx-auto mb-3 opacity-30" />
          {filtro === 'todas' ? 'No hay ideas registradas.' : 'No hay ideas con este estado.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {ideasFiltradas.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onEdit={setEditando}
              onDelete={handleDelete}
              onCambiarEstado={handleCambiarEstado}
            />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nueva idea" size="lg">
        <IdeaForm onSubmit={handleCrear} onCancel={() => setShowForm(false)} submitLabel="Agregar idea" />
      </Modal>

      {editando && (
        <Modal open onClose={() => setEditando(null)} title="Editar idea" size="lg">
          <IdeaForm
            inicial={editando}
            onSubmit={handleEditar}
            onCancel={() => setEditando(null)}
            submitLabel="Guardar cambios"
          />
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
