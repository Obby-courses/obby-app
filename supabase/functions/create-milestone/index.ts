// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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
  console.log("[VERSION] 2026-02-15 - MILESTONE & PREREQUISITE SYNERGY v1.1.3")

  try {
    const body = await req.json()
    console.log("[BODY]", JSON.stringify(body))
    const { 
      courseId, 
      phaseId, 
      phaseTitle, 
      phaseDescription,
      orderIndex
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

    // Fetch steps from DB to ensure we have the Source of Truth for skills taught
    console.log(`Fetching steps for phase ${phaseId}...`)
    const { data: dbSteps, error: stepsWaitErr } = await supabase
        .from('steps')
        .select('title, description, learning_objective') // learning_objective might be in description sometimes, but selecting helps if column exists
        .eq('phase_id', phaseId)
        .order('order_index', { ascending: true })
    
    if (stepsWaitErr) {
        console.error("Error fetching steps:", stepsWaitErr)
    }

    const stepsToUse = dbSteps && dbSteps.length > 0 ? dbSteps : (body.steps || [])
    console.log(`Using ${stepsToUse.length} steps for context`)

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
              phaseDescription: phaseDescription || '',
              steps: stepsToUse.map((s:any) => ({
                  title: s.title,
                  description: s.description || s.learning_objective || "" 
              }))
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
    const searchQuery = milestoneResult.search_query || `${milestoneResult.title} demonstration performance`

    console.log(`[SEARCH] Looking for support resource: "${searchQuery}"`)
    
    try {
      // 1. Try Video Search
      const videoRes = await fetch(`${SUPABASE_URL}/functions/v1/search-resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
        body: JSON.stringify({ 
          step_title: searchQuery,
          course_title: phaseTitle, // Using phase as context
          phase_title: phaseTitle 
        }),
      })
      const videoData = await videoRes.json()
      
      if (videoData.success && videoData.video) {
        console.log(`[SEARCH] Found video: ${videoData.video.title}`)
        supportResource = {
          type: 'video',
          title: videoData.video.title,
          url: videoData.video.url,
          thumbnail_url: videoData.video.thumbnail_url,
          description: videoData.video.description
        }
      } else {
        // 2. Try Web Search if Video fails
        console.log(`[SEARCH] No video found, trying web search...`)
        const webRes = await fetch(`${SUPABASE_URL}/functions/v1/search-web-resource`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
          body: JSON.stringify({ query: searchQuery }),
        })
        const webData = await webRes.json()
        
        if (webData.success && webData.results?.length > 0) {
          const res = webData.results[0]
          console.log(`[SEARCH] Found web resource: ${res.title}`)
          supportResource = {
            type: 'webpage',
            title: res.title,
            url: res.link,
            thumbnail_url: res.thumbnail_url,
            description: res.snippet
          }
        }
      }
    } catch (searchErr) {
      console.error("[SEARCH ERROR] Support resource search failed:", searchErr)
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
          pedagogical_summary: milestoneResult.summary
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

async function getOrCreateResource(supabase: any, resource: any): Promise<{ id: string }> {
  // Check if URL already exists
  const { data: existing } = await supabase
    .from('resources')
    .select('id')
    .eq('url', resource.url)
    .single()
  
  if (existing) {
    return { id: existing.id }
  }
  
  // Create new resource
  const { data: newResource, error: createError } = await supabase
    .from('resources')
    .insert({
      title: resource.title,
      url: resource.url,
      thumbnail_url: resource.thumbnail_url,
      summary: resource.description,
      type: resource.type
    })
    .select('id')
    .single()
  
  if (createError) throw new Error(`Resource creation failed: ${createError.message}`)
  return { id: newResource.id }
}
