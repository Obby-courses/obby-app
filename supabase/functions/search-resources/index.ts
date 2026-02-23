// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { RESOURCE_FILTER_PROMPT, RESOURCE_QUERY_EXTRACTOR, USER_RESOURCE_FILTER_PROMPT, USER_RESOURCE_QUERY_PROMPT } from "../prompts.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Gestione CORS
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  console.log("[VERSION] 2026-01-26 23:00 - MODULAR RESOURCE SEARCH (NO DB)")

  try {
    const { 
      step_title, 
      step_description,
      course_title,
      course_description,
      phase_title,
      primaryLanguage,
      secondaryLanguages,
    } = await req.json()
    
    console.log(`[TARGET] Searching resource for: ${step_title}`)
    console.log(`[LANG] Primary: ${primaryLanguage}, Secondary: ${JSON.stringify(secondaryLanguages)}`)

    // Language strategy:
    // - Primary: 'it' (Italian) — always the system base language
    // - Secondary: ['en'] minimum — English is always the mandatory fallback
    const LANG_NAMES: Record<string, string> = {
      it: 'italiano', en: 'english', es: 'español', fr: 'français', de: 'deutsch', pt: 'português'
    }
    const primaryLang = primaryLanguage || 'it'
    let secondaryLangs: string[] = secondaryLanguages || ['en']
    // Always ensure English is in the secondary list as fallback
    if (!secondaryLangs.includes('en')) {
      secondaryLangs = ['en', ...secondaryLangs]
    }
    const primaryLangName = LANG_NAMES[primaryLang] || 'italiano'
    const secondaryLangNames = secondaryLangs
      .filter((l: string) => l !== primaryLang)
      .map((l: string) => LANG_NAMES[l] || l)
    const langHint = secondaryLangNames.length > 0
      ? `${primaryLangName} OR ${secondaryLangNames.join(' OR ')}`
      : primaryLangName

    if (!step_title) {
      throw new Error("Missing step_title")
    }

    const GROQ_KEY = Deno.env.get("GROQ_API_KEY")
    const YT_KEY = Deno.env.get("YOUTUBE_API_KEY")

    /* ========== 1) LLM: Refine Search Query ========== */
    let refinedQuery = `${step_title} tutorial` // Generic fallback

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
                  stepDescription: step_description || "",
                  languageHint: langHint,
                }) 
              },
            ],
            temperature: 0.1,
            max_tokens: 60
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
    // Append language suffix to broaden results to all accepted languages
    const queryWithLang = `${refinedQuery} ${langHint}`
    const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=medium&maxResults=5&q=${encodeURIComponent(queryWithLang)}&key=${YT_KEY}`

    const ytRes = await fetch(ytUrl)
    const ytData = await ytRes.json()

    if (!ytRes.ok) throw new Error(`YouTube API Error: ${ytRes.status}`)

    let video = null
    const candidates = ytData.items || []
    let AI_REASON = null

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
             if (filterData.choices && filterData.choices[0]) {
               const choice = JSON.parse(filterData.choices[0].message.content)
               console.log(`[AI FILTER] Selected: ${choice.selected_video_id} - Reason: ${choice.reason}`)
               
               const bestMatch = candidates.find((c: any) => c.id.videoId === choice.selected_video_id)
               if (bestMatch) {
                 video = bestMatch
                 AI_REASON = choice.reason
               }
             }
          }
        } catch (filterErr) {
           console.error("[FILTER ERROR] AI filtering failed, using top result:", filterErr)
        }
      }
    }

    if (!video) {
        console.log(`[SKIP] No video found for: ${step_title}`)
        return new Response(JSON.stringify({ success: false, message: "No video found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
    }

    // Return video data WITHOUT saving to DB
    const vId = video.id.videoId
    
    // Construct high-res thumbnail URLs manually
    // maxresdefault (1280x720) is crispest, sddefault (640x480) is a good fallback
    const hqThumbnail = `https://i.ytimg.com/vi/${vId}/maxresdefault.jpg`
    const sdThumbnail = `https://i.ytimg.com/vi/${vId}/sddefault.jpg`
    
    const videoData = {
      title: video.snippet.title,
      description: video.snippet.description,
      url: `https://www.youtube.com/watch?v=${vId}`,
      thumbnail_url: hqThumbnail || sdThumbnail || video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
      ai_selection_reason: AI_REASON
    }

    console.log(`✅ Video found and returned: ${videoData.title}`)

    return new Response(JSON.stringify({ success: true, video: videoData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err) {
    console.error(`[ERROR] ${err.message}`)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: corsHeaders
    })
  }
})