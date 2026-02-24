// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
    QUIZ_GENERATOR,
    USER_QUIZ_PROMPT
} from '../prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  console.log("[VERSION] 2026-02-19 - GENERATE QUIZ v1.0.0")

  try {
    const body = await req.json()
    console.log("[BODY]", JSON.stringify(body))

    const { quizType, courseId, courseTitle, macroPhases } = body

    if (!quizType || !courseId || !courseTitle || !macroPhases?.length) {
      console.error("❌ Missing parameters:", { quizType, courseId, courseTitle, macroPhases: macroPhases?.length })
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const GROQ_KEY = Deno.env.get('GROQ_API_KEY') || ''
    if (!GROQ_KEY) throw new Error("GROQ API Key not configured")

    // --- Route by quizType ---
    if (quizType === 'skill_assessment') {
      return await handleSkillAssessment({ courseId, courseTitle, macroPhases, GROQ_KEY })
    }

    // Future quiz types can be added here:
    // if (quizType === 'tool_preferences') { ... }
    // if (quizType === 'learning_style') { ... }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown quizType: ${quizType}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err: any) {
    console.error('❌ ERROR in generate-quiz:', err)
    return new Response(JSON.stringify({ success: false, error: err.message || "Unspecified server error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})

/* ========== QUIZ TYPE: SKILL ASSESSMENT ========== */
async function handleSkillAssessment({ courseId, courseTitle, macroPhases, GROQ_KEY }: {
  courseId: string
  courseTitle: string
  macroPhases: Array<{ id: string; title: string; keywords: string[]; order_index: number }>
  GROQ_KEY: string
}) {
  console.log(`🧠 Generating skill assessment for "${courseTitle}" with ${macroPhases.length} macro-phases`)

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: QUIZ_GENERATOR },
        {
          role: 'user',
          content: USER_QUIZ_PROMPT({
            quizType: 'skill_assessment',
            courseTitle,
            macroPhases
          })
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  })

  if (!groqRes.ok) throw new Error(`Groq Error: ${groqRes.status}`)
  const groqData = await groqRes.json()
  const result = JSON.parse(groqData.choices?.[0]?.message?.content || '{}')

  if (!result.questions || !Array.isArray(result.questions)) {
    throw new Error("AI failed to generate valid quiz questions")
  }

  console.log(`✅ Generated ${result.questions.length} assessment questions`)

  // Enrich questions with macro_phase_id
  const enrichedQuestions = result.questions
    .sort((a: any, b: any) => a.macro_phase_order - b.macro_phase_order)
    .map((q: any) => {
      const matchingMacro = macroPhases
        .sort((a, b) => a.order_index - b.order_index)
        .find(mp => mp.order_index === q.macro_phase_order)

      return {
        id: `q${q.macro_phase_order}`,
        macro_phase_id: matchingMacro?.id || null,
        macro_phase_title: matchingMacro?.title || '',
        order_index: q.macro_phase_order,
        question: q.question,
        type: q.type || 'knowledge',
        keywords_tested: q.keywords_tested || [],
        clarification: q.clarification || ''
      }
    })

  return new Response(JSON.stringify({
    success: true,
    quizType: 'skill_assessment',
    questions: enrichedQuestions
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  })
}
