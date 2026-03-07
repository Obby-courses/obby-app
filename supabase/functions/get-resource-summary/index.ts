// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { RESOURCE_STRUCTURED_EXTRACTOR } from "../prompts.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  console.log("[VERSION] 2026-03-07 - GET RESOURCE SUMMARY v2.0")

  try {
    const { resourceId, type, language, title, description, url } = await req.json()

    if (!resourceId && !url) throw new Error("Missing resourceId or url")

    const RAPID_API_KEY = Deno.env.get("RAPID_API_KEY")
    const GROQ_KEY = Deno.env.get("GROQ_API_KEY")

    // The new API needs a full URL. If we only have resourceId (YouTube ID), we reconstruct the URL.
    const finalUrl = url || (resourceId ? `https://www.youtube.com/watch?v=${resourceId}` : null)
    
    if (!finalUrl) throw new Error("Could not determine video URL")

    // Only process videos for now (as before)
    if (type === 'video' || type === 'youtube' || !type) {
      console.log(`[TRANSCRIPT] Summarizing video: ${finalUrl} (Target Language: ${language || 'it'})`)
      
      let summary = null

      // Tier 1: Try RapidAPI (Transcript based via video-transcript-scraper)
      if (RAPID_API_KEY) {
        try {
          const isYoutube = finalUrl.includes("youtube.com") || finalUrl.includes("youtu.be")
          const endpoint = isYoutube 
            ? "https://video-transcript-scraper.p.rapidapi.com/transcript/youtube"
            : "https://video-transcript-scraper.p.rapidapi.com/transcript"

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-rapidapi-host': 'video-transcript-scraper.p.rapidapi.com',
              'x-rapidapi-key': RAPID_API_KEY
            },
            body: JSON.stringify({
              video_url: finalUrl,
              transcript_text: true
            })
          })

          if (res.ok) {
            const data = await res.json()
            const apiRawContent = data.data?.transcript || ""
            
            if (apiRawContent && apiRawContent.length > 50) {
              // If we have substantial raw content, use LLM to "Structure" it
              if (GROQ_KEY) {
                console.log("🤖 Tier 1.5: Structuring info from transcript using Groq...")
                const expansionRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
                  body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                      { role: "system", content: RESOURCE_STRUCTURED_EXTRACTOR },
                      { role: "user", content: `CONTESTO CORSO: ${title || "Generale"}\n\nTRASCRIZIONE:\n${apiRawContent}` }
                    ],
                    temperature: 0.2,
                  }),
                })
                if (expansionRes.ok) {
                  const expData = await expansionRes.json()
                  summary = expData.choices?.[0]?.message?.content?.trim()
                  if (summary) console.log("✅ Tier 1 success: Structured information extracted")
                }
              }

              if (!summary) {
                summary = apiRawContent
                console.log("✅ Tier 1: Raw transcript used directly")
              }
            }
          }
        } catch (sumErr) {
          console.warn("⚠️ Tier 1 failed:", sumErr.message)
        }
      }

      // Tier 2: AI Conceptual Fallback (using Groq)
      if (!summary && GROQ_KEY) {
        console.log("🤖 Tier 2: Generating AI conceptual summary from metadata...")
        try {
          const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GROQ_KEY}`,
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { 
                  role: "system", 
                  content: RESOURCE_STRUCTURED_EXTRACTOR // Use the same structured logic even for metadata
                },
                { 
                  role: "user", 
                  content: `CONTESTO CORSO: ${title}\n\nMETADATI (Titolo e Descrizione):\nTitolo: ${title}\nDescrizione: ${description}` 
                }
              ],
              temperature: 0.3,
            }),
          })

          if (aiRes.ok) {
            const aiData = await aiRes.json()
            summary = aiData.choices?.[0]?.message?.content?.trim()
            if (summary) console.log("✅ Tier 2: AI conceptual summary generated")
          }
        } catch (aiErr) {
          console.error("❌ Tier 2 failed:", aiErr.message)
        }
      }

      if (!summary) {
        return new Response(JSON.stringify({ success: false, error: "Could not generate any summary" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      return new Response(JSON.stringify({ success: true, summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({ success: false, error: "Unsupported resource type" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err: any) {
    console.error(`[ERROR] ${err.message}`)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: corsHeaders
    })
  }
})
