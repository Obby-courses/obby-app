import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`[delete-user] Request: ${req.method}`)
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[delete-user] Missing Authorization header')
      throw new Error('Manca l\'intestazione di autorizzazione')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[delete-user] Missing environment variables')
      throw new Error('Configurazione server incompleta (chiavi mancanti)')
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get the user from the token to verify it's the right person
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('[delete-user] Auth error:', userError?.message || 'User not found')
      throw new Error('Sessione non valida o scaduta')
    }

    console.log(`[delete-user] Attempting to delete user: ${user.id}`)

    // Create a service role client to perform the deletion
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Delete user from auth.users (this will trigger profile deletion if CASCADE is set)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('[delete-user] Admin delete error:', deleteError.message)
      throw deleteError
    }

    console.log(`[delete-user] Successfully deleted user: ${user.id}`)

    return new Response(
      JSON.stringify({ message: 'Account eliminato con successo' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[delete-user] Catch block:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
