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

  try {
    const body = await req.json()
    console.log("[BODY]", JSON.stringify(body))
    const { 
      courseId, 
      phaseId, 
      phaseTitle,
      phaseDescription,
      orderIndex,
      steps = []
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
              steps
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

    // --- Salvataggio DB ---
    console.log("Saving milestone to DB...")
    const { data: savedMilestone, error: dbErr } = await supabase
      .from('milestones')
      .upsert({
        course_id: courseId,
        phase_id: phaseId,
        order_index: orderIndex,
        title: milestoneResult.title,
        description: milestoneResult.description,
        milestone_type: milestoneResult.milestone_type || 'text_submission', // Default
        completed: false,
        status: 'pending'
      }, { onConflict: 'phase_id' }) // Ensure only one per phase
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
