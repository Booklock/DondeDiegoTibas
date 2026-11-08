import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { usePlanilla } from '../hooks/usePlanilla'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { FormField, Input, Textarea } from '../../../components/ui/FormField'
import { Edit2, Trash2, ChevronDown, ChevronUp, AlertTriangle, CalendarPlus } from 'lucide-react'
import { saldoVacaciones, mesesCompletos, diasNaturales, hoyStr } from '../utils/beneficios'

const fmtFecha = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtDias  = n => `${Number.isInteger(n) ? n : n.toFixed(1)} día${n === 1 ? '' : 's'}`

function FechaIngresoForm({ empleado, onGuardar, onCancel }) {
  const [fecha, setFecha]   = useState(empleado.fecha_ingreso ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleGuardar() {
    if (!fecha) { setError('Elegí una fecha.'); return }
    if (fecha > hoyStr()) { setError('La fecha de ingreso no puede ser futura.'); return }
    setSaving(true)
    const { error: err } = await onGuardar(fecha)
    setSaving(false)
    if (err) setError(err.message)
  }

  return (
    <div className="space-y-4">
      <FormField label="Fecha de ingreso">
        <Input type="date" value={fecha} max={hoyStr()} onChange={e => setFecha(e.target.value)} />
      </FormField>
      {fecha && fecha <= hoyStr() && (
        <p className="text-sm text-gray-500">
          {mesesCompletos(fecha)} meses completos laborados → {fmtDias(mesesCompletos(fecha))} de vacaciones ganados.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleGuardar} loading={saving}>Guardar</Button>
      </div>
    </div>
  )
}

function RegistrarVacacionesForm({ empleado, saldo, onGuardar, onCancel }) {
  const [form, setForm]     = useState({ fecha_inicio: '', fecha_fin: '', dias: '', notas: '' })
  const [diasManual, setDiasManual] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const diasAuto = diasNaturales(form.fecha_inicio, form.fecha_fin)
  const dias     = diasManual ? Number(form.dias) || 0 : diasAuto
  const despues  = saldo.disponibles - dias

  async function handleGuardar() {
    if (!form.fecha_inicio || !form.fecha_fin) { setError('Elegí las fechas de inicio y fin.'); return }
    if (form.fecha_fin < form.fecha_inicio)   { setError('La fecha final no puede ser antes de la inicial.'); return }
    if (dias <= 0)                            { setError('La cantidad de días debe ser mayor a 0.'); return }
    setSaving(true)
    const { error: err } = await onGuardar({
      empleado_id:  empleado.id,
      fecha_inicio: form.fecha_inicio,
      fecha_fin:    form.fecha_fin,
      dias,
      notas:        form.notas.trim() || null,
    })
    setSaving(false)
    if (err) setError(err.message)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">
        Saldo actual: <strong>{fmtDias(saldo.disponibles)}</strong>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Desde">
          <Input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
        </FormField>
        <FormField label="Hasta">
          <Input type="date" value={form.fecha_fin} min={form.fecha_inicio || undefined}
            onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} />
        </FormField>
      </div>
      <FormField label="Días a descontar">
        {diasManual ? (
          <Input type="number" min="0.5" step="0.5" value={form.dias}
            onChange={e => setForm(f => ({ ...f, dias: e.target.value }))} placeholder="Ej: 5" />
        ) : (
          <p className="text-sm text-gray-800 py-2">
            {diasAuto > 0 ? fmtDias(diasAuto) : '—'} <span className="text-gray-400">(días naturales del rango)</span>
          </p>
        )}
        <button type="button" onClick={() => { setDiasManual(m => !m); setForm(f => ({ ...f, dias: String(diasAuto || '') })) }}
          className="text-xs text-brand-600 font-medium hover:underline">
          {diasManual ? 'Usar los días del rango' : 'Cambiar cantidad de días (ej. sin contar días libres)'}
        </button>
      </FormField>
      <FormField label="Notas (opcional)">
        <Textarea rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
      </FormField>
      {dias > 0 && (
        <p className={`text-sm flex items-center gap-1.5 ${despues < 0 ? 'text-red-600' : 'text-gray-600'}`}>
          {despues < 0 && <AlertTriangle size={14} />}
          Saldo después: <strong>{fmtDias(despues)}</strong>
          {despues < 0 && ' — se le estarían adelantando días.'}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleGuardar} loading={saving}>Registrar</Button>
      </div>
    </div>
  )
}

export function VacacionesTab() {
  const { empleados, loading: empLoading, refetch } = usePlanilla()
  const [vacaciones, setVacaciones] = useState([])
  const [error, setError]           = useState('')
  const [abierto, setAbierto]       = useState(null)   // empleado con historial expandido
  const [editIngreso, setEditIngreso] = useState(null)
  const [registrar, setRegistrar]   = useState(null)

  const cargar = useCallback(async () => {
    const { data, error: err } = await supabase.from('vacaciones_planilla')
      .select('*').order('fecha_inicio', { ascending: false })
    setError(err ? `No se pudieron cargar las vacaciones: ${err.message}. ¿Corriste la migración v27?` : '')
    setVacaciones(data ?? [])
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const filas = useMemo(() => empleados.map(emp => ({ emp, saldo: saldoVacaciones(emp, vacaciones) })), [empleados, vacaciones])

  async function guardarIngreso(fecha) {
    const { error: err } = await supabase.from('empleados_planilla').update({ fecha_ingreso: fecha }).eq('id', editIngreso.id)
    if (!err) { setEditIngreso(null); await refetch() }
    return { error: err }
  }

  async function guardarVacaciones(row) {
    const { error: err } = await supabase.from('vacaciones_planilla').insert(row)
    if (!err) { setRegistrar(null); setAbierto(row.empleado_id); await cargar() }
    return { error: err }
  }

  async function eliminarVacaciones(v) {
    if (!confirm(`¿Eliminar el registro de ${fmtDias(Number(v.dias))} (${fmtFecha(v.fecha_inicio)} – ${fmtFecha(v.fecha_fin)})? Los días vuelven al saldo.`)) return
    const { error: err } = await supabase.from('vacaciones_planilla').delete().eq('id', v.id)
    if (err) alert(err.message)
    else await cargar()
  }

  if (empLoading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Cada mes completo laborado suma <strong>1 día</strong> de vacaciones desde la fecha de ingreso.
        Al registrar vacaciones se descuentan del saldo.
      </p>
      {error && <div className="px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700">{error}</div>}

      {filas.length === 0 ? (
        <p className="text-center text-gray-400 py-12 border border-dashed border-gray-200 rounded-xl">No hay empleados activos.</p>
      ) : (
        <div className="space-y-2">
          {filas.map(({ emp, saldo }) => {
            const historial = vacaciones.filter(v => v.empleado_id === emp.id)
            const expandido = abierto === emp.id
            return (
              <div key={emp.id} className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                  <div className="flex-1 min-w-[160px]">
                    <p className="font-semibold text-gray-900">{emp.nombre}</p>
                    <button onClick={() => setEditIngreso(emp)}
                      className="text-xs text-gray-500 hover:text-brand-600 flex items-center gap-1">
                      {emp.fecha_ingreso
                        ? <>Ingreso: {fmtFecha(emp.fecha_ingreso)} · {mesesCompletos(emp.fecha_ingreso)} meses</>
                        : <span className="text-amber-600 font-medium">Falta fecha de ingreso</span>}
                      <Edit2 size={11} />
                    </button>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div><p className="text-[11px] text-gray-400 uppercase">Ganados</p><p className="font-semibold text-gray-700">{saldo.ganados}</p></div>
                    <div><p className="text-[11px] text-gray-400 uppercase">Tomados</p><p className="font-semibold text-gray-700">{saldo.tomados}</p></div>
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase">Disponibles</p>
                      <p className={`font-bold text-lg leading-tight ${saldo.disponibles < 0 ? 'text-red-600' : 'text-blue-700'}`}>{saldo.disponibles}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" onClick={() => setRegistrar({ emp, saldo })} disabled={!emp.fecha_ingreso}
                      title={emp.fecha_ingreso ? '' : 'Primero agregá la fecha de ingreso'}>
                      <CalendarPlus size={14} /> Registrar
                    </Button>
                    <button onClick={() => setAbierto(expandido ? null : emp.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Historial">
                      {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>
                {expandido && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    {historial.length === 0 ? (
                      <p className="text-sm text-gray-400">Sin vacaciones registradas.</p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {historial.map(v => (
                          <li key={v.id} className="flex items-center gap-3 py-2 text-sm">
                            <span className="flex-1 text-gray-700">
                              {fmtFecha(v.fecha_inicio)} – {fmtFecha(v.fecha_fin)}
                              {v.notas && <span className="block text-xs text-gray-400">{v.notas}</span>}
                            </span>
                            <span className="font-semibold text-gray-800">−{fmtDias(Number(v.dias))}</span>
                            <button onClick={() => eliminarVacaciones(v)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Eliminar">
                              <Trash2 size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {editIngreso && (
        <Modal open onClose={() => setEditIngreso(null)} title={`Fecha de ingreso — ${editIngreso.nombre}`} size="sm">
          <FechaIngresoForm empleado={editIngreso} onGuardar={guardarIngreso} onCancel={() => setEditIngreso(null)} />
        </Modal>
      )}

      {registrar && (
        <Modal open onClose={() => setRegistrar(null)} title={`Vacaciones — ${registrar.emp.nombre}`} size="sm">
          <RegistrarVacacionesForm empleado={registrar.emp} saldo={registrar.saldo}
            onGuardar={guardarVacaciones} onCancel={() => setRegistrar(null)} />
        </Modal>
      )}
    </div>
  )
}
