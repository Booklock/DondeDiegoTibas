// Genera la imagen del ranking (canvas → PNG) y un PDF de una página con esa
// imagen, sin dependencias externas. Pensado para enviar por WhatsApp.

import { cargarLogo, roundRect } from '../../../lib/exportarCanvas'
export { canvasToBlob, canvasToPdfBlob, descargarBlob, compartirBlob } from '../../../lib/exportarCanvas'

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)

const W        = 1080
const HEADER_H = 300
const ROW_H    = 112
const FOOTER_H = 110
const PAD      = 60

const MEDALLAS = { 1: '#d4a017', 2: '#9ca3af', 3: '#b4692f' }

/**
 * @param {object} opts
 * @param {'manager'|'empleado'} opts.modo
 * @param {string} opts.semanaLabel
 * @param {Array<{posicion:number,nombre:string,codigo:number,total:number,diferencia:number,mensaje?:string}>} opts.ranking
 *   `mensaje` (solo modo empleado) reemplaza la diferencia en colones.
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderRanking({ modo, semanaLabel, ranking }) {
  const H = HEADER_H + Math.max(ranking.length, 1) * ROW_H + FOOTER_H
  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const font = (peso, px) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`

  // Fondo
  ctx.fillStyle = '#fef2f2'
  ctx.fillRect(0, 0, W, H)

  // Encabezado
  ctx.fillStyle = '#1e0505'
  ctx.fillRect(0, 0, W, HEADER_H - 40)

  const logo = await cargarLogo()
  let textX = PAD
  if (logo) {
    const lh = 150
    const lw = Math.min(260, (logo.width / logo.height) * lh)
    ctx.save()
    roundRect(ctx, PAD, 55, lw, lh, 20)
    ctx.clip()
    ctx.drawImage(logo, PAD, 55, lw, lh)
    ctx.restore()
    textX = PAD + lw + 36
  }

  ctx.fillStyle = '#ffffff'
  ctx.font = font(800, 54)
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('Competencia de ventas', textX, 115)
  ctx.fillStyle = '#fca5a5'
  ctx.font = font(500, 32)
  ctx.fillText(semanaLabel, textX, 165)
  ctx.fillStyle = '#fecaca'
  ctx.font = font(400, 28)
  ctx.fillText(modo === 'manager' ? 'Total acumulado por vendedor' : 'Diferencia contra el 1er lugar', textX, 210)

  // Filas
  let y = HEADER_H
  if (ranking.length === 0) {
    ctx.fillStyle = '#6b7280'
    ctx.font = font(500, 34)
    ctx.textAlign = 'center'
    ctx.fillText('Todavía no hay ventas registradas esta semana', W / 2, y + ROW_H / 2 + 12)
    ctx.textAlign = 'left'
  }

  for (const r of ranking) {
    const lider = r.posicion === 1
    roundRect(ctx, PAD, y + 10, W - PAD * 2, ROW_H - 20, 22)
    ctx.fillStyle = lider ? '#fff7db' : '#ffffff'
    ctx.fill()
    ctx.lineWidth = lider ? 4 : 2
    ctx.strokeStyle = lider ? '#d4a017' : '#fecaca'
    ctx.stroke()

    // Posición
    const cx = PAD + 62
    const cy = y + ROW_H / 2
    ctx.beginPath()
    ctx.arc(cx, cy, 32, 0, Math.PI * 2)
    ctx.fillStyle = MEDALLAS[r.posicion] ?? '#991b1b'
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = font(800, 32)
    ctx.textAlign = 'center'
    ctx.fillText(String(r.posicion), cx, cy + 11)

    // Nombre
    ctx.textAlign = 'left'
    ctx.fillStyle = '#1f2937'
    ctx.font = font(700, 38)
    ctx.fillText(r.nombre, PAD + 122, cy + 13)

    // Valor
    ctx.textAlign = 'right'
    const derecha = W - PAD - 34
    if (modo === 'manager') {
      ctx.fillStyle = '#991b1b'
      ctx.font = font(800, 38)
      ctx.fillText(fmt(r.total), derecha, cy + 13)
    } else if (lider) {
      ctx.fillStyle = '#a16207'
      ctx.font = font(800, 36)
      ctx.fillText('¡Primer lugar!', derecha, cy + 13)
    } else if (r.mensaje) {
      ctx.fillStyle = '#991b1b'
      ctx.font = font(800, 34)
      ctx.fillText(r.mensaje, derecha, cy + 13)
    } else {
      ctx.fillStyle = '#991b1b'
      ctx.font = font(800, 36)
      ctx.fillText(`− ${fmt(r.diferencia)}`, derecha, cy + 4)
      ctx.fillStyle = '#6b7280'
      ctx.font = font(400, 22)
      ctx.fillText('para alcanzar el 1er lugar', derecha, cy + 34)
    }
    ctx.textAlign = 'left'
    y += ROW_H
  }

  // Pie
  ctx.fillStyle = '#7f1d1d'
  ctx.font = font(600, 30)
  ctx.textAlign = 'center'
  ctx.fillText('¡Vamos con todo!  ·  Donde Diego Tibás', W / 2, H - FOOTER_H / 2 + 10)
  ctx.textAlign = 'left'

  return canvas
}
