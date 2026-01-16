// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { topic, userId } = await req.json();
    console.log(`🚀 START STEP 1: Generazione corso per "${topic}"`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Chiamata a Groq
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}` 
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        messages: [
          { 
            role: "system", 
            content: `Sei ARCHITETTO MACROFASE UNIVERSALE. Rispondi SOLO JSON con questa struttura:
{
  "course_title": "Titolo del corso (max 100 caratteri)",
  "course_description": "Descrizione generale (2-3 frasi)",
  "macro_phases": [
    {
      "title": "SCOPERTA|COMPRENSIONE|PRATICA|AUTONOMIA|OTTIMIZZAZIONE|MASTERY",
      "description": "Breve descrizione (1 frase)",
      "keywords": ["key1", "key2", "key3", "key4", "key5"],
      "order_index": 1,
      "estimated_months": 2
    }
  ]
}

REGOLE OBBLIGATORIE:
- ESATTAMENTE 6 macrofasi (order_index da 1 a 6)
- order_index rappresenta il livello: 1=principiante assoluto, 6=mastery
- Progressione da ZERO ASSOLUTO (order_index 1) a MASTERY (order_index 6)
- estimated_months: stima realistica mesi per completare la fase con pratica costante
- keywords: 5-8 parole chiave specifiche e tecniche che definiscono il contenuto didattico
- Titoli FISSI: SCOPERTA, COMPRENSIONE, PRATICA, AUTONOMIA, OTTIMIZZAZIONE, MASTERY` 
          },
          { role: "user", content: `topic = "${topic}"` }
        ]
      })
    });

    const gData = await groqRes.json();

    if (!gData.choices || !gData.choices[0]) {
      console.error("❌ Errore risposta AI:", gData);
      throw new Error(`Errore AI: ${gData.error?.message || "Nessuna risposta ricevuta"}`);
    }

    const content = JSON.parse(gData.choices[0].message.content);
    console.log("🤖 AI ha generato:", content);

    // Validazione: verifica 6 macrofasi
    if (!content.macro_phases || content.macro_phases.length !== 6) {
      throw new Error(`AI ha generato ${content.macro_phases?.length || 0} macrofasi invece di 6`);
    }

    // 2. Salvataggio Corso
    const { data: course, error: cErr } = await supabase.from("courses").insert({
      user_id: userId,
      title: content.course_title,
      description: content.course_description
    }).select().single();

    if (cErr) throw new Error(`Errore salvataggio corso: ${cErr.message}`);

    // 3. Salvataggio Macro-Fasi CON KEYWORDS
    const { data: insertedMacros, error: mErr } = await supabase.from("macro_phases").insert(
      content.macro_phases.map(m => ({
        course_id: course.id,
        title: m.title,
        description: m.description,
        keywords: m.keywords || [], // Salvataggio keywords
        estimated_months: m.estimated_months,
        order_index: m.order_index
      }))
    ).select();

    if (mErr) throw new Error(`Errore salvataggio macrofasi: ${mErr.message}`);

    console.log(`✅ STEP 1 COMPLETATO: Corso ${course.id} con ${insertedMacros.length} macro-fasi`);

    // 4. Response con keywords per debugging
    return new Response(JSON.stringify({ 
      success: true, 
      courseId: course.id, 
      course_title: course.title,
      course_description: course.description,
      macro_phases: insertedMacros.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        estimated_months: m.estimated_months,
        order_index: m.order_index
      }))
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("🚨 CRASH STEP 1:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});