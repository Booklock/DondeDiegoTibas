// Utilidades para exportar un <canvas> como imagen o PDF y enviarlo
// (descarga o menú de compartir del teléfono), sin dependencias externas.

export function cargarLogo() {
  return new Promise(resolve => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/logo.jpg'
  })
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
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
