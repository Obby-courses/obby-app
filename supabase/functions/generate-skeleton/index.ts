// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { SYSTEM_SKELETON, USER_SKELETON_PROMPT } from "../prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  console.log("[VERSION] 2026-03-06 - GENERATE-SKELETON v3.0 - Full Save: phases always saved in DB (Normal + Bulk)");

  try {
    const { topic, userId, bulkMode } = await req.json();

    if (!topic || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters: topic, userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🚀 START: Generazione scheletro completo per "${topic}" (Bulk Mode: ${!!bulkMode})`);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
    
    if (!GROQ_KEY) throw new Error("GROQ API Key not configured");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    /* =============================================================
       FASE 1: GENERAZIONE SCHELETRO UNIFICATO TRAMITE AI
       ============================================================= */
    console.log("🤖 Chiamata AI per scheletro unificato...");

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        temperature: 0.3,
        messages: [
          { role: "system", content: SYSTEM_SKELETON },
          { role: "user", content: USER_SKELETON_PROMPT(topic) },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      throw new Error(`Groq API error: ${groqRes.status} — ${errText}`);
    }

    const gData = await groqRes.json();
    if (!gData.choices?.[0]) {
      throw new Error(`Errore risposta AI: ${JSON.stringify(gData.error || gData)}`);
    }

    const content = JSON.parse(gData.choices[0].message.content);
    console.log(`🤖 AI ha generato ${content.macro_phases?.length} macro-fasi`);

    /* Validazione struttura */
    if (!content.macro_phases || !Array.isArray(content.macro_phases) || content.macro_phases.length < 2) {
      throw new Error(`Struttura AI non valida: ${content.macro_phases?.length || 0} macro-fasi generate`);
    }

    for (const mp of content.macro_phases) {
      if (!mp.phases || !Array.isArray(mp.phases) || mp.phases.length < 1) {
        throw new Error(`Macro-fase "${mp.title}" non ha fasi interne valide`);
      }
    }

    /* =============================================================
       FASE 2: SALVATAGGIO CORSO
       ============================================================= */
    console.log("💾 Salvataggio corso...");

    const { data: course, error: cErr } = await supabase.from("courses").insert({
      user_id: userId,
      title: content.course_title,
      description: content.course_description,
      verification_mode: content.verification_mode || "project_delivery",
      is_published: false,
    }).select().single();

    if (cErr) throw new Error(`Errore salvataggio corso: ${cErr.message}`);
    console.log(`✅ Corso creato: "${course.title}" (ID: ${course.id})`);

    /* =============================================================
       FASE 3: SALVATAGGIO MACRO-FASI + FASI IN SEQUENZA
       ============================================================= */
    const allInsertedMacros = [];
    const allInsertedPhases = [];

    for (let mi = 0; mi < content.macro_phases.length; mi++) {
      const mp = content.macro_phases[mi];

      const { data: insertedMacro, error: mErr } = await supabase.from("macro_phases").insert({
        course_id: course.id,
        title: mp.title,
        description: mp.description,
        keywords: mp.keywords || [],
        estimated_months: Math.ceil(parseFloat(mp.estimated_months as any) || 1),
        order_index: mp.order_index || mi + 1,
      }).select().single();

      if (mErr) throw new Error(`Errore salvataggio macro-fase "${mp.title}": ${mErr.message}`);

      console.log(`  ✅ Macro-fase ${mi + 1}/${content.macro_phases.length}: "${insertedMacro.title}"`);
      allInsertedMacros.push(insertedMacro);

      // In Normal Mode (bulkMode=false), we DO NOT insert phases into the DB yet.
      // We will only return them to the frontend so it can choose where to start.
      const phasesPlan = mp.phases.map((p: any, pi: number) => ({
        course_id: course.id,
        macro_phase_id: insertedMacro.id,
        title: p.title,
        keywords: p.keywords || [],
        order_index: (typeof p.order_index === 'number' ? p.order_index : pi + 1),
        description: p.description || "",
        milestone_intent: p.milestone_intent || null
      }));

      // ✅ Fasi SEMPRE salvate nel DB (sia Normal sia Bulk Mode)
      // Così create-steps può vedere il percorso completo del corso via query DB
      console.log(`  📥 Salvataggio ${phasesPlan.length} fasi per "${insertedMacro.title}" (bulkMode: ${!!bulkMode})`);
      const { data: insertedPhases, error: pErr } = await supabase
        .from("phases")
        .insert(phasesPlan.map(p => ({
          course_id: p.course_id,
          macro_phase_id: p.macro_phase_id,
          title: p.title,
          keywords: p.keywords,
          order_index: p.order_index,
          description: p.description,
          milestone_intent: p.milestone_intent
        })))
        .select();

      if (pErr) throw new Error(`Errore salvataggio fasi per "${insertedMacro.title}": ${pErr.message}`);

      allInsertedPhases.push(...(insertedPhases || []));
      console.log(`  ✅ ${insertedPhases?.length || 0} fasi salvate per "${insertedMacro.title}"`);

      /* Milestone intents: solo in Bulk Mode */
      if (bulkMode === true && insertedPhases) {
        for (let i = 0; i < insertedPhases.length; i++) {
          const phase = insertedPhases[i];
          const phaseData = mp.phases[i]; 
          
          if (phaseData.milestone_intent) {
            const { error: mErr } = await supabase
              .from('milestones')
              .insert({
                course_id: course.id,
                phase_id: phase.id,
                title: phaseData.milestone_intent.title,
                description: phaseData.milestone_intent.description,
                milestone_type: 'text_submission',
                status: 'pending',
                completed: false,
                target_config: { is_intent_only: true }
              });
            if (mErr) console.error(`[SKELETON] Failed to save milestone intent for phase ${phase.id}:`, mErr.message);
          }
        }
      }

    }

    const totalPhases = allInsertedPhases.length;
    console.log(`✅ SCHELETRO COMPLETATO: ${allInsertedMacros.length} macro-fasi, ${totalPhases} fasi totali (Milestones: ${bulkMode ? 'Intents Created' : 'None'})`);

    /* =============================================================
       RISPOSTA
       ============================================================= */
    return new Response(
      JSON.stringify({
        success: true,
        courseId: course.id,
        course_title: course.title,
        course_description: course.description,
        macro_phases: allInsertedMacros.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          keywords: m.keywords,
          order_index: m.order_index,
          estimated_months: m.estimated_months,
          phases: allInsertedPhases
            .filter((p) => p.macro_phase_id === m.id)
            .sort((a, b) => a.order_index - b.order_index),
        })),
        total_macro_phases: allInsertedMacros.length,
        total_phases: totalPhases,
        bulk_completed: !!bulkMode
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("🚨 CRASH generate-skeleton:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
