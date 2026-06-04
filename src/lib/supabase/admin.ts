import { createClient } from '@supabase/supabase-js'

// Admin client for server-side operations that need elevated privileges
// Use this for operations like creating auth users that anon key cannot do
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export { supabaseAdmin }