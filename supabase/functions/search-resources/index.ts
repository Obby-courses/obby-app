// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { RESOURCE_FILTER_PROMPT, RESOURCE_QUERY_EXTRACTOR, USER_RESOURCE_FILTER_PROMPT, USER_RESOURCE_QUERY_PROMPT } from "../prompts.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}



serve(async (req) => {
  // Gestione CORS
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { 
      step_id, 
      step_title, 
      step_description,
      course_title,
      course_description,
      phase_title
    } = await req.json()
    
    console.log(`[TARGET] Elaborazione risorsa per: ${step_title}`)

    if (!step_id || !step_title) {
      throw new Error("Missing step_id or step_title")
    }

    const GROQ_KEY = Deno.env.get("GROQ_API_KEY")
    const YT_KEY = Deno.env.get("YOUTUBE_API_KEY")

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    /* ========== 1) LLM: Refine Search Query ========== */
    let refinedQuery = `${step_title} tutorial lezione basi`

    try {
      if (GROQ_KEY) {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: RESOURCE_QUERY_EXTRACTOR },
              { 
                role: "user", 
                content: USER_RESOURCE_QUERY_PROMPT({
                  courseTitle: course_title || "Generale",
                  courseDescription: course_description || "",
                  phaseTitle: phase_title || "Basi",
                  stepTitle: step_title,
                  stepDescription: step_description || ""
                }) 
              },
            ],
            temperature: 0.1,
            max_tokens: 50
          }),
        })

        const groqData = await groqRes.json()
        const aiQuery = groqData.choices?.[0]?.message?.content?.trim()
        
        if (aiQuery) {
          refinedQuery = aiQuery.replace(/[".]/g, "")
          console.log(`[AI QUERY] Generated: "${refinedQuery}"`)
        }
      }
    } catch (llmErr) {
      console.error("[LLM ERROR] Query refinement failed, using fallback:", llmErr.message)
    }

    /* ========== 2) YouTube Search ========== */
    /* ========== 2) YouTube Search ========== */
    // Search for 5 candidates to filter by relevance (Title/Desc)
    const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=medium&relevanceLanguage=it&maxResults=5&q=${encodeURIComponent(refinedQuery)}&key=${YT_KEY}`

    const ytRes = await fetch(ytUrl)
    const ytData = await ytRes.json()

    if (!ytRes.ok) throw new Error(`YouTube API Error: ${ytRes.status}`)

    let video = null
    const candidates = ytData.items || []

    // 3) AI Filtering (if we have multiple candidates)
    if (candidates.length > 0) {
      // Default to first
      video = candidates[0]

      if (candidates.length > 1 && GROQ_KEY) {
        try {
          const simplifiedCandidates = candidates.map((c: any) => ({
             id: c.id.videoId,
             title: c.snippet.title,
             description: c.snippet.description
          }))

          const filterRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GROQ_KEY}`,
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              temperature: 0.1,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: RESOURCE_FILTER_PROMPT },
                { 
                  role: "user", 
                  content: USER_RESOURCE_FILTER_PROMPT({
                    stepTitle: step_title,
                    stepDescription: step_description || "",
                    candidates: simplifiedCandidates
                  }) 
                },
              ]
            }),
          })
          
          if (filterRes.ok) {
             const filterData = await filterRes.json()
             const choice = JSON.parse(filterData.choices[0].message.content)
             console.log(`[AI FILTER] Selected: ${choice.selected_video_id} - Reason: ${choice.reason}`)
             
             const bestMatch = candidates.find((c: any) => c.id.videoId === choice.selected_video_id)
             if (bestMatch) video = bestMatch
          }
        } catch (filterErr) {
           console.error("[FILTER ERROR] AI filtering failed, using top result:", filterErr)
        }
      }
    }

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
        thumbnail_url: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
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