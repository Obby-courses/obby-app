// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Gestione CORS
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { step_id, step_title, step_description } = await req.json()
    
    console.log(`[TARGET] Elaborazione risorsa per: ${step_title}`)

    if (!step_id || !step_title) {
      throw new Error("Missing step_id or step_title")
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // 1. Ricerca su YouTube
    const YT_KEY = Deno.env.get("YOUTUBE_API_KEY")
    const query = `${step_title} tutorial`
    const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${YT_KEY}`

    const ytRes = await fetch(ytUrl)
    const ytData = await ytRes.json()

    if (!ytRes.ok) throw new Error(`YouTube API Error: ${ytRes.status}`)

    const video = ytData.items?.[0]
    if (!video) {
      console.log(`[SKIP] Nessun video trovato per: ${step_title}`)
      return new Response(JSON.stringify({ success: false, message: "No video found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 2. Inserimento nella tabella 'resources' (corrispondente alle tue colonne)
    const { data, error: insertError } = await supabase
      .from("resources")
      .insert({
        step_id: step_id,
        title: video.snippet.title,
        url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
        type: "video",
        // Aggiungiamo metadati se vuoi popolare tags o livelli
        tags: ["auto-generated"],
        min_level: 1,
        max_level: 5
      })
      .select()

    if (insertError) throw insertError

    console.log(`✅ Risorsa creata con successo per lo step: ${step_title}`)

    return new Response(JSON.stringify({ success: true, resource: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err) {
    console.error(`[ERROR FIGLIA] ${err.message}`)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: corsHeaders
    })
  }
})