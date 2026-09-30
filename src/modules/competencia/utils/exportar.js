// Genera la imagen del ranking (canvas → PNG) y un PDF de una página con esa
// imagen, sin dependencias externas. Pensado para enviar por WhatsApp.

const fmt = n => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)

const W        = 1080
const HEADER_H = 300
const ROW_H    = 112
const FOOTER_H = 110
const PAD      = 60

const MEDALLAS = { 1: '#d4a017', 2: '#9ca3af', 3: '#b4692f' }

function cargarLogo() {
  return new Promise(resolve => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/logo.jpg'
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * @param {object} opts
 * @param {'manager'|'empleado'} opts.modo
 * @param {string} opts.semanaLabel
 * @param {Array<{posicion:number,nombre:string,codigo:number,total:number,diferencia:number}>} opts.ranking
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

export function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality))
}

/** PDF de una página que contiene el canvas como imagen JPEG a página completa. */
export async function canvasToPdfBlob(canvas) {
  const jpeg  = new Uint8Array(await (await canvasToBlob(canvas, 'image/jpeg', 0.92)).arrayBuffer())
  const pageW = 595.28 // ancho A4 en puntos
  const pageH = +(pageW * canvas.height / canvas.width).toFixed(2)

  const enc     = new TextEncoder()
  const partes  = []
  const offsets = []
  let largo = 0
  const push = chunk => {
    const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk
    partes.push(bytes)
    largo += bytes.length
  }
  const obj = (n, cuerpo) => { offsets[n] = largo; push(`${n} 0 obj\n${cuerpo}\nendobj\n`) }

  const contenido = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`

  push('%PDF-1.4\n')
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`)
  offsets[4] = largo
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`)
  push(jpeg)
  push('\nendstream\nendobj\n')
  obj(5, `<< /Length ${contenido.length} >>\nstream\n${contenido}endstream`)

  const xref = largo
  let tabla = 'xref\n0 6\n0000000000 65535 f \n'
  for (let i = 1; i <= 5; i++) tabla += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  push(tabla)
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

  return new Blob(partes, { type: 'application/pdf' })
}

export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Usa el menú de compartir del teléfono (WhatsApp, etc.). Devuelve false si no está disponible. */
export async function compartirBlob(blob, nombre, titulo) {
  const file = new File([blob], nombre, { type: blob.type })
  if (!navigator.canShare?.({ files: [file] })) return false
  try {
    await navigator.share({ files: [file], title: titulo })
  } catch (e) {
    if (e?.name !== 'AbortError') throw e
  }
  return true
}
