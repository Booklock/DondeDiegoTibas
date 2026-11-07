// Dibuja el horario semanal (Vie → Jue) en un canvas para compartirlo con
// el equipo. Solo muestra nombres, rol y turnos: nunca salarios ni pagos.

import { cargarLogo, roundRect } from '../../../lib/exportarCanvas'

const PAD      = 40
const NAME_W   = 280
const COL_W    = 190
const HEADER_H = 210
const DAYS_H   = 80
const ROW_H    = 96
const FOOTER_H = 90
const W        = PAD * 2 + NAME_W + COL_W * 7

const font = (peso, px) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
const hhmm = t => (t ? t.slice(0, 5) : '')

/**
 * @param {object} opts
 * @param {string} opts.semanaLabel  Ej: "7 nov. – 13 nov."
 * @param {string[]} opts.dias       7 fechas 'YYYY-MM-DD' (Vie → Jue)
 * @param {string[]} opts.diasNombres 7 nombres cortos de día
 * @param {Array<{id:string,nombre:string,rolLabel:string}>} opts.empleados
 * @param {Record<string, object>} opts.turnoMap  clave `${empleado_id}-${fecha}`
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderHorario({ semanaLabel, dias, diasNombres, empleados, turnoMap }) {
  const H = HEADER_H + DAYS_H + Math.max(empleados.length, 1) * ROW_H + FOOTER_H
  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // Encabezado
  ctx.fillStyle = '#1e0505'
  ctx.fillRect(0, 0, W, HEADER_H - 30)
  const logo = await cargarLogo()
  let textX = PAD
  if (logo) {
    const lh = 120
    const lw = Math.min(210, (logo.width / logo.height) * lh)
    ctx.save()
    roundRect(ctx, PAD, 30, lw, lh, 16)
    ctx.clip()
    ctx.drawImage(logo, PAD, 30, lw, lh)
    ctx.restore()
    textX = PAD + lw + 32
  }
  ctx.fillStyle = '#ffffff'
  ctx.font = font(800, 52)
  ctx.fillText('Horario semanal', textX, 90)
  ctx.fillStyle = '#fca5a5'
  ctx.font = font(500, 32)
  ctx.fillText(semanaLabel, textX, 140)

  // Fila de días
  let y = HEADER_H
  ctx.fillStyle = '#fef2f2'
  ctx.fillRect(PAD, y, W - PAD * 2, DAYS_H)
  ctx.fillStyle = '#6b7280'
  ctx.font = font(600, 24)
  ctx.fillText('Empleado', PAD + 20, y + DAYS_H / 2 + 9)
  ctx.textAlign = 'center'
  dias.forEach((d, i) => {
    const cx = PAD + NAME_W + COL_W * i + COL_W / 2
    const [, mm, dd] = d.split('-')
    ctx.fillStyle = '#7f1d1d'
    ctx.font = font(800, 26)
    ctx.fillText(diasNombres[i], cx, y + 34)
    ctx.fillStyle = '#9ca3af'
    ctx.font = font(500, 20)
    ctx.fillText(`${dd}/${mm}`, cx, y + 62)
  })
  ctx.textAlign = 'left'
  y += DAYS_H

  if (empleados.length === 0) {
    ctx.fillStyle = '#6b7280'
    ctx.font = font(500, 30)
    ctx.textAlign = 'center'
    ctx.fillText('No hay empleados en el horario', W / 2, y + ROW_H / 2 + 10)
    ctx.textAlign = 'left'
  }

  empleados.forEach((emp, idx) => {
    if (idx % 2 === 1) {
      ctx.fillStyle = '#fafafa'
      ctx.fillRect(PAD, y, W - PAD * 2, ROW_H)
    }
    ctx.fillStyle = '#e5e7eb'
    ctx.fillRect(PAD, y + ROW_H - 1, W - PAD * 2, 1)

    ctx.fillStyle = '#111827'
    ctx.font = font(700, 28)
    ctx.fillText(emp.nombre, PAD + 20, y + 44, NAME_W - 30)
    ctx.fillStyle = '#9ca3af'
    ctx.font = font(400, 19)
    ctx.fillText(emp.rolLabel ?? '', PAD + 20, y + 72, NAME_W - 30)

    dias.forEach((d, i) => {
      const t  = turnoMap[`${emp.id}-${d}`]
      const x  = PAD + NAME_W + COL_W * i + 8
      const cx = x + (COL_W - 16) / 2
      const bx = { x, y: y + 10, w: COL_W - 16, h: ROW_H - 20 }

      let fondo = null, color = '#d1d5db', l1 = '—', l2 = ''
      if (t?.es_libre) {
        fondo = '#dcfce7'; color = '#15803d'; l1 = 'Libre'
      } else if (t?.incapacitado) {
        fondo = '#e0f2fe'; color = '#0369a1'; l1 = 'Incapacidad'
      } else if (t?.hora_inicio && t?.hora_fin) {
        fondo = t.es_feriado ? '#f3e8ff' : '#fee2e2'
        color = t.es_feriado ? '#7e22ce' : '#7f1d1d'
        l1 = `${hhmm(t.hora_inicio)} – ${hhmm(t.hora_fin)}`
        l2 = t.es_feriado ? 'Feriado' : ''
      } else if (t?.es_feriado) {
        fondo = '#f3e8ff'; color = '#7e22ce'; l1 = 'Feriado'
      }

      if (fondo) {
        roundRect(ctx, bx.x, bx.y, bx.w, bx.h, 14)
        ctx.fillStyle = fondo
        ctx.fill()
      }
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.font = font(700, l1.length > 9 ? 24 : 26)
      ctx.fillText(l1, cx, y + (l2 ? 46 : 56), bx.w - 12)
      if (l2) {
        ctx.font = font(500, 18)
        ctx.fillText(l2, cx, y + 72)
      }
      ctx.textAlign = 'left'
    })
    y += ROW_H
  })

  ctx.fillStyle = '#7f1d1d'
  ctx.font = font(600, 26)
  ctx.textAlign = 'center'
  ctx.fillText('Donde Diego Tibás', W / 2, H - FOOTER_H / 2 + 10)
  ctx.textAlign = 'left'

  return canvas
}
