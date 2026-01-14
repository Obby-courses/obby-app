// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { SYSTEM_PHASE, USER_PHASE_PROMPT } from "../prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { 
      courseId, 
      macroPhaseId, 
      macroPhaseTitle, 
      macroPhaseDescription,
      keywords,      // ✅ NUOVO: Array di keywords
      orderIndex     // ✅ NUOVO: Livello difficoltà (1-6)
    } = await req.json();

    console.log(`🚀 STEP 2: Generazione fasi per "${macroPhaseTitle}"`);
    console.log(`📊 Keywords ricevute:`, keywords);
    console.log(`📈 Livello difficoltà:`, orderIndex);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ✅ Chiamata a Groq CON keywords e orderIndex
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}` 
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PHASE },
          { 
            role: "user", 
            content: USER_PHASE_PROMPT(
              macroPhaseTitle, 
              macroPhaseDescription || "",
              keywords || [],           // ✅ Passa keywords
              orderIndex || 1           // ✅ Passa livello
            )
          }
        ]
      })
    });

    const gData = await groqRes.json();

    if (!gData.choices || !gData.choices[0]) {
      console.error("❌ Errore risposta Groq:", gData);
      throw new Error(`Errore AI: ${gData.error?.message || "Nessuna risposta"}`);
    }

    const rawContent = gData.choices[0].message.content;

    // 🛡️ PULIZIA JSON (Rimuove markdown se presente)
    const cleanJson = rawContent.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    // 🛡️ CONTROLLO DI SICUREZZA
    if (!parsed.phases || !Array.isArray(parsed.phases)) {
      console.error("❌ Struttura AI errata:", parsed);
      throw new Error("L'AI non ha restituito l'array 'phases'.");
    }

    // ✅ VALIDAZIONE: Verifica che ci siano esattamente 4 fasi
    if (parsed.phases.length !== 4) {
      console.warn(`⚠️ Attese 4 fasi, ricevute ${parsed.phases.length}`);
    }

    console.log(`✅ Generazione completata: ${parsed.phases.length} fasi`);

    // Salvataggio nel DB
    const { data: insertedPhases, error: pErr } = await supabase
      .from("phases")
      .insert(
        parsed.phases.map((s, index) => ({
          course_id: courseId,
          macro_phase_id: macroPhaseId,
          title: s.title,
          description: s.description || "",
          order_index: s.order_index || index + 1
        }))
      )
      .select();

    if (pErr) {
      console.error("❌ Errore inserimento DB:", pErr);
      throw pErr;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        phases: insertedPhases,
        keywords_used: keywords,
        difficulty_level: orderIndex
      }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("🚨 CRASH STEP 2:", err.message);
    return new Response(
      JSON.stringify({ 
        error: err.message, 
        success: false 
      }), 
      { status: 500, headers: corsHeaders }
    );
  }
});