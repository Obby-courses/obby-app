// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- NUOVO PROMPT CONTRATTO ---
const SYSTEM_PHASE = `You are a deterministic JSON generator. Output EXACTLY 4 phases in this JSON format: { "phases": [{ "order_index": number, "title": string, "description": string }] }. No markdown, no extra text.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { courseId, macroPhaseId, macroPhaseTitle } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PHASE },
          { role: "user", content: `Genera le 4 fasi per la macro-fase: "${macroPhaseTitle}"` }
        ]
      })
    });

    const gData = await groqRes.json();
    const rawContent = gData.choices[0].message.content;

    // 🛡️ PULIZIA JSON (Rimuove markdown se presente)
    const cleanJson = rawContent.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    // 🛡️ CONTROLLO DI SICUREZZA (Previene il crash del .map)
    if (!parsed.phases || !Array.isArray(parsed.phases)) {
      console.error("Struttura AI errata:", parsed);
      throw new Error("L'AI non ha restituito l'array 'phases'.");
    }

    const { error: pErr } = await supabase.from("phases").insert(
      parsed.phases.map((s) => ({
        course_id: courseId,
        macro_phase_id: macroPhaseId,
        title: s.title,
        description: s.description || "",
        order_index: s.order_index
      }))
    );

    if (pErr) throw pErr;

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err) {
    console.error("🚨 CRASH STEP 2:", err.message);
    return new Response(JSON.stringify({ error: err.message, success: false }), { status: 500, headers: corsHeaders });
  }
});