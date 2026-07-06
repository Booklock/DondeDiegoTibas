// Edge Function: enviar-colilla
// Deploy: supabase functions deploy enviar-colilla
// Requiere env: RESEND_API_KEY (configurar en Supabase Dashboard > Edge Functions > Secrets)
// El email del empleado se obtiene de la tabla perfiles buscando por nombre,
// o pasarlo directamente en el body como "email_destino"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL     = 'colillas@dondediegotibas.com' // cambiar al dominio verificado en Resend

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY no configurada. Agregala en Supabase Dashboard > Edge Functions > Secrets.' }), { status: 500 })
  }

  const body = await req.json()
  const { empleado_nombre, email_destino, semana_inicio, semana_fin, bruto, ccss, neto, filas } = body

  if (!email_destino) {
    return new Response(JSON.stringify({ error: 'email_destino es requerido.' }), { status: 400 })
  }

  const filasHtml = (filas ?? []).map((f: any) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 4px;">${f.fecha}</td>
      <td style="padding: 8px 4px; text-align:center;">${f.entrada}</td>
      <td style="padding: 8px 4px; text-align:center;">${f.salida}</td>
      <td style="padding: 8px 4px; text-align:center;">${f.ordH}h</td>
      <td style="padding: 8px 4px; text-align:center; color:#ea580c;">${f.extH > 0 ? `${f.extH}h` : '—'}</td>
      <td style="padding: 8px 4px; text-align:right;">${fmt(f.montoOrd)}</td>
      <td style="padding: 8px 4px; text-align:right; color:#ea580c;">${f.montoExt > 0 ? fmt(f.montoExt) : '—'}</td>
    </tr>
  `).join('')

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Colilla de Pago</title></head>
<body style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #111;">
  <div style="border-bottom: 3px solid #7f1d1d; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="margin:0; color:#7f1d1d; font-size:22px;">Donde Diego Tibas</h1>
    <p style="margin:4px 0 0; color:#6b7280; font-size:14px;">Chicharronera — Colilla de Pago</p>
  </div>
  <p style="font-size:14px; color:#374151;"><strong>${empleado_nombre}</strong> — Semana ${semana_inicio} al ${semana_fin}</p>
  <table width="100%" style="border-collapse:collapse; font-size:13px; margin: 16px 0;">
    <thead>
      <tr style="background:#f3f4f6; border-bottom: 2px solid #d1d5db;">
        <th style="padding:8px 4px; text-align:left;">Fecha</th>
        <th style="padding:8px 4px; text-align:center;">Entrada</th>
        <th style="padding:8px 4px; text-align:center;">Salida</th>
        <th style="padding:8px 4px; text-align:center;">Hrs ord.</th>
        <th style="padding:8px 4px; text-align:center; color:#ea580c;">Hrs ext.</th>
        <th style="padding:8px 4px; text-align:right;">Monto ord.</th>
        <th style="padding:8px 4px; text-align:right; color:#ea580c;">Monto ext.</th>
      </tr>
    </thead>
    <tbody>${filasHtml}</tbody>
  </table>
  <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin-top:16px;">
    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px;">
      <span>Salario bruto</span><strong>${fmt(bruto)}</strong>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px; color:#dc2626;">
      <span>(-) CCSS trabajador (10.83%)</span><span>-${fmt(ccss)}</span>
    </div>
    <div style="display:flex; justify-content:space-between; border-top:2px solid #d1d5db; padding-top:12px; font-size:16px; font-weight:bold;">
      <span>Salario neto</span><span style="color:#7f1d1d;">${fmt(neto)}</span>
    </div>
  </div>
  <p style="font-size:12px; color:#9ca3af; margin-top:24px;">Generado automáticamente por el sistema de Donde Diego Tibas.</p>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to: email_destino, subject: `Colilla de pago — ${empleado_nombre} (${semana_inicio})`, html }),
  })

  if (!res.ok) {
    const err = await res.text()
    return new Response(JSON.stringify({ error: `Resend error: ${err}` }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
