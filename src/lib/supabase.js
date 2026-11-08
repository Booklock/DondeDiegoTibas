import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseMisconfigured = !supabaseUrl || !supabaseAnonKey

export const supabase = supabaseMisconfigured
  ? createClient('https://placeholder.supabase.co', 'placeholder')
  : createClient(supabaseUrl, supabaseAnonKey)

// Supabase devuelve como máximo 1000 filas por consulta. Para rangos largos
// (varios meses de turnos, cierres o gastos) se pide por páginas.
// `buildQuery` debe devolver una consulta nueva con un orden estable.
export async function fetchAll(buildQuery, pageSize = 1000) {
  let all = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1)
    if (error) return { data: all, error }
    all = all.concat(data ?? [])
    if (!data || data.length < pageSize) return { data: all, error: null }
  }
}
