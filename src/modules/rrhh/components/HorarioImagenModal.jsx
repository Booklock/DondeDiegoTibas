import { useEffect, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Download, FileText, Share2 } from 'lucide-react'
import { renderHorario } from '../utils/horarioImagen'
import { canvasToBlob, canvasToPdfBlob, descargarBlob, compartirBlob } from '../../../lib/exportarCanvas'

// Vista previa + descarga del horario semanal como imagen o PDF (sin salarios).
export function HorarioImagenModal({ semanaInicio, semanaLabel, dias, diasNombres, empleados, turnoMap, onClose }) {
  const [canvas, setCanvas]         = useState(null)
  const [preview, setPreview]       = useState('')
  const [trabajando, setTrabajando] = useState('')
  const [error, setError]           = useState('')
  const base = `horario-${semanaInicio}`

  useEffect(() => {
    let vivo = true
    renderHorario({ semanaLabel, dias, diasNombres, empleados, turnoMap }).then(c => {
      if (!vivo) return
      setCanvas(c)
      setPreview(c.toDataURL('image/png'))
    })
    return () => { vivo = false }
  }, [semanaLabel, dias, diasNombres, empleados, turnoMap])

  async function generar(tipo) {
    if (!canvas) return
    setTrabajando(tipo)
    setError('')
    try {
      if (tipo === 'png') {
        descargarBlob(await canvasToBlob(canvas), `${base}.png`)
      } else if (tipo === 'pdf') {
        descargarBlob(await canvasToPdfBlob(canvas), `${base}.pdf`)
      } else {
        const blob = await canvasToBlob(canvas)
        const ok = await compartirBlob(blob, `${base}.png`, 'Horario semanal')
        if (!ok) descargarBlob(blob, `${base}.png`)
      }
    } catch (e) {
      setError(e?.message ?? 'No se pudo generar el archivo.')
    }
    setTrabajando('')
  }

  return (
    <Modal open onClose={onClose} title="Horario para compartir" size="xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Incluye a todos los empleados por horas (también supervisores). No muestra salarios ni pagos.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => generar('png')} loading={trabajando === 'png'} disabled={!canvas}>
            <Download size={14} /> Imagen
          </Button>
          <Button size="sm" variant="secondary" onClick={() => generar('pdf')} loading={trabajando === 'pdf'} disabled={!canvas}>
            <FileText size={14} /> PDF
          </Button>
          <Button size="sm" onClick={() => generar('share')} loading={trabajando === 'share'} disabled={!canvas}>
            <Share2 size={14} /> Compartir
          </Button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {preview
          ? <img src={preview} alt="Vista previa del horario" className="w-full rounded-xl border border-gray-200" />
          : <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>}
      </div>
    </Modal>
  )
}
