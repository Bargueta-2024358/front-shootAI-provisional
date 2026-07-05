import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://qoukpzswuqihnzqhupkq.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvdWtwenN3dXFpaG56cWh1cGtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxOTUzNDksImV4cCI6MjA5ODc3MTM0OX0.t3Gx-l91DcoYrptYvPUuNbEti4JSIeCizhxMgCZYgLo'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: false,
    persistSession: false,
    autoRefreshToken: false,
  },
})
