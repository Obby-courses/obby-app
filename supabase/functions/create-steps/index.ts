// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { STEP_GENERATOR, USER_STEP_PROMPT } from '../prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SEARCH_RESOURCES_FN = 'search-resources'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { 
      courseId, 
      phaseId, 
      phaseTitle, 
      courseTitle, 
      courseDescription 
    } = body

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

    /* ========== 1) Call LLM (Groq) ========== */
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: STEP_GENERATOR },
          { 
            role: 'user', 
            content: USER_STEP_PROMPT({ courseTitle, courseDescription, phaseTitle }) 
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    })

    const groqData = await groqRes.json()
    const raw = groqData.choices?.[0]?.message?.content
    const clean = String(raw).replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    console.log('🤖 GROQ RAW RESPONSE:', parsed)

    // Extract steps array - handle both "steps" and "operational_steps"
    const steps = parsed.steps || parsed.operational_steps || []

    console.log('📊 EXTRACTED STEPS:', steps)

    /* ========== 2) Normalize steps ========== */
    const normalizedSteps = steps.map((s: any, idx: number) => ({
      order_index: s.order_index ?? idx + 1,
      title: (s.title || '').toString().trim(),
      description: (s.description || '').toString().trim(),
      theme: (s.theme || phaseTitle || 'general').toString().trim(),
      subtheme: (s.subtheme || '').toString().trim(),
    }))

    console.log('✅ NORMALIZED STEPS:', normalizedSteps)

    /* ========== 3) Insert steps ========== */
    const rows = normalizedSteps.map((s: any) => ({
      course_id: courseId,
      phase_id: phaseId,
      order_index: s.order_index,
      title: s.title,
      description: s.description,
      theme: s.theme,
      subtheme: s.subtheme,
      completed: false,
    }))

    console.log('💾 INSERTING ROWS:', rows)

    const insertRes = await supabase
      .from("steps")
      .insert(rows)
      .select()

    console.log("🧬 RAW INSERT RESPONSE:", JSON.stringify(insertRes, null, 2))

    const { data, error: dbError } = insertRes

    if (dbError) {
      console.error("❌ DB ERROR:", dbError)
      throw dbError
    }

    const createdSteps = Array.isArray(data) ? data : data ? [data] : []

    console.log("🧪 NORMALIZED createdSteps:", createdSteps)

    /* ========== 4) Auto-trigger resources per ogni step ========== */
    for (const step of createdSteps) {
      console.log(`🔎 Generating resource for step: ${step.title}`)
    
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${SEARCH_RESOURCES_FN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({
          stepId: step.id,
          stepTitle: step.title,
          stepDescription: step.description,
        }),
      })
    
      const json = await res.json()
      console.log(`📦 Resource for "${step.title}":`, json)
    }

    return new Response(
      JSON.stringify({
        success: true,
        created_steps_count: createdSteps.length,
        created_steps: createdSteps.map(s => ({ id: s.id, title: s.title }))
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