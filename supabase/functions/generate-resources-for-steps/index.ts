// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// ✅ Supabase client con SERVICE ROLE (bypass RLS + niente JWT utente)
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  }
)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

/* ======================================================
   🔁 CALL CHILD FUNCTION: search-resources
   ====================================================== */
async function callSearchResources(
  step: any,
  courseTitle: string,
  courseDescription: string,
  phaseTitle: string,
  primaryLanguage: string,
  secondaryLanguages: string[]
) {
  console.log(`[PIPELINE] Calling search-resources for: ${step.title}`)

  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/search-resources`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // ⚠️ Usiamo solo apikey. Se la funzione ha verify_jwt = false, non serve Bearer.
          // Se la funzione ha verify_jwt = true e riceve Bearer SERVICE_ROLE, dà 401 se non è un user token.
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          step_id: step.id,
          step_title: step.title,
          step_description: step.description || "",
          course_title: courseTitle,
          course_description: courseDescription,
          phase_title: phaseTitle,
          primaryLanguage,
          secondaryLanguages,
        }),
      }
    )

    if (!res.ok) {
      const errorText = await res.text()
      console.error(
        `[CHILD ERROR] Status ${res.status}:`,
        errorText
      )
      return null
    }

    const data = await res.json()
    return data.resource || (data.success ? true : null)

  } catch (err) {
    console.error(
      `[FETCH ERROR] Failed to call child function:`,
      err?.message || err
    )
    return null
  }
}

/* ======================================================
   🚀 MAIN FUNCTION
   ====================================================== */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  console.log("[VERSION] 2026-01-25 13:39 - AUTH PIPELINE & LOOP VERIFIED")

  try {
    const { phaseId, primaryLanguage: bodyPrimaryLang, secondaryLanguages: bodySecondaryLangs } = await req.json()

    if (!phaseId) {
      return new Response(
        JSON.stringify({ error: "Missing phaseId" }),
        { status: 400, headers: corsHeaders }
      )
    }

    /* ======================================================
       📥 LOAD PHASE & COURSE CONTEXT
       ====================================================== */
    const { data: phase, error: phaseError } = await supabase
      .from("phases")
      .select("title, course_id")
      .eq("id", phaseId)
      .single()

    if (phaseError || !phase) {
      throw phaseError || new Error("Phase not found")
    }

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("title, description")
      .eq("id", phase.course_id)
      .single()

    if (courseError || !course) {
      throw courseError || new Error("Course not found")
    }

    // Language strategy:
    // - Primary: 'it' (Italian) — always the system default
    // - Secondary: ['en'] minimum — English is always the mandatory fallback
    // These defaults are enforced here; request body can still override for future flexibility.
    let primaryLanguage = bodyPrimaryLang || 'it'
    let secondaryLanguages: string[] = bodySecondaryLangs || ['en']

    // Ensure 'en' is always present as fallback
    if (!secondaryLanguages.includes('en')) {
      secondaryLanguages = ['en', ...secondaryLanguages]
    }

    // Try to load from the course owner's profile if not provided
    if (!bodyPrimaryLang) {
      try {
        const { data: courseRow } = await supabase
          .from('courses')
          .select('user_id')
          .eq('id', course.course_id || phase.course_id)
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
      } catch (e) {
        console.warn('[LANG] Could not fetch user profile language, using defaults')
      }
    }

    console.log(`[LANG] primary=${primaryLanguage}, secondary=${JSON.stringify(secondaryLanguages)}`)

    /* ======================================================
       📥 LOAD STEPS
       ====================================================== */
    const { data: steps, error: stepsError } = await supabase
      .from("steps")
      .select("id, title, description")
      .eq("phase_id", phaseId)
      .order("order_index", { ascending: true })

    if (stepsError || !steps || steps.length === 0) {
      throw stepsError || new Error("No steps found")
    }

    console.log(
      `[PIPELINE] Found ${steps.length} steps. Context: ${course.title} > ${phase.title}. Starting loop...`
    )

    let totalCreated = 0

    /* ======================================================
       🔁 LOOP STEPS → RESOURCES
       ====================================================== */
    for (const step of steps) {
      const success = await callSearchResources(
        step,
        course.title,
        course.description,
        phase.title,
        primaryLanguage,
        secondaryLanguages
      )

      if (success) {
        totalCreated++
        console.log(
          `[PIPELINE] ✅ Resource processed for: ${step.title}`
        )
      } else {
        console.log(
          `[PIPELINE] ⚠️ No resource for: ${step.title}`
        )
      }
    }

    /* ======================================================
       ✅ DONE
       ====================================================== */
    return new Response(
      JSON.stringify({
        success: true,
        resources_created: totalCreated,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )

  } catch (err) {
    console.error("[FATAL ERROR]", err)
    return new Response(
      JSON.stringify({
        success: false,
        error: String(err?.message || err),
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
