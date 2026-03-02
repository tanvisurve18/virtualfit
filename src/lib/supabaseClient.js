import { createClient } from '@supabase/supabase-js'

// FOR VITE - Use import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔌 Supabase URL:', supabaseUrl)
console.log('🔑 Key starts with:', supabaseAnonKey?.substring(0, 20))

if (!supabaseUrl || supabaseUrl === 'undefined') {
  console.error('❌ VITE_SUPABASE_URL is missing!')
}

if (!supabaseAnonKey || supabaseAnonKey === 'undefined') {
  console.error('❌ VITE_SUPABASE_ANON_KEY is missing!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
})

supabase.auth.getSession()
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Connection failed:', error)
    } else {
      console.log('✅ Supabase connected!')
    }
  })

export default supabase