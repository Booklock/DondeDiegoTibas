import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseMisconfigured = !supabaseUrl || !supabaseAnonKey

export const supabase = supabaseMisconfigured
  ? createClient('https://placeholder.supabase.co', 'placeholder')
  : createClient(supabaseUrl, supabaseAnonKey)
