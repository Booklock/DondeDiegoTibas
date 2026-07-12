import { useState } from 'react'
import { usePagos } from './hooks/usePagos'
import { useProveedores } from '../proveedores/hooks/useProveedores'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import { Plus, Copy, CheckCircle, Trash2, Building2, CreditCard } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)
const fmtDateTime = d => d ? new Date(d).toLocaleString('es-CR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

// ── Formulario de registro ─────────────────────────────────────
function RegistrarPagoForm({ onSubmit, onCancel }) {
  const { proveedores } = useProveedores()
  const [form, setForm] = useState({
    proveedor_id: '', proveedor_nombre: '', banco: '', cuenta_bancaria: '',
    concepto: '', monto: '', notas: '',
  })
  const [saving, setSaving] = useState(false)

  function handleProveedorChange(id) {
    if (!id) {
      setForm(f => ({ ...f, proveedor_id: '', proveedor_nombre: '', banco: '', cuenta_bancaria: '' }))
      return
    }
    const prov = proveedores.find(p => p.id === id)
    setForm(f => ({
      ...f,
      proveedor_id: id,
      proveedor_nombre: prov?.nombre ?? '',
      banco: prov?.banco ?? '',
      cuenta_bancaria: prov?.cuenta_bancaria ?? '',
    }))
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.concepto || !form.monto) return
    setSaving(true)
    const { error } = await onSubmit({
      proveedor_id: form.proveedor_id || null,
      proveedor_nombre: form.proveedor_nombre || null,
      banco: form.banco || null,
      cuenta_bancaria: form.cuenta_bancaria || null,
      concepto: form.concepto,
      monto: Number(form.monto),
      notas: form.notas || null,
    })
    setSaving(false)
    if (!error) onCancel()
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
        <select
          value={form.proveedor_id}
          onChange={e => handleProveedorChange(e.target.value)}
          className={inputCls}
        >
          <option value="">— Manual / sin proveedor registrado —</option>
          {proveedores.filter(p => p.activo).map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      {!form.proveedor_id && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / destinatario</label>
          <input
            value={form.proveedor_nombre}
            onChange={set('proveedor_nombre')}
            className={inputCls}
            placeholder="Ej: Juan Pérez, SINPE personal..."
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
          <input value={form.banco} onChange={set('banco')} className={inputCls} placeholder="Ej: BAC, BCR..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta / SINPE</label>
          <input value={form.cuenta_bancaria} onChange={set('cuenta_bancaria')} className={inputCls} placeholder="Número de cuenta o teléfono" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
        <input
          required
          value={form.concepto}
          onChange={set('concepto')}
          className={inputCls}
          placeholder="Ej: Pago semanal verduras, factura #123..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
        <input
          required
          type="number"
          min="1"
          step="1"
          value={form.monto}
          onChange={set('monto')}
          className={inputCls}
          placeholder="0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea
          value={form.notas}
          onChange={set('notas')}
          rows={2}
          className={inputCls + ' resize-none'}
          placeholder="Observaciones adicionales..."
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={saving} className="flex-1">Registrar pago pendiente</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  )
}

// ── Card de pago pendiente ─────────────────────────────────────
function PagoCard({ pago, onPagar, onEliminar }) {
  const [confirmando, setConfirmando] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handlePagar() {
    if (!confirmando) { setConfirmando(true); return }
    setLoading(true)
    await onPagar(pago)
    setLoading(false)
    setConfirmando(false)
  }

  function copy(text) {
    navigator.clipboard?.writeText(text).catch(() => {})
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Proveedor + monto */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-base truncate">
            {pago.proveedor_nombre ?? 'Sin proveedor'}
          </p>
          {pago.notas && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{pago.notas}</p>
          )}
        </div>
        <p className="text-xl font-bold text-brand-700 shrink-0 whitespace-nowrap">{fmt(pago.monto)}</p>
      </div>

      {/* Datos bancarios */}
      {(pago.banco || pago.cuenta_bancaria) && (
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 space-y-1.5">
          {pago.banco && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Building2 size={13} className="shrink-0" />
              <span>{pago.banco}</span>
            </div>
          )}
          {pago.cuenta_bancaria && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-800 font-semibold">
                <CreditCard size={13} className="text-gray-400 shrink-0" />
                <span className="font-mono">{pago.cuenta_bancaria}</span>
              </div>
              <button
                onClick={() => copy(pago.cuenta_bancaria)}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                title="Copiar"
              >
                <Copy size={12} className="text-gray-400" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Concepto */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Concepto</p>
        <p className="text-sm text-gray-800">{pago.concepto}</p>
      </div>

      {/* Quién registró */}
      <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
        Registrado por{' '}
        <span className="font-medium text-gray-600">
          {pago.registrado?.nombre ?? 'alguien'}
        </span>
        {' · '}{fmtDateTime(pago.fecha_registro)}
      </p>

      {/* Acciones */}
      <div className="flex gap-2">
        <button
          onClick={handlePagar}
          disabled={loading}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            confirmando
              ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
              : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
          } disabled:opacity-50`}
        >
          <CheckCircle size={15} />
          {loading ? 'Guardando...' : confirmando ? '¿Confirmar pago?' : 'Marcar como pagado'}
        </button>
        {confirmando ? (
          <button
            onClick={() => setConfirmando(false)}
            className="px-3 py-2.5 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        ) : (
          <button
            onClick={() => onEliminar(pago.id)}
            className="p-2.5 hover:bg-red-50 rounded-xl transition-colors border border-gray-200"
            title="Eliminar"
          >
            <Trash2 size={15} className="text-red-400" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────
export default function PagosPage() {
  const { pendientes, historial, loading, registrarPago, marcarPagado, eliminarPago } = usePagos()
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState('pendientes')
  const [toastMsg, setToastMsg] = useState('')

  function toast(msg) { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3500) }

  async function handlePagar(pago) {
    const { error } = await marcarPagado(pago)
    if (error) toast('Error al registrar el pago: ' + error.message)
    else toast('Pago registrado y guardado como gasto operativo.')
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar este pago pendiente?')) return
    await eliminarPago(id)
    toast('Pago eliminado.')
  }

  const histCols = [
    {
      key: 'proveedor_nombre',
      label: 'Proveedor',
      render: r => (
        <div>
          <p className="font-medium text-gray-900">{r.proveedor_nombre ?? '—'}</p>
          {r.banco && <p className="text-xs text-gray-400">{r.banco}</p>}
        </div>
      ),
    },
    { key: 'concepto',   label: 'Concepto',  render: r => <span className="text-sm">{r.concepto}</span> },
    { key: 'monto',      label: 'Monto',     render: r => <span className="font-semibold text-brand-700">{fmt(r.monto)}</span> },
    { key: 'fecha_pago', label: 'Pagado',    render: r => fmtDate(r.fecha_pago) },
    {
      key: 'pagado_por',
      label: 'Pagado por',
      render: r => (
        <div>
          <p className="text-sm text-gray-700">{r.pagado?.nombre ?? '—'}</p>
          <p className="text-xs text-gray-400">reg. por {r.registrado?.nombre ?? '—'}</p>
        </div>
      ),
    },
  ]

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Pagos"
        subtitle="Coordiná los pagos pendientes a proveedores"
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Registrar pago
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        <button
          onClick={() => setTab('pendientes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            tab === 'pendientes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Pendientes
          {pendientes.length > 0 && (
            <span className="bg-brand-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
              {pendientes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            tab === 'historial' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Historial
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'pendientes' ? (
        pendientes.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-3">✅</p>
            <p className="font-semibold text-gray-600 text-lg">Todo al día</p>
            <p className="text-sm mt-1">No hay pagos pendientes. Usá "Registrar pago" para agregar uno.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendientes.map(p => (
              <PagoCard key={p.id} pago={p} onPagar={handlePagar} onEliminar={handleEliminar} />
            ))}
          </div>
        )
      ) : (
        <Table columns={histCols} data={historial} emptyMessage="Sin pagos registrados todavía." />
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Registrar pago pendiente" size="md">
        <RegistrarPagoForm onSubmit={registrarPago} onCancel={() => setShowForm(false)} />
      </Modal>

      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
