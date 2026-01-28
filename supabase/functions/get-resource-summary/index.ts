// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  console.log("[VERSION] 2026-01-28 - GET RESOURCE SUMMARY")

  try {
    const { resourceId, type, language, title, description } = await req.json()

    if (!resourceId) throw new Error("Missing resourceId")

    const RAPID_API_KEY = Deno.env.get("RAPID_API_KEY")
    const GROQ_KEY = Deno.env.get("GROQ_API_KEY")

    if (type === 'youtube' || !type) {
      console.log(`[YOUTUBE] Summarizing video: ${resourceId} (Target Language: ${language || 'it'})`)
      
      let summary = null

      // Tier 1: Try RapidAPI (Transcript based)
      try {
        const res = await fetch(`https://youtube-summarizer2.p.rapidapi.com/summarize?id=${resourceId}`, {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'youtube-summarizer2.p.rapidapi.com',
            'x-rapidapi-key': RAPID_API_KEY
          }
        })

        if (res.ok) {
          const data = await res.json()
          let apiRawContent = data.summary || data.translated_summary || data.text || data.translated_transcript
          
          if (apiRawContent && 
              !apiRawContent.includes("unable to summarize") && 
              !apiRawContent.includes("no content provided") && 
              !apiRawContent.includes("error message")) {
            summary = apiRawContent
            console.log("✅ Tier 1: Summary extracted from YouTube transcript")
          }
        }
      } catch (sumErr) {
        console.warn("⚠️ Tier 1 failed:", sumErr.message)
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
                  content: `Sei un esperto di didattica. Il tuo compito è creare un riassunto concettuale e utile di un video didattico basandoti solo sul titolo e sulla descrizione forniti. 
                  Il riassunto deve essere in ${language === 'it' ? 'Italiano' : language}, asciutto, professionale e focalizzato su COSA l'utente imparerà.
                  Rispondi SOLO con il riassunto (max 3-4 frasi).` 
                },
                { 
                  role: "user", 
                  content: `Titolo: ${title}\nDescrizione: ${description}` 
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

      // Final check and optional translation (if we got a non-target language summary from Tier 1)
      if (summary && GROQ_KEY && (language === 'it' || language === 'es' || language === 'fr')) {
        // Simple internal check: if it looks like English but we want Italian, translate it.
        // For Tier 2 we already requested the target language, so this is mostly for Tier 1 results.
        const isEnglish = /^[A-Za-z0-9\s.,!?'"-]+$/.test(summary.substring(0, 50));
        
        if (isEnglish) {
          console.log(`[GROQ] Ensuring translation to ${language}...`)
          try {
            const translationRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${GROQ_KEY}`,
              },
              body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                  { 
                    role: "system", 
                    content: `Traduci in ${language === 'it' ? 'Italiano' : language}. Rispondi solo con la traduzione.` 
                  },
                  { role: "user", content: summary }
                ],
                temperature: 0.1,
              }),
            })

            if (translationRes.ok) {
              const translationData = await translationRes.json()
              const translatedText = translationData.choices?.[0]?.message?.content?.trim()
              if (translatedText) summary = translatedText
            }
          } catch (transErr) {
            console.error("Translation failed:", transErr.message)
          }
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
