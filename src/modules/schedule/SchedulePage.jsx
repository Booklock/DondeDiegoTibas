import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTurnos } from './hooks/useTurnos'
import { useAsignaciones, useAsignacionesEmpleado } from './hooks/useAsignaciones'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { TurnoForm } from './components/TurnoForm'
import { AsignacionForm } from './components/AsignacionForm'
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, Edit2, Trash2, CalendarDays } from 'lucide-react'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DIAS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const TURNO_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-teal-100 text-teal-800 border-teal-200',
]

function fmtHora(h) { return h?.slice(0, 5) ?? '' }
function fmtFecha(d) { return new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit' }) }
function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function isoToday() { return localDateStr(new Date()) }

// ── Vista semanal dueño ───────────────────────────────────────
function VistaSemanalDueno() {
  const [weekBase, setWeekBase] = useState(isoToday())
  const { asignaciones, fechas, loading, eliminarAsignacion, refetch } = useAsignaciones(weekBase)
  const [showAsignar, setShowAsignar] = useState(false)

  const turnoColorMap = {}
  asignaciones.forEach((a, i) => {
    if (!turnoColorMap[a.turno_id]) turnoColorMap[a.turno_id] = TURNO_COLORS[Object.keys(turnoColorMap).length % TURNO_COLORS.length]
  })

  function prevWeek() {
    const d = new Date(weekBase + 'T00:00:00'); d.setDate(d.getDate() - 7)
    setWeekBase(localDateStr(d))
  }
  function nextWeek() {
    const d = new Date(weekBase + 'T00:00:00'); d.setDate(d.getDate() + 7)
    setWeekBase(localDateStr(d))
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={18} /></button>
          <span className="text-sm font-medium text-gray-700 min-w-44 text-center">
            {fmtFecha(fechas[0])} – {fmtFecha(fechas[6])}
          </span>
          <button onClick={nextWeek} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight size={18} /></button>
        </div>
        <Button onClick={() => setShowAsignar(true)}>
          <Plus size={15} /> Asignar turno
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-40 px-3 py-2 text-left text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-200">Empleado</th>
                {fechas.map((f, i) => (
                  <th key={f} className={`px-2 py-2 text-center text-xs font-semibold border border-gray-200 ${f === isoToday() ? 'bg-brand-50 text-brand-700' : 'bg-gray-50 text-gray-500'}`}>
                    <div>{DIAS[i]}</div>
                    <div className="font-normal">{fmtFecha(f)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Group by empleado
                const empMap = {}
                asignaciones.forEach(a => {
                  const key = a.empleado_id
                  if (!empMap[key]) empMap[key] = { nombre: `${a.empleado?.perfil?.nombre} ${a.empleado?.perfil?.apellidos}`, dias: {} }
                  empMap[key].dias[a.fecha] = empMap[key].dias[a.fecha] || []
                  empMap[key].dias[a.fecha].push(a)
                })
                const rows = Object.values(empMap)
                if (rows.length === 0) {
                  return (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm border border-gray-200">
                        No hay asignaciones esta semana. Usá "Asignar turno" para agregar.
                      </td>
                    </tr>
                  )
                }
                return rows.map((row, ri) => (
                  <tr key={ri}>
                    <td className="px-3 py-2 text-sm font-medium text-gray-800 border border-gray-200 bg-white whitespace-nowrap">{row.nombre}</td>
                    {fechas.map(f => (
                      <td key={f} className="px-1 py-1 border border-gray-200 bg-white align-top min-w-24">
                        {(row.dias[f] || []).map(a => (
                          <div key={a.id} className={`flex items-center justify-between gap-1 px-2 py-1 rounded-md border text-xs mb-1 ${turnoColorMap[a.turno_id] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            <span className="font-medium truncate">{a.turno?.nombre}</span>
                            <button onClick={() => eliminarAsignacion(a.id)} className="opacity-50 hover:opacity-100 shrink-0">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </td>
                    ))}
                  </tr>
                ))
              })()}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showAsignar} onClose={() => setShowAsignar(false)} title="Asignar turno">
        <AsignacionForm onDone={() => { setShowAsignar(false); refetch() }} onCancel={() => setShowAsignar(false)} />
      </Modal>
    </>
  )
}

// ── Gestión de turnos ────────────────────────────────────────
function GestionTurnos() {
  const { turnos, loading, crearTurno, actualizarTurno, eliminarTurno } = useTurnos()
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)

  async function handleCreate(data) {
    await crearTurno(data)
    setShowForm(false)
  }
  async function handleEdit(data) {
    await actualizarTurno(editando.id, data)
    setEditando(null)
  }
  async function handleDelete(t) {
    if (!confirm(`¿Eliminar turno "${t.nombre}"?`)) return
    await eliminarTurno(t.id)
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowForm(true)}><Plus size={15} /> Nuevo turno</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {turnos.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No hay turnos definidos.</p>}
          {turnos.map(t => (
            <div key={t.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center">
                  <Clock size={16} className="text-brand-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{t.nombre}</p>
                  <p className="text-xs text-gray-500">{fmtHora(t.hora_inicio)} – {fmtHora(t.hora_fin)}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditando(t)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <Edit2 size={14} className="text-gray-500" />
                </button>
                <button onClick={() => handleDelete(t)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo turno">
        <TurnoForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      </Modal>
      {editando && (
        <Modal open onClose={() => setEditando(null)} title="Editar turno">
          <TurnoForm inicial={editando} onSubmit={handleEdit} onCancel={() => setEditando(null)} />
        </Modal>
      )}
    </>
  )
}

// ── Vista empleado ───────────────────────────────────────────
function VistaEmpleadoSchedule() {
  const { perfil } = useAuth()
  const [weekBase, setWeekBase] = useState(isoToday())
  const { asignaciones, fechas, loading } = useAsignacionesEmpleado(perfil?.id, weekBase)

  function prevWeek() {
    const d = new Date(weekBase + 'T00:00:00'); d.setDate(d.getDate() - 7)
    setWeekBase(localDateStr(d))
  }
  function nextWeek() {
    const d = new Date(weekBase + 'T00:00:00'); d.setDate(d.getDate() + 7)
    setWeekBase(localDateStr(d))
  }

  const byFecha = {}
  asignaciones.forEach(a => { byFecha[a.fecha] = byFecha[a.fecha] || []; byFecha[a.fecha].push(a) })

  return (
    <>
      <PageHeader title="Mi horario" subtitle="Tu semana de trabajo" />
      <div className="flex items-center justify-center gap-3 mb-6">
        <button onClick={prevWeek} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
        <span className="text-sm font-medium text-gray-700">{fmtFecha(fechas[0])} – {fmtFecha(fechas[6])}</span>
        <button onClick={nextWeek} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
          {fechas.map((f, i) => {
            const turnos = byFecha[f] || []
            const esHoy = f === isoToday()
            return (
              <div key={f} className={`rounded-xl border p-3 ${esHoy ? 'border-brand-300 bg-brand-50' : 'border-gray-200 bg-white'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${esHoy ? 'text-brand-600' : 'text-gray-400'}`}>{DIAS_FULL[i]}</p>
                <p className={`text-sm font-medium mb-3 ${esHoy ? 'text-brand-800' : 'text-gray-600'}`}>{fmtFecha(f)}</p>
                {turnos.length === 0 ? (
                  <p className="text-xs text-gray-300">Libre</p>
                ) : (
                  turnos.map(a => (
                    <div key={a.id} className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 mb-1">
                      <p className="text-xs font-semibold text-gray-800">{a.turno?.nombre}</p>
                      <p className="text-xs text-gray-500">{fmtHora(a.turno?.hora_inicio)} – {fmtHora(a.turno?.hora_fin)}</p>
                    </div>
                  ))
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ── Página principal ─────────────────────────────────────────
const TABS = [
  { id: 'semana',  label: 'Vista semanal', icon: CalendarDays },
  { id: 'turnos',  label: 'Turnos',        icon: Clock },
]

export default function SchedulePage() {
  const { esDueno } = useAuth()
  const [tab, setTab] = useState('semana')

  if (!esDueno) {
    return <div className="p-6"><VistaEmpleadoSchedule /></div>
  }

  return (
    <div className="p-6">
      <PageHeader title="Horarios" subtitle="Gestioná turnos y asignaciones semanales" />
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>
      {tab === 'semana' && <VistaSemanalDueno />}
      {tab === 'turnos' && <GestionTurnos />}
    </div>
  )
}
