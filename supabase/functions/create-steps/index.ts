// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
    PHASE_COMPLETION_EVALUATOR,
    RESOURCE_BASED_STEP_CREATOR,
    STEP_INTENT_GENERATOR,
    USER_PHASE_COMPLETION_PROMPT,
    USER_RESOURCE_BASED_STEP_PROMPT,
    USER_STEP_INTENT_PROMPT
} from '../prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SEARCH_RESOURCES_FN = 'search-resources'
const GET_SUMMARY_FN = 'get-resource-summary'
const MAX_ITERATIONS = 10 // Safety limit

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  console.log("[VERSION] 2026-01-26 23:00 - ITERATIVE RESOURCE-FIRST GENERATION")

  try {
    const body = await req.json()
    const { 
      courseId, 
      phaseId, 
      phaseTitle,
      phaseDescription,
      courseTitle, 
      courseDescription 
    } = body

    console.log(`🚀 STEP 3: Generazione iterativa step per "${phaseTitle}" (Corso: ${courseTitle})`);
    console.log(`📝 Descrizione Fase: ${phaseDescription?.substring(0, 50)}...`);

    if (!courseId || !phaseId || !phaseTitle) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing parameters' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const GROQ_KEY = Deno.env.get('GROQ_API_KEY') || ''

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    /* ========== 1) Load existing steps for this phase ========== */
    const { data: existingStepsData, error: loadError } = await supabase
      .from('steps')
      .select('id, title, description, order_index')
      .eq('phase_id', phaseId)
      .order('order_index')

    if (loadError) {
      console.error("❌ Error loading existing steps:", loadError)
    }

    const existingSteps = existingStepsData || []
    console.log(`📚 Existing steps loaded: ${existingSteps.length}`)

    /* ========== 2) Iterative Loop ========== */
    const createdSteps = []
    let iteration = 0

    while (iteration < MAX_ITERATIONS) {
      iteration++
      console.log(`\n🔄 ITERATION ${iteration}/${MAX_ITERATIONS}`)

      /* --- 2.1) Check if phase is complete --- */
      console.log("🤔 Checking if phase objectives are satisfied...")
      
      const completionCheckRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: PHASE_COMPLETION_EVALUATOR },
            { 
              role: 'user', 
              content: USER_PHASE_COMPLETION_PROMPT({
                phaseTitle,
                phaseDescription: phaseDescription || '',
                existingSteps: existingSteps.map(s => ({ title: s.title, description: s.description }))
              })
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      })

      const completionData = await completionCheckRes.json()
      const completionResult = JSON.parse(completionData.choices?.[0]?.message?.content || '{}')
      
      console.log(`✅ Completion check:`, completionResult)

      if (completionResult.is_complete) {
        console.log("🎉 Phase objectives are COMPLETE. Ending loop.")
        break
      }

      /* --- 2.2) Generate step intent --- */
      console.log("💡 Generating next step intent...")
      
      const intentRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: STEP_INTENT_GENERATOR },
            { 
              role: 'user', 
              content: USER_STEP_INTENT_PROMPT({
                courseTitle,
                phaseTitle,
                phaseDescription: phaseDescription || '',
                existingSteps: existingSteps.map(s => ({ title: s.title, description: s.description }))
              })
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      })

      const intentData = await intentRes.json()
      const intentResult = JSON.parse(intentData.choices?.[0]?.message?.content || '{}')
      
      console.log(`📌 Intent generated:`, intentResult)

      const { intent, search_keywords } = intentResult

      if (!intent || !search_keywords) {
        console.log("⚠️ No valid intent generated. Ending loop.")
        break
      }

      /* --- 2.3) Search for video resource --- */
      console.log(`🔎 Searching for video with keywords: "${search_keywords}"`)
      
      const resourceRes = await fetch(`${SUPABASE_URL}/functions/v1/${SEARCH_RESOURCES_FN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({
          step_id: null, // Non aggiorniamo step esistente
          step_title: search_keywords,
          step_description: intent,
          course_title: courseTitle,
          course_description: courseDescription,
          phase_title: phaseTitle
        }),
      })

      const resourceData = await resourceRes.json()
      
      if (!resourceData.success || !resourceData.video) {
        console.log("⚠️ No suitable video found. Ending loop.")
        break
      }

      const video = resourceData.video
      console.log(`📺 Video found: "${video.title}"`)

      /* --- 2.3.1) Get video summary (Optional/Modular) --- */
      let resourceSummary = video.description // Default fallback
      try {
        console.log(`📝 Requesting summary for video ${video.url.split('v=')[1]}...`)
        const summaryRes = await fetch(`${SUPABASE_URL}/functions/v1/${GET_SUMMARY_FN}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
          body: JSON.stringify({
            resourceId: video.url.split('v=')[1],
            type: 'youtube',
            language: 'it',
            title: video.title,
            description: video.description
          }),
        })

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json()
          if (summaryData.success && summaryData.summary) {
            resourceSummary = summaryData.summary
            console.log("✨ Summary received successfully")
          } else {
            console.warn("⚠️ Summary function returned success:false or no summary content")
          }
        } else {
          console.error(`❌ Summary extraction failed with status: ${summaryRes.status}`)
        }
      } catch (sumErr) {
        console.error("❌ Summary extraction error:", sumErr.message)
      }

      /* --- 2.4) Create step based on video --- */
      console.log("🏗️ Creating step from video resource...")
      
      const stepCreationRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: RESOURCE_BASED_STEP_CREATOR },
            { 
              role: 'user', 
              content: USER_RESOURCE_BASED_STEP_PROMPT({
                intent,
                videoTitle: video.title,
                videoDescription: video.description,
                phaseTitle
              })
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      })

      const stepCreationData = await stepCreationRes.json()
      const stepResult = JSON.parse(stepCreationData.choices?.[0]?.message?.content || '{}')
      
      console.log(`📝 Step created:`, stepResult)

      /* --- 2.5) Save resource to DB --- */
      console.log("💾 Saving resource...")
      
      const { data: savedResource, error: resourceError } = await supabase
        .from('resources')
        .insert({
          title: video.title,
          url: video.url,
          thumbnail_url: video.thumbnail_url,
          summary: resourceSummary,
          type: 'video'
        })
        .select()
        .single()

      if (resourceError) {
        console.error("❌ Error saving resource:", resourceError)
        break
      }

      /* --- 2.6) Save step to DB --- */
      console.log("💾 Saving step...")
      
      const { data: savedStep, error: stepError } = await supabase
        .from('steps')
        .insert({
          course_id: courseId,
          phase_id: phaseId,
          order_index: existingSteps.length + 1,
          title: stepResult.title,
          description: stepResult.description,
          completed: false,
          resource_id: savedResource.id
        })
        .select()
        .single()

      if (stepError) {
        console.error("❌ Error saving step:", stepError)
        break
      }

      console.log(`✅ Step saved: ${savedStep.title}`)

      /* --- 2.7) Update tracking arrays --- */
      existingSteps.push({
        id: savedStep.id,
        title: savedStep.title,
        description: savedStep.description,
        order_index: savedStep.order_index
      })
      
      createdSteps.push(savedStep)
    }

    console.log(`\n🏁 Loop completed. Created ${createdSteps.length} new steps.`)

    return new Response(
      JSON.stringify({
        success: true,
        created_steps_count: createdSteps.length,
        created_steps: createdSteps.map(s => ({ id: s.id, title: s.title })),
        total_iterations: iteration
      }),
      { headers: corsHeaders }
    )

  } catch (err: any) {
    console.error('❌ create-steps error:', err)
    return new Response(JSON.stringify({ success: false, error: err?.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})