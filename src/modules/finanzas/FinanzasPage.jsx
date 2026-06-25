import { useState, useMemo } from 'react'
import { useCierres } from './hooks/useCierres'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { CierreForm } from './components/CierreForm'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Plus, TrendingUp, TrendingDown, DollarSign, LayoutDashboard, ClipboardList } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n)
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CR') : '—'

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    green:  'bg-green-50 border-green-100 text-green-700',
    red:    'bg-red-50 border-red-100 text-red-700',
    blue:   'bg-blue-50 border-blue-100 text-blue-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
  }
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2 opacity-70">
        <Icon size={16} />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────
function Dashboard() {
  const [periodo, setPeriodo] = useState('semana')
  const hoy = new Date()

  const { desde, hasta } = useMemo(() => {
    const hasta = hoy.toISOString().slice(0, 10)
    let desde
    if (periodo === 'semana') {
      const d = new Date(hoy); d.setDate(d.getDate() - 6)
      desde = d.toISOString().slice(0, 10)
    } else if (periodo === 'mes') {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10)
    } else {
      desde = new Date(hoy.getFullYear(), 0, 1).toISOString().slice(0, 10)
    }
    return { desde, hasta }
  }, [periodo])

  const { cierres, loading } = useCierres({ desde, hasta })

  const totales = useMemo(() => {
    return cierres.reduce((acc, c) => ({
      ingresos: acc.ingresos + Number(c.total_ingresos),
      gastos: acc.gastos + Number(c.total_gastos),
      ganancia: acc.ganancia + Number(c.ganancia_neta),
    }), { ingresos: 0, gastos: 0, ganancia: 0 })
  }, [cierres])

  const chartData = [...cierres].reverse().map(c => ({
    fecha: fmtDate(c.fecha),
    Ingresos: Number(c.total_ingresos),
    Gastos: Number(c.total_gastos),
    Ganancia: Number(c.ganancia_neta),
  }))

  // Gastos por categoría
  const porCategoria = useMemo(() => {
    const map = {}
    cierres.forEach(c => {
      c.gastos?.forEach(g => {
        const cat = g.categoria?.nombre ?? 'Sin categoría'
        map[cat] = (map[cat] || 0) + Number(g.monto)
      })
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [cierres])

  return (
    <>
      <div className="flex gap-2 mb-6">
        {[['semana', 'Últimos 7 días'], ['mes', 'Este mes'], ['año', 'Este año']].map(([id, label]) => (
          <button key={id} onClick={() => setPeriodo(id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${periodo === id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard label="Ingresos" value={fmt(totales.ingresos)} icon={TrendingUp} color="green" />
            <StatCard label="Gastos" value={fmt(totales.gastos)} icon={TrendingDown} color="red" />
            <StatCard label="Ganancia neta" value={fmt(totales.ganancia)} icon={DollarSign} color={totales.ganancia >= 0 ? 'blue' : 'orange'} />
          </div>

          {chartData.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-4">Ingresos vs Gastos por día</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₡${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="#22c55e" radius={[4,4,0,0]} />
                  <Bar dataKey="Gastos" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center text-gray-400 mb-6">
              No hay cierres registrados en este período.
            </div>
          )}

          {porCategoria.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Gastos por categoría</p>
              <div className="space-y-2">
                {porCategoria.map(([cat, total]) => {
                  const pct = totales.gastos > 0 ? (total / totales.gastos) * 100 : 0
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{cat}</span>
                        <span className="font-medium text-gray-800">{fmt(total)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

// ── Registro de cierres ───────────────────────────────────────
function RegistroCierres() {
  const { cierres, loading, crearCierre } = useCierres()
  const [showForm, setShowForm] = useState(false)
  const [expandido, setExpandido] = useState(null)

  async function handleCreate(data) {
    const { error } = await crearCierre(data)
    if (!error) setShowForm(false)
    return { error }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowForm(true)}><Plus size={15} /> Registrar cierre</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : cierres.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No hay cierres registrados aún.</div>
      ) : (
        <div className="space-y-2">
          {cierres.map(c => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpandido(expandido === c.id ? null : c.id)}
              >
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-gray-800">{fmtDate(c.fecha)}</span>
                  <Badge color={Number(c.ganancia_neta) >= 0 ? 'green' : 'red'}>
                    {fmt(Number(c.ganancia_neta))}
                  </Badge>
                </div>
                <div className="flex gap-6 text-sm">
                  <span className="text-green-600">+{fmt(Number(c.total_ingresos))}</span>
                  <span className="text-red-500">-{fmt(Number(c.total_gastos))}</span>
                </div>
              </button>
              {expandido === c.id && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                  {c.ingresos?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ingresos</p>
                      {c.ingresos.map(i => (
                        <div key={i.id} className="flex justify-between text-sm py-1 border-b border-gray-50">
                          <span className="text-gray-600">{i.descripcion || 'Ingreso'}</span>
                          <span className="font-medium text-green-700">{fmt(Number(i.monto))}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {c.gastos?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Gastos</p>
                      {c.gastos.map(g => (
                        <div key={g.id} className="flex justify-between text-sm py-1 border-b border-gray-50">
                          <span className="text-gray-600">{g.descripcion || g.categoria?.nombre || 'Gasto'}</span>
                          <span className="font-medium text-red-600">{fmt(Number(g.monto))}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {c.notas && <p className="text-xs text-gray-400 italic">{c.notas}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Registrar cierre de caja" size="lg">
        <CierreForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      </Modal>
    </>
  )
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'cierres',   label: 'Cierres',   icon: ClipboardList },
]

export default function FinanzasPage() {
  const [tab, setTab] = useState('dashboard')
  return (
    <div className="p-6">
      <PageHeader title="Finanzas" subtitle="Cierres de caja, ingresos y gastos" />
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'cierres'   && <RegistroCierres />}
    </div>
  )
}
