// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
    PHASE_COMPLETION_EVALUATOR,
    RESOURCE_BASED_STEP_CREATOR,
    RESOURCE_ROUTER_PROMPT,
    STEP_INTENT_GENERATOR,
    USER_PHASE_COMPLETION_PROMPT,
    USER_RESOURCE_BASED_STEP_PROMPT,
    USER_RESOURCE_ROUTER_PROMPT,
    USER_STEP_INTENT_PROMPT
} from '../prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SEARCH_RESOURCES_FN = 'search-resources'
const SEARCH_WEB_FN = 'search-web-resource'
const MAX_ITERATIONS = 10 // Safety limit

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  console.log("[VERSION] 2026-02-01 - HYBRID SEARCH (STABLE)")

  try {
    const body = await req.json()
    console.log("[BODY]", JSON.stringify(body))
    const { 
      courseId, 
      phaseId, 
      phaseTitle,
      phaseDescription,
      courseTitle, 
      courseDescription,
      searchMode = 'mixed' 
    } = body

    if (!courseId || !phaseId || !phaseTitle) {
      console.error("❌ Missing parameters:", { courseId, phaseId, phaseTitle })
      return new Response(
        JSON.stringify({ success: false, error: "Parametri obbligatori mancanti (courseId, phaseId o phaseTitle)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const GROQ_KEY = Deno.env.get('GROQ_API_KEY') || ''

    console.log("[CONFIG] Project URL:", SUPABASE_URL)
    console.log("[CONFIG] Groq Key present:", !!GROQ_KEY)

    if (!GROQ_KEY) throw new Error("Chiave API GROQ non configurata negli env di Supabase")

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 1) Carica TUTTI gli step del corso per avere contesto completo ed evitare duplicati
    const { data: allStepsData, error: loadError } = await supabase
      .from('steps')
      .select('id, title, description, order_index, phase_id')
      .eq('course_id', courseId)
      .order('order_index')

    if (loadError) {
        console.warn("⚠️ Errore caricamento step esistenti:", loadError.message)
    }
    const allExistingSteps = allStepsData || []
    console.log(`[DATA] Found ${allExistingSteps.length} total steps in course`)

    const createdSteps = []
    let iteration = 0

    while (iteration < MAX_ITERATIONS) {
      iteration++
      console.log(`\n🔄 ITERAZIONE ${iteration}/${MAX_ITERATIONS}`)

      // Filtriamo gli step della fase corrente per il check di completamento
      const currentPhaseSteps = allExistingSteps.filter(s => s.phase_id === phaseId)

      // --- 2.1) Controllo completamento fase ---
      console.log("Check completion...")
      const completionCheckRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: PHASE_COMPLETION_EVALUATOR },
            { role: 'user', content: USER_PHASE_COMPLETION_PROMPT({
                phaseTitle,
                phaseDescription: phaseDescription || '',
                existingSteps: currentPhaseSteps.map(s => ({ title: s.title, description: s.description }))
              })
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      })

      if (!completionCheckRes.ok) {
          const errText = await completionCheckRes.text()
          throw new Error(`Groq Completion Error: ${completionCheckRes.status} - ${errText}`)
      }
      const completionData = await completionCheckRes.json()
      const completionResult = JSON.parse(completionData.choices?.[0]?.message?.content || '{}')
      console.log("[AI] Completion Result:", completionResult)

      if (completionResult.is_complete) {
        console.log("🎉 Obiettivi fase soddisfatti. Fine loop.")
        break
      }

      // --- 2.2) Generazione intento step ---
      console.log("Generate intent...")
      const intentRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: STEP_INTENT_GENERATOR },
            { role: 'user', content: USER_STEP_INTENT_PROMPT({
                courseTitle,
                phaseTitle,
                phaseDescription: phaseDescription || '',
                existingSteps: allExistingSteps.map(s => ({ title: s.title, description: s.description }))
              })
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      })

      if (!intentRes.ok) throw new Error(`Groq Intent Error: ${intentRes.status}`)
      const intentData = await intentRes.json()
      const intentResult = JSON.parse(intentData.choices?.[0]?.message?.content || '{}')
      const { intent, search_keywords } = intentResult
      console.log("[AI] Intent:", intentResult)

      if (!intent || !search_keywords) {
        console.log("⚠️ Intento non valido. Fine loop.")
        break
      }

      // --- 2.3) Decisione tipo risorsa (Router) ---
      let resourceType = searchMode
      if (searchMode === 'mixed') {
         console.log("Routing...")
         try {
            const routerRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
                body: JSON.stringify({
                  model: 'llama-3.3-70b-versatile',
                  messages: [
                    { role: 'system', content: RESOURCE_ROUTER_PROMPT },
                    { role: 'user', content: USER_RESOURCE_ROUTER_PROMPT({ intent, phaseTitle }) },
                  ],
                  response_format: { type: 'json_object' },
                  temperature: 0.1,
                }),
              })
            const routerData = await routerRes.json()
            const routerDecision = JSON.parse(routerData.choices?.[0]?.message?.content || '{}')
            resourceType = routerDecision.selected_type === 'webpage' ? 'web' : 'video'
            console.log(`[ROUTER] Decided: ${resourceType}`)
         } catch (e) {
            console.error("Router error:", e)
            resourceType = 'video'
         }
      }

      // --- 2.4) Ricerca risorsa ---
      let foundResource = null
      
      if (resourceType === 'web') {
        console.log(`[SEARCH] Web: ${search_keywords}`)
        const searchRes = await fetch(`${SUPABASE_URL}/functions/v1/${SEARCH_WEB_FN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
            body: JSON.stringify({ query: search_keywords, course_title: courseTitle }),
        })
        const searchData = await searchRes.json()
        if (searchData.success && searchData.results?.length > 0) {
            const best = searchData.results[0]
            foundResource = { title: best.title, url: best.link, thumbnail_url: best.thumbnail_url, description: best.snippet, type: 'webpage' }
            console.log("✅ Web resource found")
        } else {
            console.error(`[SEARCH ERROR] Web search failed or returned 0 results. Status: ${searchData.success}, Error: ${searchData.error || 'Unknown'}`)
        }
      } else {
        console.log(`[SEARCH] Video: ${search_keywords}`)
        const searchRes = await fetch(`${SUPABASE_URL}/functions/v1/${SEARCH_RESOURCES_FN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
            body: JSON.stringify({ step_title: search_keywords, step_description: intent, course_title: courseTitle, phase_title: phaseTitle }),
        })
        const searchData = await searchRes.json()
        if (searchData.success && searchData.video) {
            const v = searchData.video
            foundResource = { title: v.title, url: v.url, thumbnail_url: v.thumbnail_url, description: v.description, type: 'video' }
            console.log("✅ Video resource found")
        } else {
            console.error(`[SEARCH ERROR] Video search failed. Error: ${searchData.error || searchData.message || 'Unknown'}`)
        }
      }

      if (!foundResource) {
        console.log("⚠️ Nessuna risorsa trovata. Break loop.")
        break
      }

      // --- 2.5) Creazione step finale ---
      console.log("Create final step...")
      const stepCreationRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: RESOURCE_BASED_STEP_CREATOR },
            { role: 'user', content: USER_RESOURCE_BASED_STEP_PROMPT({
                intent,
                videoTitle: foundResource.title,
                videoDescription: foundResource.description,
                phaseTitle,
                existingSteps: allExistingSteps.map(s => ({ title: s.title, description: s.description }))
              })
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      })

      if (!stepCreationRes.ok) throw new Error(`Groq StepCreation Error: ${stepCreationRes.status}`)
      const stepCreationData = await stepCreationRes.json()
      const stepResult = JSON.parse(stepCreationData.choices?.[0]?.message?.content || '{}')
      console.log("[AI] Final Step:", stepResult)

      // --- 2.6) Salvataggio DB ---
      console.log("Saving to DB...")
      const { data: savedResource, error: resErr } = await supabase
        .from('resources')
        .insert({ title: foundResource.title, url: foundResource.url, thumbnail_url: foundResource.thumbnail_url, summary: foundResource.description, type: foundResource.type })
        .select().single()

      if (resErr) throw new Error(`DB Resource Error: ${resErr.message}`)

      const { data: savedStep, error: stepErr } = await supabase
        .from('steps')
        .insert({
          course_id: courseId,
          phase_id: phaseId,
          order_index: allExistingSteps.filter(s => s.phase_id === phaseId).length + 1,
          title: stepResult.title,
          description: stepResult.description,
          completed: false,
          resource_id: savedResource.id
        })
        .select().single()

      if (stepErr) throw new Error(`DB Step Error: ${stepErr.message}`)

      allExistingSteps.push({ 
        id: savedStep.id, 
        title: savedStep.title, 
        description: savedStep.description, 
        order_index: savedStep.order_index,
        phase_id: phaseId
      })
      createdSteps.push(savedStep)
      console.log(`✅ Saved: ${savedStep.title}`)
    }

    return new Response(JSON.stringify({ success: true, created_steps_count: createdSteps.length }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err: any) {
    console.error('❌ FATAL ERROR in create-steps:', err)
    return new Response(JSON.stringify({ success: false, error: err.message || "Unspecified server error" }), {
      status: 200, // Return 200 even on logical error to let client read JSON
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})