import { createClient } from '@supabase/supabase-js'

// These come from your Supabase project settings (Project Settings > API).
// Set them as environment variables — see README for GitHub Actions/Pages setup.
// They are safe to expose in a frontend bundle: Row Level Security in schema.sql
// is what actually protects the data, not secrecy of these keys.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env.local and fill in your Supabase project values.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
