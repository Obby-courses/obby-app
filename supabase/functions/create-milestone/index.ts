// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { categorizeResource } from '../categorize-resource.ts'
import {
    MILESTONE_GENERATOR,
    USER_MILESTONE_PROMPT
} from '../prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  console.log("[VERSION] 2026-02-19 - PRIOR KNOWLEDGE & SKIPPED STATUS SUPPORT v1.1.5")

  try {
    const body = await req.json()
    console.log("[BODY]", JSON.stringify(body))
    let {
      courseId,
      phaseId,
      phaseTitle,
      phaseKeywords,
      orderIndex,
      primaryLanguage: bodyPrimaryLang,
      secondaryLanguages: bodySecondaryLangs,
      availableTools
    } = body

    if (!courseId || !phaseId || !phaseTitle) {
      console.error("❌ Missing parameters:", { courseId, phaseId, phaseTitle })
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters (courseId, phaseId, or phaseTitle)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const GROQ_KEY = Deno.env.get('GROQ_API_KEY') || ''

    if (!GROQ_KEY) throw new Error("GROQ API Key not configured")

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Fetch steps and keywords from DB
    console.log(`Fetching steps and metadata for phase ${phaseId}...`)
    const { data: dbPhase, error: phaseErr } = await supabase
        .from('phases')
        .select('keywords')
        .eq('id', phaseId)
        .single()
        
    const effectiveKeywords = phaseKeywords || dbPhase?.keywords || []

    const { data: dbSteps, error: stepsWaitErr } = await supabase
        .from('steps')
        .select('title, description, learning_objective')
        .eq('phase_id', phaseId)
        .order('order_index', { ascending: true })
    
    if (stepsWaitErr) {
        console.error("Error fetching steps:", stepsWaitErr)
    }

    const stepsToUse = dbSteps && dbSteps.length > 0 ? dbSteps : (body.steps || [])
    console.log(`Using ${stepsToUse.length} steps for context`)

    // Resolve language prefs: from body or from the course's profile
    let primaryLanguage = bodyPrimaryLang || 'it'
    let secondaryLanguages: string[] = bodySecondaryLangs || ['en']

    if (!bodyPrimaryLang) {
      try {
        const { data: courseRow } = await supabase
          .from('courses')
          .select('user_id')
          .eq('id', courseId)
          .single()
        if (courseRow?.user_id) {
          const { data: profileRow } = await supabase
            .from('profiles')
            .select('primary_language, secondary_languages')
            .eq('id', courseRow.user_id)
            .single()
          if (profileRow) {
            primaryLanguage = profileRow.primary_language || 'it'
            secondaryLanguages = profileRow.secondary_languages || ['en']
          }
        }
      } catch (err) {
        console.warn("Failed to fetch language context from profile:", err)
      }
    }

    console.log("Generate milestone challenge...")
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: MILESTONE_GENERATOR },
          { role: 'user', content: USER_MILESTONE_PROMPT({
              phaseTitle,
              phaseKeywords: effectiveKeywords,
              steps: stepsToUse.map((s:any) => ({
                  title: s.title,
                  description: s.description || s.learning_objective || "" 
              })),
              availableTools: availableTools && availableTools.length > 0 ? availableTools : undefined
            })
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    })

    if (!groqRes.ok) throw new Error(`Groq Error: ${groqRes.status}`)
    const groqData = await groqRes.json()
    const milestoneResult = JSON.parse(groqData.choices?.[0]?.message?.content || '{}')
    console.log("[AI] Milestone:", milestoneResult)

    if (!milestoneResult.title || !milestoneResult.description) {
        throw new Error("AI failed to generate a valid milestone")
    }

    /* ========== Support Resource Search ========== */
    let supportResource = null
    
    if (milestoneResult.requires_resource) {
      const hint = milestoneResult.practice_resource_hint || ''
      const searchQuery = milestoneResult.search_query || `${milestoneResult.title} ${hint}`
      const recommendedType = milestoneResult.recommended_resource_type || 'webpage'

      console.log(`[SEARCH] Looking for support resource: "${searchQuery}" (Recommended: ${recommendedType}${hint ? `, Hint: ${hint}` : ''})`)
      
      try {
        const searchVideo = async () => {
          const videoRes = await fetch(`${SUPABASE_URL}/functions/v1/search-resources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
            body: JSON.stringify({ 
              step_title: searchQuery,
              course_title: phaseTitle,
              phase_title: phaseTitle,
              primaryLanguage,
              secondaryLanguages
            }),
          })
          const videoData = await videoRes.json()
          return (videoData.success && videoData.video) ? videoData.video : null
        }

        const searchWeb = async () => {
          const webRes = await fetch(`${SUPABASE_URL}/functions/v1/search-web-resource`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
            body: JSON.stringify({ 
              query: searchQuery,
              primaryLanguage,
              secondaryLanguages
            }),
          })
          const webData = await webRes.json()
          return (webData.success && webData.results?.length > 0) ? webData.results[0] : null
        }

        if (recommendedType === 'video') {
          // Video First
          const video = await searchVideo()
          if (video) {
            supportResource = {
              type: 'video',
              title: video.title,
              url: video.url,
              thumbnail_url: video.thumbnail_url,
              description: video.description
            }
          } else {
            const web = await searchWeb()
            if (web) {
              supportResource = {
                type: 'webpage',
                title: web.title,
                url: web.link,
                thumbnail_url: web.thumbnail_url,
                description: web.snippet
              }
            }
          }
        } else {
          // Web First
          const web = await searchWeb()
          if (web) {
            supportResource = {
              type: 'webpage',
              title: web.title,
              url: web.link,
              thumbnail_url: web.thumbnail_url,
              description: web.snippet
            }
          } else {
            const video = await searchVideo()
            if (video) {
              supportResource = {
                type: 'video',
                title: video.title,
                url: video.url,
                thumbnail_url: video.thumbnail_url,
                description: video.description
              }
            }
          }
        }
      } catch (searchErr) {
        console.error("[SEARCH ERROR] Support resource search failed:", searchErr)
      }
    } else {
      console.log("[SEARCH] AI decided no support resource is required for this milestone.")
    }

    // --- Salvataggio DB ---
    console.log("Saving milestone to DB...")
    
    // Create resource if found
    let resourceId = null
    if (supportResource) {
      try {
        const { id } = await getOrCreateResource(supabase, {
          title: supportResource.title,
          url: supportResource.url,
          thumbnail_url: supportResource.thumbnail_url,
          description: supportResource.description,
          type: supportResource.type
        })
        resourceId = id
      } catch (resErr) {
        console.error("[RESOURCE ERROR] Failed to save support resource:", resErr)
      }
    }

    const { data: savedMilestone, error: dbErr } = await supabase
      .from('milestones')
      .upsert({
        course_id: courseId,
        phase_id: phaseId,
        order_index: orderIndex,
        title: milestoneResult.title,
        description: milestoneResult.description,
        milestone_type: milestoneResult.milestone_type || 'text_submission',
        completed: false,
        status: 'pending',
        resource_id: resourceId, // Save direct link to resource
        target_config: {
          support_resource: supportResource,
          resource_id: resourceId,
          pedagogical_summary: milestoneResult.summary,
          exercise_text: milestoneResult.exercise_text
        }
      }, { onConflict: 'phase_id' })
      .select().single()

    if (dbErr) throw new Error(`DB Milestone Error: ${dbErr.message}`)

    console.log(`✅ Milestone saved: ${savedMilestone.title}`)

    return new Response(JSON.stringify({ success: true, milestoneId: savedMilestone.id, milestone: savedMilestone }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err: any) {
    console.error('❌ ERROR in create-milestone:', err)
    return new Response(JSON.stringify({ success: false, error: err.message || "Unspecified server error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})

async function fetchWebThumbnail(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)
    
    const response = await fetch(url, { signal: controller.signal })
    const html = await response.text()
    clearTimeout(timeout)

    const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) || 
                    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i)
    if (ogMatch?.[1]) return ogMatch[1].startsWith('//') ? `https:${ogMatch[1]}` : ogMatch[1]

    const twitterMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i)
    if (twitterMatch?.[1]) return twitterMatch[1]

    const imgMatches = html.matchAll(/<img\s+[^>]*src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)(?:[^"']*)?)["']/gi)
    for (const match of imgMatches) {
        const src = match[1]
        if (!src.toLowerCase().includes('favicon') && !src.toLowerCase().includes('logo') && !src.toLowerCase().includes('icon')) {
            return src
        }
    }
    return null
  } catch (e) {
    return null
  }
}

async function getOrCreateResource(supabase: any, resource: any): Promise<{ id: string }> {
  const cleanUrl = resource.url.trim()
  
  // Check if URL already exists
  const { data: existing } = await supabase
    .from('resources')
    .select('id')
    .eq('url', cleanUrl)
    .limit(1)
  
  if (existing && existing.length > 0) {
    return { id: existing[0].id }
  }

  let finalThumbnail = resource.thumbnail_url
  if (!finalThumbnail && resource.type === 'webpage') {
    const extracted = await fetchWebThumbnail(cleanUrl)
    if (extracted) finalThumbnail = extracted
  }
  
  // Categorize resource via LLM before saving
  const metadata = await categorizeResource({
    title: resource.title,
    description: resource.description || '',
    type: resource.type
  })

  // Create new resource with categorization metadata
  const { data: newResource, error: createError } = await supabase
    .from('resources')
    .insert({
      title: resource.title,
      url: cleanUrl,
      thumbnail_url: finalThumbnail,
      summary: resource.description,
      type: resource.type,
      domain: metadata.domain,
      subdomain: metadata.subdomain,
      primary_topics: metadata.primary_topics,
      skill_level: metadata.skill_level,
      learning_objectives: metadata.learning_objectives,
      prerequisites: metadata.prerequisites,
      language: metadata.language,
      searchable_text: metadata.searchable_text
    })
    .select('id')
    .single()
  
  if (createError) {
    if (createError.code === '23505') {
       const { data: retry } = await supabase.from('resources').select('id').eq('url', cleanUrl).limit(1)
       if (retry?.[0]) return { id: retry[0].id }
    }
    throw new Error(`Resource creation failed: ${createError.message}`)
  }
  return { id: newResource.id }
}
