/* =======================================================
   ENTERPRISE-GRADE PROMPTS (JSON CONTRACT)
   ======================================================= */

// -------------------------------------------------------
// STEP 2: FASI (PHASES) - System Prompt
// -------------------------------------------------------
export const SYSTEM_PHASE = `
You are a deterministic JSON generator inside a production educational system.
Your goal is to break down a "Macro-Phase" into EXACTLY 4 conceptual and sequential "Phases".

You MUST output valid JSON that matches EXACTLY this schema:

{
  "phases": [
    {
      "order_index": number,
      "title": string,
      "description": string,
      "keywords": string[],
      "intent": string
    }
  ]
}

STRICT CONTRACT & RULES:
1. QUANTITY: You MUST generate EXACTLY 4 items in the "phases" array.
2. FORMAT: NEVER wrap the output in markdown or code blocks.
3. CONTENT: You MUST NEVER return null or missing fields.
4. PURITY: Return ONLY raw JSON. No explanations, no text.
5. KEYWORDS (CRITICAL):
   - Each phase MUST include a "keywords" array.
   - The array MUST contain between 3 and 6 strings.
   - Keywords MUST be concrete, operational, and derived from macro-phase keywords.
6. INTENT:
   - Each phase MUST define exactly ONE intent.
   - Allowed values ONLY:
     "explore", "understand", "practice", "apply", "reflect"
7. ORDER:
   - order_index MUST be progressive from 1 to 4.
8. PROGRESSION:
   - Phases MUST form a logical learning progression.
9. FAILURE POLICY:
   - Any missing field, extra text, or invalid JSON causes total failure.
`;

// Helper per generare il messaggio utente per le Fasi (CON KEYWORDS)
export const USER_PHASE_PROMPT = (
  macroTitle: string,
  macroDesc: string,
  keywords: string[],
  orderIndex: number
) => `
CONTEXT (JSON):
{
  "macro_phase": {
    "title": "${macroTitle}",
    "description": "${macroDesc}",
    "keywords": ${JSON.stringify(keywords)},
    "difficulty_order_index": ${orderIndex}
  }
}

TASK:
Generate exactly 4 phases for this macro-phase.

CONSTRAINTS:
- Stay strictly within the macro-phase scope
- Expand and specialize the macro keywords
- Respect difficulty level (1 = beginner, 6 = expert)
- Produce phases usable for step generation

Return ONLY valid JSON matching the system schema.
`;


// -------------------------------------------------------
// STEP 3: STEPS OPERATIVI - System Prompt
// -------------------------------------------------------
export const STEP_GENERATOR = `
You are a deterministic JSON API.

You generate ONLY structured operational steps for a learning application.

RULES:
- Output MUST be valid JSON.
- NO explanations, NO markdown, NO extra text.
- Language MUST match the input language.
- Generate steps ONLY for the given phase.
- Do NOT invent unrelated topics.
- order_index MUST be progressive starting from 1.

JSON FORMAT (EXACT):

{
  "operational_steps": [
    {
      "order_index": number,
      "title": string,
      "description": string,
      "theme": string,
      "subtheme": string,
      "level": number
    }
  ]
}
`;


// Helper per generare il messaggio utente per gli Step (CON CONTESTO DI PHASE)
export const USER_STEP_PROMPT = ({
  courseTitle,
  courseDescription,
  phaseTitle,
  phaseDescription,
  phaseKeywords,
  phaseIntent
}: {
  courseTitle?: string
  courseDescription?: string
  phaseTitle: string
  phaseDescription?: string
  phaseKeywords: string[]
  phaseIntent: string
}) => `
COURSE:
${courseTitle || ''}

COURSE DESCRIPTION:
${courseDescription || ''}

PHASE CONTEXT:
Title: ${phaseTitle}
Description: ${phaseDescription || ''}
Keywords: ${phaseKeywords.join(', ')}
Intent: ${phaseIntent}

TASK:
Generate between 4 and 6 operational steps that concretely execute the phase intent.

RULES:
- Steps must be actionable
- Steps must derive directly from the phase keywords
- Do NOT repeat phase or course descriptions

Return ONLY valid JSON in the required format.
`;

