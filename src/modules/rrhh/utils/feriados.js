// Costa Rica official holidays calculator

function pascua(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getFeriadosCR(year) {
  const easter = pascua(year)
  const list = [
    { fecha: `${year}-01-01`, nombre: 'Año Nuevo' },
    { fecha: `${year}-04-11`, nombre: 'Juan Santamaría' },
    { fecha: toStr(addDays(easter, -3)), nombre: 'Jueves Santo' },
    { fecha: toStr(addDays(easter, -2)), nombre: 'Viernes Santo' },
    { fecha: `${year}-05-01`, nombre: 'Día del Trabajo' },
    { fecha: `${year}-07-25`, nombre: 'Anexión de Guanacaste' },
    { fecha: `${year}-08-02`, nombre: 'Virgen de los Ángeles' },
    { fecha: `${year}-08-15`, nombre: 'Día de la Madre' },
    { fecha: `${year}-09-15`, nombre: 'Independencia' },
    { fecha: `${year}-10-12`, nombre: 'Día de la Cultura' },
    { fecha: `${year}-12-25`, nombre: 'Navidad' },
  ]
  const set = new Set(list.map(f => f.fecha))
  return { list, set }
}

export function esFeriadoCR(fechaStr) {
  const year = Number(fechaStr.slice(0, 4))
  return getFeriadosCR(year).set.has(fechaStr)
}
