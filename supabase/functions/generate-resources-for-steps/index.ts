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
async function callSearchResources(step: any, courseTitle: string, courseDescription: string, phaseTitle: string) {
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

  console.log("[VERSION] 7.1 – FIXED AUTH PIPELINE")

  try {
    const { phaseId } = await req.json()

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
      const success = await callSearchResources(step, course.title, course.description, phase.title)

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
