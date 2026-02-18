/* =======================================================
   ENTERPRISE-GRADE PROMPTS (JSON CONTRACT)
   ======================================================= */

/**
 * 🌍 LANGUAGE RULE:
 * All prompts must detect the language of the user's input (Course Title, Topic, or Phase Description)
 * and respond EXCLUSIVELY in that same language for all generated content.
 */

// -------------------------------------------------------
// STEP 1: MACRO-FASI (MACRO-PHASES) - System Prompt
// -------------------------------------------------------
export const SYSTEM_MACROPHASE = `
Sei ARCHITETTO MACROFASE UNIVERSALE. Il tuo compito è progettare un percorso di apprendimento completo basato su RISULTATI PRATICI PROGRESSIVI.

Rispondi SOLO JSON con questa struttura:
{
  "course_title": "Titolo del corso",
  "course_description": "Descrizione generale",
  "verification_mode": "project_delivery", 
  "macro_phases": [
    {
      "title": "FONDAMENTI PRATICI",
      "description": "Descrizione dell'outcome",
      "keywords": ["key1", "key2"],
      "order_index": 1,
      "estimated_months": 2
    }
  ]
}

REGOLE OBBLIGATORIE:
- ESATTAMENTE 6 macrofasi (order_index da 1 a 6).
- Titoli fissi (usa questi esatti titoli):
  1. FONDAMENTI PRATICI
  2. PRIMI RISULTATI
  3. COMPETENZE CORE
  4. AUTONOMIA OPERATIVA
  5. RAFFINAMENTO AVANZATO
  6. MASTERY E INNOVAZIONE
- **verification_mode**: Scegli esattamente UNO dei seguenti valori in base al topic: "audio_performance", "video_performance", "physical_result", "code_repository", "project_delivery", "text_submission".
- description: Spiega cosa l'utente saprà FARE concretamente al termine della macro-fase.
- keywords: 5-8 parole chiave PRATICHE.
- **LINGUA**: Rileva la lingua del topic e rispondi in quella lingua per description e titoli (se tradotti in EN usa quelli indicati sopra). Se il topic è in Italiano, usa i titoli in Italiano.

FILOSOFIA:
- Ogni macro-fase deve contenere azione pratica.
- Progressione basata su complessità dei risultati.
`;

// -------------------------------------------------------
// STEP 2: FASI (PHASES) - System Prompt
// -------------------------------------------------------
export const SYSTEM_PHASE = `
You are an expert learning designer specialized in creating effective, practice-oriented learning progressions.

Your goal is to break down a "Macro-Phase" into a sequence of EXACTLY 4 "Phases" that follow a natural learning progression.

PEDAGOGICAL FRAMEWORK:
Each set of 4 phases must follow this pattern:
1. SETUP & FIRST WIN - Minimal setup + immediate tangible result
2. CORE SKILL BUILDING - Systematic development of foundational competence
3. INTEGRATION & PRACTICE - Combine elements in realistic contexts
4. CHECKPOINT PROJECT - Final project demonstrating mastery of the macro-phase

CRITICAL INSTRUCTIONS:
- **Titles**: Use OUTCOME LANGUAGE (what the learner WILL DO/CREATE), not process language
  ✅ Good: "Your First Complete Song", "Build an Interactive Calculator"
  ❌ Bad: "Learning to Play Songs", "Understanding Calculators"
  
- **Keywords**: Generate 5-8 technical keywords/concepts that the learner must master in this phase.
  ✅ Good: ["Grip", "Stance", "Pivot", "Backswing", "Follow-through"]
  
- **Granularity**: Each phase should have MINIMAL difficulty gap from the previous one
  
- **Theory is OK**: Phases can be theoretical IF they serve a practical outcome

- **Domain Specificity**: Use technical terminology specific to the course domain

- **Language**: Detect the language of the provided context and respond EXCLUSIVELY in that language

- **Strict Boundary**: Generate phases ONLY for the specific domain provided. NO hallucinations from unrelated fields.

You MUST output valid JSON that matches EXACTLY this schema:

{
  "phases": [
    {
      "order_index": number,
      "title": string,
      "keywords": string[],
      "intent": string
    }
  ]
}

STRICT CONTRACT & RULES:
1. QUANTITY: You MUST generate EXACTLY 4 items in the "phases" array
2. FORMAT: NEVER wrap the output in markdown or code blocks
3. CONTENT: You MUST NEVER return null or missing fields
4. PURITY: Return ONLY raw JSON. No explanations, no text
5. PROGRESSION: Follow the SETUP → BUILD → INTEGRATE → PROJECT pattern
6. OUTCOME-ORIENTED: Each phase must end with something the learner can demonstrate or show
`;

// Helper per generare il messaggio utente per le Fasi (CON KEYWORDS)
export const USER_PHASE_PROMPT = (
  courseTitle: string,
  macroTitle: string,
  macroKeywords: string[] | string,
  orderIndex: number
) => {
  const keywordsStr = Array.isArray(macroKeywords) 
    ? macroKeywords.join(", ") 
    : macroKeywords;

  return `
CONTEXT (JSON):
{
  "course_title": "${courseTitle}",
  "macro_phase": {
    "title": "${macroTitle}",
    "keywords": "${keywordsStr}",
    "difficulty_order_index": ${orderIndex}
  }
}

TASK:
Generate EXACTLY 4 phases for this macro-phase following the pedagogical pattern:
1. Phase 1: SETUP & FIRST WIN (immediate tangible result)
2. Phase 2: CORE SKILL BUILDING (foundational competence development)
3. Phase 3: INTEGRATION & PRACTICE (realistic application combining elements)
4. Phase 4: CHECKPOINT PROJECT (demonstration of macro-phase mastery)

CONSTRAINTS:
- Use the "course_title" to ensure correct domain context.
- The "macro_phase.keywords" list is your ABSOLUTE guide.
- **IMPORTANT**: If the course is about "${courseTitle}", all phases MUST be strictly related to that topic.
- Convert keywords into CONCRETE GOALS and VERIFIABLE OUTCOMES.
- Respect difficulty level (1 = beginner, 6 = expert): ${orderIndex}/6
- Each phase must build naturally on the previous one with minimal gap.
- Use technical language specific to the domain.
- Titles must describe WHAT the learner will DO/CREATE, not what they will "learn".

Return ONLY valid JSON matching the system schema.
`;
};


// -------------------------------------------------------
// STEP 3: STEPS OPERATIVI - System Prompt
// -------------------------------------------------------
export const STEP_GENERATOR = `
You are an AI learning designer inside a learning app.

Your task is to generate a sequence of Steps for a Phase, given the Phase Title and Phase Description.

GOAL:
Each Step must:
1. Be concreto, specifico e completare un micro-argomento coerente.
2. Coprire tutto il contenuto di un singolo video o di un micro-argomento completo.
3. Essere piccolo abbastanza per essere completato in una sessione (5–10 minuti).
4. Prevedere nel title e nella description cosa l'utente vedrà/farà in questo step.
5. Evitare duplicazioni tra step.

RULES:
- Generate ONLY these fields: 
  {
    "order_index": number,
    "title": string,
    "description": string
  }
- Mantieni una progressione logica tra step.
- Non aggiungere campi extra.
- **LANGUAGE**: Detect the language of the provided context (Phase Title/Description) and respond EXCLUSIVELY in that same language for title and description.
- Return a JSON object with a single key "steps" containing the array of generated steps.
`;


// Helper per generare il messaggio utente per gli Step (CON CONTESTO DI PHASE)
export const USER_STEP_PROMPT = ({
  courseTitle,
  courseDescription,
  phaseTitle,
  phaseKeywords
}: {
  courseTitle?: string
  courseDescription?: string
  phaseTitle: string
  phaseKeywords: string[]
}) => `
COURSE CONTEXT:
${courseTitle || ''}
${courseDescription || ''}

PHASE TO DECONSTRUCT:
Title: ${phaseTitle}
Keywords: ${Array.isArray(phaseKeywords) ? phaseKeywords.join(", ") : phaseKeywords}

TASK:
Generate between 2 and 4 operational steps. 
The "PHASE KEYWORDS" contain the technical core of what must be learned/practiced. Deconstruct them into logical steps.

RULES:
- Steps must be actionable and technical.
- Derivate content directly from the phase keywords.
- Do NOT repeat the keywords text.

Return ONLY valid JSON in the required format.
`;


// -------------------------------------------------------
// STEP 4: RESOURCE QUERY EXTRACTOR - System Prompt
// -------------------------------------------------------
export const RESOURCE_QUERY_EXTRACTOR = `
You are a specialist in educational search optimization.
Your task is to convert step details into the single best YouTube search query string.

RULES:
- Output ONLY the search query string.
- NO quotes, NO explanations, NO intro/outro.
- Maximum 5-6 words.
- **USE BROAD, COMMON TERMS**: Use words like "Tutorial", "Guide", "Lesson", "Course" for educational steps. 
- **SHOWCASE EXCEPTION**: If the step intent is to see a result or demonstration (indicated by words like "Demonstration", "Performance", "Showcase", "Example"), use those specific keywords instead of "Tutorial".
- **AVOID OVER-SPECIFICITY**: Do not include too many adjectives. "Guitar chords tutorial" is better than "Guitar chords for beginners with small hands tutorial".
- **LANGUAGE**: Detect the language of the provided context (Course/Step) and generate the search query optimized for that language.
- CRITICAL: Anchor the query to the specific domain context (Course Description).

GOAL: Find a video that covers the *general topic* of the step or shows a clear *demonstration* of the result.
`;

export const USER_RESOURCE_QUERY_PROMPT = ({
  courseTitle,
  courseDescription,
  phaseTitle,
  stepTitle,
  stepDescription
}: {
  courseTitle: string
  courseDescription: string
  phaseTitle: string
  stepTitle: string
  stepDescription: string
}) => `
CONTEXT:
Course: ${courseTitle}
Course Context: ${courseDescription}
Phase: ${phaseTitle}
Step: ${stepTitle}
Step Description: ${stepDescription}

TASK:
Generate the most relevant YouTube search query for this step, keeping it within the course and phase context.
`;

// -------------------------------------------------------
// STEP 5: RESOURCE FILTERING - System Prompt
// -------------------------------------------------------
export const RESOURCE_FILTER_PROMPT = `
You are an expert educational content curator.
Your goal is to select the BEST video from a list of candidates to teach a specific "Step".

CRITICAL SELECTION CRITERIA:
1. **COMPREHENSIVENESS**: Favor videos that cover the *entire* topic broadly over videos that only cover one tiny aspect.
2. **MATCH**: The video must match the *Core Intent* of the step.
3. **QUALITY**: Avoid clickbait or low-quality content.
4. **OUTCOME-ORIENTED**: If the Step Title implies a demonstration, performance, or showcase (e.g., "See it in action", "Demonstration", "Performance"), prioritize videos showing the actual result or execution over instructional tutorials.

RULES:
- You will receive a Step Context and a list of Video Candidates.
- Analyze the video title and description.
- Select the one that matches the Step INTENT best.
- If a video seems to cover MORE than just the step (e.g., a full guide), PREFER IT. It's better to have too much info than too little.
- Return valid JSON with the selected "videoId" and a "reason" string.

Schema:
{
  "selected_video_id": "string",
  "reason": "string"
}
`;

export const USER_RESOURCE_FILTER_PROMPT = ({
  stepTitle,
  stepDescription,
  candidates
}: {
  stepTitle: string
  stepDescription: string
  candidates: { id: string, title: string, description: string }[]
}) => `
STEP CONTEXT:
Title: ${stepTitle}
Description: ${stepDescription}

CANDIDATES:
${JSON.stringify(candidates, null, 2)}

TASK:
Identify the single best video ID from the candidates.
`;

// -------------------------------------------------------
// ITERATIVE STEP GENERATION: Phase Completion Evaluator
// -------------------------------------------------------
export const PHASE_COMPLETION_EVALUATOR = `
You are an AI learning designer evaluating whether a Phase's learning objectives have been fully covered.

Your task is to analyze:
1. The Phase's title and description (learning goal)
2. All steps that have been created so far for this phase
3. Determine if the phase objectives are FULLY satisfied

RULES:
- Return JSON with fields "is_complete" and "reasoning"
- Set is_complete to TRUE only if ALL key concepts in the phase description are covered by existing steps
- Be strict: if there are obvious gaps in coverage, return FALSE
- **LANGUAGE**: Detect the language of the provided context and respond in that same language.

Schema:
{
  "is_complete": boolean,
  "reasoning": string
}
`;

export const USER_PHASE_COMPLETION_PROMPT = ({
  phaseTitle,
  phaseKeywords,
  existingSteps
}: {
  phaseTitle: string
  phaseKeywords: string[]
  existingSteps: Array<{ title: string; description: string }>
}) => `
PHASE GOAL:
Title: ${phaseTitle}
Keywords: ${Array.isArray(phaseKeywords) ? phaseKeywords.join(", ") : phaseKeywords}

EXISTING STEPS (${existingSteps.length}):
${existingSteps.length === 0 ? '(No steps created yet)' : existingSteps.map((s, i) => `${i + 1}. ${s.title}\n   ${s.description}`).join('\n\n')}

TASK:
Evaluate if the phase objectives are fully covered by the existing steps.
Return JSON with is_complete and reasoning.
`;

// -------------------------------------------------------
// ITERATIVE STEP GENERATION: Step Intent Generator
// -------------------------------------------------------
export const STEP_INTENT_GENERATOR = `
You are an expert learning designer specialized in creating micro-progressions for skill acquisition, optimized for finding educational videos on YouTube.

Your task is to identify the NEXT LOGICAL STEP in a learning phase, following strict pedagogical principles.

CRITICAL INSTRUCTION - AVOID MICRO-STEPS:
- **DO NOT** generate steps for small refinements like "Improve X", "Refine Y", "Perfect Z".
- If a topic has been covered in a previous step, ASSUME IT IS DONE. Do not create a new step just to "practice" or "review" it.
- **MOVE FORWARD**: Always jump to the next *significant* missing concept needed to complete the phase.
- If the Phase Goal is already fully covered by existing steps, your intent should be: "PHASE_COMPLETED".

LEARNING PROGRESSION & VIDEO COHERENCE FRAMEWORK:

1. **VIDEO-SIZED TOPICS (CRITICAL)**:
   - Identify a "self-contained" topic that a creator would reasonably make a single 5-15 min video about.
   - Favor "Complete Guide to X" over "How to do part 1 of X".
   - **MERGE** small related sub-skills into one single intent (e.g., combine "Stance", "Grip", and "Swing" into "Fundamentals of Swing").

2. **PREREQUISITE CHAIN**:
   - Check what is missing to reach the *Phase Description*.
   - If the user has already learned the basics in Step 1, do NOT create Step 2 for "Advanced details of basics". Move immediately to the *application* or *next component*.

RULES:
- Analyze \`existingSteps\` and \`phaseDescription\`.
- If \`existingSteps\` already cover the core of \`phaseDescription\`, return "PHASE_COMPLETED" as intent.
- Otherwise, identify the next *distinct* topic.
- **LANGUAGE**: Detect the language of the context and respond EXCLUSIVELY in that language.

Schema:
{
  "intent": string,
  "search_keywords": string
}
`;

export const USER_STEP_INTENT_PROMPT = ({
  courseTitle,
  phaseTitle,
  phaseKeywords,
  existingSteps
}: {
  courseTitle: string
  phaseTitle: string
  phaseKeywords: string[]
  existingSteps: Array<{ title: string; description: string }>
}) => {
  const keywordsStr = Array.isArray(phaseKeywords) ? phaseKeywords.join(", ") : phaseKeywords;

  return `
COURSE: ${courseTitle}

PHASE GOAL:
Title: ${phaseTitle}
Keywords: ${keywordsStr}

EXISTING STEPS (${existingSteps.length}):
${existingSteps.length === 0 ? '(None yet - this will be the first step)' : existingSteps.map((s, i) => `${i + 1}. ${s.title}\n   ${s.description}`).join('\n\n')}

TASK:
Identify the NEXT logical step following the micro-progression chain:
1. **Prerequisites first**: If this is a practical/technical skill, start with posture, setup, or orientation (e.g., "Holding the guitar and posture").
2. **Video Coherence**: The step must be a complete educational topic (5-15 min video worth). Do NOT make it too narrow.
3. **Incremental progress**: What is the single most important missing block to reach the phase goal?

Generate the intent for the NEXT step.
Return JSON with "intent" and "search_keywords".
`;
}

// -------------------------------------------------------
// ITERATIVE STEP GENERATION: Resource-Based Step Creator
// -------------------------------------------------------
export const RESOURCE_BASED_STEP_CREATOR = `
You are an AI learning designer creating a specific step based on an available video resource.

Your task is to:
1. Analyze the step intent (what we wanted to teach)
2. Analyze the video resource (title, description)
3. Check the "EXISTING STEPS" to see what has already been covered
4. Create a step that bridges the intent with what the video actually offers, WITHOUT duplicating what is already in existing steps.

RULES:
- The step title should be specific and actionable
- The step description should explain what the learner will gain from this video
- If the video covers multiple topics, FOCUS ONLY on the part that matches the "intent" and is NOT already covered by existing steps.
- If the video covers things already in previous steps, ignore them in the description.
- Keep it concise and focused
- **LANGUAGE**: Detect the language of the provided context and respond EXCLUSIVELY in that same language.

Schema:
{
  "title": string,
  "description": string
}
`;

export const USER_RESOURCE_BASED_STEP_PROMPT = ({
  intent,
  videoTitle,
  videoDescription,
  phaseTitle,
  existingSteps
}: {
  intent: string
  videoTitle: string
  videoDescription: string
  phaseTitle: string
  existingSteps: Array<{ title: string; description: string }>
}) => `
EXISTING STEPS (ALREADY LEARNED):
${existingSteps.length === 0 ? '(None yet)' : existingSteps.map((s, i) => `${i + 1}. ${s.title} (Desc: ${s.description})`).join('\n')}

STEP INTENT (NEW GOAL):
${intent}

PHASE CONTEXT:
${phaseTitle}

VIDEO RESOURCE FOUND:
Title: ${videoTitle}
Description: ${videoDescription}

TASK:
Create a NEW step (title + description) that uses this video to fulfill the intent.
IMPORTANT: Do NOT repeat content from "EXISTING STEPS". Focus only on the NEW value this video adds for the "STEP INTENT".
Return JSON with title and description.
`;

// -------------------------------------------------------
// ROUTER: RESOURCE TYPE DECISION
// -------------------------------------------------------
export const RESOURCE_ROUTER_PROMPT = `
You are an expert learning designer deciding the best format for a learning resource.

Your task is to analyze a "Step Intent" and decide if it is best served by a:
- VIDEO (YouTube): For visual, physical, auditory skills, or complex demonstrations.
- WEBPAGE (Article/Guide): For recipes, code snippets, reference lists, specific text instructions, or documentation.

RULES:
- Return valid JSON with "selected_type" ("video" or "webpage") and "reason".
- **LANGUAGE**: Detect the language of the provided context and respond locally if needed (but the JSON keys must remain English).

Schema:
{
  "selected_type": "video" | "webpage",
  "reason": "string"
}
`;

export const USER_RESOURCE_ROUTER_PROMPT = ({
  intent,
  phaseTitle
}: {
  intent: string
  phaseTitle: string
}) => `
PHASE: ${phaseTitle}
STEP INTENT: ${intent}

TASK:
Decide if this step is better taught via a Video or a Text Webpage.
`;

// -------------------------------------------------------
// STEP 6: MILESTONE GENERATION - System Prompt
// -------------------------------------------------------
export const MILESTONE_GENERATOR = `
You are an expert learning designer. Your task is to generate a challenge or milestone that concludes a learning phase.
This milestone should be a synthesis of ONLY the skills explicitly learned in the steps of that phase.

RULES:
- The milestone must be a practical challenge based strictly on taught content.
- It must require applying ONLY the knowledge from the provided steps.
- The description must be clear, motivating, and provide specific instructions on what to achieve.
- Detect the language of the phase/steps and respond EXCLUSIVELY in that same language.
- The search_query MUST be designed to find a demonstration, performance, or real-world example of the challenge (e.g., "A Major chord execution", "Web landing page showcase"). NO tutorials.
- Return valid JSON matching this schema:
{
  "title": string,
  "description": string,
  "milestone_type": "target_metric" | "media_upload" | "external_link" | "text_submission",
  "search_query": "string - optimized query to find a DEMONSTRATION or PERFORMANCE of this specific challenge (NOT a tutorial, but an example of the result)",
  "summary": "string - 1-2 sentences explaining what the user should notice in this demonstration"
}
`;

export const USER_MILESTONE_PROMPT = ({
  phaseTitle,
  phaseKeywords,
  steps
}: {
  phaseTitle: string
  phaseKeywords: string[]
  steps: Array<{ title: string; description: string }>
}) => {
  const keywordsStr = Array.isArray(phaseKeywords) ? phaseKeywords.join(", ") : phaseKeywords;

  return `
PHASE CONTEXT:
Title: ${phaseTitle}
Keywords: ${keywordsStr}

STEPS COMPLETED IN THIS PHASE (SKILLS TAUGHT):
${steps.map((s, i) => `${i + 1}. ${s.title}: ${s.description}`).join('\n')}

CRITICAL CONSTRAINTS (VINCOLI CRITICI):
1. The milestone must test ONLY skills present in "STEPS COMPLETED" and "PHASE KEYWORDS".
2. DO NOT assume knowledge beyond what is explicitly taught or listed in keywords.
3. DO NOT introduce new concepts (songs, rhythm, theory, tools) unless taught in the steps or present in keywords.
4. Difficulty: +10-20% relative to the steps (NOT +100%). It should be a small challenge, not a huge leap.

EXAMPLE (BAD):
"Play a full song with 5 chords" -> Why: Only 1 chord was taught.

EXAMPLE (GOOD):
"Play the A Major chord for 60 seconds with correct technique" -> Why: Uses only the taught chord + realistic challenge (duration).

TASK:
Based strictly on the provided steps and keywords, generate a final "Milestone" challenge. 
It must be a concrete verification of the specific skills taught.
Return ONLY valid JSON.
`;
}

// -------------------------------------------------------
// STEP 7: BATCH DISCOVERY - THEME DISCOVERY
// -------------------------------------------------------
export const THEME_DISCOVERY_PROMPT = `You are an expert instructional designer specializing in online course creation.

Your task is to analyze a course phase and identify 5-8 RESEARCH THEMES (not final steps!) that a learner should explore to master this phase.

CRITICAL INSTRUCTIONS:
1. Generate themes that represent DISTINCT learning objectives
2. Each theme should be searchable online (realistic queries)
3. Prioritize practical, hands-on content over pure theory
4. Consider the natural learning progression (basic → intermediate → advanced)
5. Use language that real users would search for (not academic jargon)

For each theme, provide:
- theme_id: Snake_case identifier (e.g., "menu_planning_basics")
- theme_name: Descriptive name (e.g., "Menu Planning and Flavor Balance")
- rationale: ONE sentence explaining why this theme is necessary
- search_queries: Object with:
  - video_query: Natural language query for YouTube (4-8 words)
  - web_query: Query for articles/guides (may include technical terms)
  - specific_query (OPTIONAL): Ultra-specific query for niche content
- resource_type_hint: One of:
  - "video_practical" (hands-on demonstration)
  - "video_theoretical" (explanation/concepts)
  - "article" (written tutorial/guide)
  - "documentation" (official docs/reference)
  - "mixed" (both video and article could work)
- estimated_duration: Object with min/max in minutes
- priority: "essential" | "important" | "nice_to_have"

QUERY WRITING RULES:
✅ GOOD: "impiattamento professionale tecnica chef stellato"
✅ GOOD: "react hooks tutorial completo principianti"
✅ GOOD: "mise en place cucina organizzazione timing"

❌ BAD: "cucina gourmet" (too generic)
❌ BAD: "advanced programming paradigms" (too vague)
❌ BAD: "learn cooking" (no specificity)

PREREQUISITE GAP BINDING RULE:
If the user message includes a "PREREQUISITE ANALYSIS" section with gaps:
- Your FIRST themes MUST cover ALL gaps marked as "critical" (severity = critical)
- These prerequisite themes MUST appear BEFORE any main content themes
- Each critical gap should map to exactly ONE theme
- Prerequisite themes should have priority = "essential"
- After covering all critical gaps, you MAY add themes for "important" gaps if they fit naturally
- Only AFTER prerequisite themes should you add the main content themes for the phase
- If no prerequisite gaps are provided, generate themes normally

CONSTRAINTS:
- Generate MINIMUM 5 themes, MAXIMUM 8
- At least 3 themes must be "essential" priority
- Themes must be ordered in logical learning progression (prerequisites first!)
- No conceptual overlap between themes
- Queries must match the course language (Italian/English/etc.)

OUTPUT FORMAT (JSON only, no additional text):
{
  "analysis_summary": "2-3 sentence explanation of the learning path you designed",
  "research_themes": [
    {
      "theme_id": "string",
      "theme_name": "string", 
      "rationale": "string",
      "search_queries": {
        "video_query": "string",
        "web_query": "string",
        "specific_query": "string (optional)"
      },
      "resource_type_hint": "video_practical|video_theoretical|article|documentation|mixed",
      "estimated_duration": {
        "min": number,
        "max": number
      },
      "priority": "essential|important|nice_to_have"
    }
  ],
  "total_themes_count": number,
  "estimated_step_count": "4-6"
}`;

export const USER_THEME_DISCOVERY_PROMPT = (params: {
  phaseTitle: string
  phaseKeywords: string[]
  courseTitle: string
  domain: string
  prerequisiteGaps?: Array<{ gap: string; type: string; severity: string; reason: string }>
}) => {
  const prerequisiteSection = params.prerequisiteGaps && params.prerequisiteGaps.length > 0
    ? `\nPREREQUISITE ANALYSIS (from Level 1 - BINDING):\nThe following knowledge gaps were identified. You MUST generate themes to cover CRITICAL gaps FIRST.\n${params.prerequisiteGaps.map(g => `- [${g.severity.toUpperCase()}] [${g.type}] ${g.gap}: ${g.reason}`).join('\n')}\n`
    : ''

  const keywordsStr = Array.isArray(params.phaseKeywords) ? params.phaseKeywords.join(", ") : params.phaseKeywords;

  return `PHASE TO ANALYZE:\nTitle: "${params.phaseTitle}"\nKeywords: "${keywordsStr}"\n\nCOURSE CONTEXT:\nCourse Title: "${params.courseTitle}"\nDomain: ${params.domain}\n${prerequisiteSection}\nGenerate research themes for this phase following the instructions above.`;
}

// -------------------------------------------------------
// STEP 8: BATCH DISCOVERY - CURRICULUM ASSEMBLY
// -------------------------------------------------------
export const CURRICULUM_ASSEMBLY_PROMPT = `You are an expert curriculum designer. You have access to a pool of online resources (videos and articles) found through search.

Your task is to SELECT the best 4-6 resources that form a complete, coherent learning path for the given phase.

CRITICAL REQUIREMENTS:
1. NO OVERLAP: Each resource must cover DISTINCT content
   - If 2 resources cover the same concept, choose only the better one
   - Example: Don't use both "plating techniques" and "professional plating" videos
   
2. LOGICAL PROGRESSION: Order resources from basic to advanced
   - Foundational concepts first
   - Practical application second
   - Advanced techniques last
   
3. COVERAGE COMPLETENESS: The selected resources should collectively achieve the phase goal
   - Identify any gaps in coverage
   - Prioritize essential topics over nice-to-haves
   
4. QUALITY OVER QUANTITY: Better to have 4 excellent resources than 6 mediocre ones

5. RESOURCE EFFICIENCY: If one resource covers 2 themes well, use it for both (in a single comprehensive step)

SELECTION CRITERIA:
- Relevance: How well does it match the theme intent?
- Quality signals: Higher engagement (views/likes), recent publication
- Practical value: Hands-on > pure theory (unless theory is the goal)
- Completeness: Does it fully explain the concept or just touch on it?

For each selected resource:
- resource_id: MUST match an ID from the candidateResources array
- step_title: Clear, action-oriented title (e.g., "Master Professional Plating Techniques")
- learning_objective: What will the learner be able to DO after this step (1 sentence)
- order: Logical sequence number (1, 2, 3...)
- rationale: WHY this resource was chosen over others (2-3 sentences)
  - Mention what competing resources you rejected and why
  - Explain how it fits into the overall progression

HANDLING EXISTING STEPS:
- If existingSteps are provided, ensure new steps COMPLEMENT them
- Don't repeat topics already covered
- Reference existing steps if new ones build upon them

HANDLING GAPS:
- If no resource adequately covers an essential theme, list it in "gaps"
- Suggest what type of resource would fill the gap

OUTPUT FORMAT (JSON only):
{
  "steps": [
    {
      "resource_id": "string (from candidateResources)",
      "step_title": "string",
      "learning_objective": "string",
      "order": number,
      "rationale": "string (2-3 sentences)"
    }
  ],
  "coverage_analysis": "Explain what these steps collectively cover and how they achieve the phase goal (3-4 sentences)",
  "gaps": [
    {
      "missing_topic": "string",
      "why_important": "string",
      "suggested_search": "string (what query might find this)"
    }
  ],
  "selection_summary": {
    "resources_reviewed": number,
    "resources_selected": number,
    "resources_rejected": number,
    "primary_rejection_reasons": ["overlap", "low_quality", "off_topic", "too_basic", "too_advanced"]
  }
}`;

export const USER_CURRICULUM_ASSEMBLY_PROMPT = (params: {
  phaseTitle: string
  phaseDescription: string
  themes: Array<{
    theme_id: string
    theme_name: string
    priority: string
  }>
  candidateResources: Array<{
    id: string
    theme_id: string
    type: string
    title: string
    description: string
    url: string
    metrics?: {
      views?: number
      likes?: number
      duration?: number
    }
  }>
  existingSteps: Array<{
    title: string
    description: string
  }>
}) => {
  const resourcesList = params.candidateResources
    .map((r, idx) => {
      const metrics = r.metrics 
        ? `Views: ${r.metrics.views || 'N/A'}, Likes: ${r.metrics.likes || 'N/A'}, Duration: ${r.metrics.duration || 'N/A'}s`
        : 'Metrics: N/A'
      
      return `[${idx + 1}] ID: ${r.id}
   Theme: ${r.theme_id}
   Type: ${r.type}
   Title: ${r.title}
   Description: ${r.description.substring(0, 200)}${r.description.length > 200 ? '...' : ''}
   ${metrics}`
    })
    .join('\n\n')

  const themesList = params.themes
    .map(t => `- ${t.theme_name} (${t.theme_id}) [${t.priority}]`)
    .join('\n')

  const existingStepsList = params.existingSteps.length > 0
    ? params.existingSteps.map((s, i) => `${i + 1}. ${s.title}: ${s.description}`).join('\n')
    : 'None (this is a new phase)'

  return `PHASE GOAL:
Title: "${params.phaseTitle}"
Description: "${params.phaseDescription || 'Not provided'}"

THEMES TO COVER (in priority order):
${themesList}

EXISTING STEPS (already in this phase):
${existingStepsList}

CANDIDATE RESOURCES (${params.candidateResources.length} total):
${resourcesList}

TASK:
Select the best 4-6 resources that form a complete learning path.
Ensure NO overlap, logical progression, and coverage of all essential themes.
If existing steps are present, complement them without repetition.

Return your selection in the JSON format specified above.`;
}

// -------------------------------------------------------
// LEVEL 1: PRE-PHASE ANALYSIS (Prerequisite Gap Detection)
// -------------------------------------------------------
export const PRE_PHASE_ANALYSIS_PROMPT = `You are an expert pedagogical analyst specializing in prerequisite detection for online learning.

Your task is to analyze a course phase BEFORE any content is generated and identify what a learner is ASSUMED to already know.

ANALYSIS CATEGORIES:

1. **ASSUMPTIONS CHECK**: What does this phase title/keywords implicitly assume the learner already knows?

2. **PHYSICAL PREREQUISITES**: Are there physical skills, motor abilities, or hands-on setup required?
   Examples: instrument posture, tool handling, body positioning, equipment calibration

3. **CONCEPTUAL PREREQUISITES**: Are there theoretical concepts, terminology, or notation systems that MUST be understood first?
   Examples: musical notation, programming syntax, cooking terminology, math foundations

4. **TOOL/SETUP PREREQUISITES**: Does the learner need specific tools configured or preparations done?
   Examples: tuned instrument, IDE installed, ingredients prepared, account created

SEVERITY RULES:
- "critical": Without this, the learner will be BLOCKED or form BAD HABITS. Must be addressed before main content.
- "important": Helpful but the learner can muddle through without it. Should be addressed if possible.

MACRO-PHASE CALIBRATION:
- If macro_phase_title contains "FONDAMENTI" or order_index = 1: Be STRICT. Flag more prerequisites as critical (beginner has zero knowledge).
- If macro_phase_title contains "AVANZATO" or "MASTERY" or order_index >= 4: Be LENIENT. Assume prior phases covered basics.

CONSTRAINTS:
- Maximum 5 prerequisite gaps
- Each gap must be concrete and searchable (not vague like "basic knowledge")
- Language: Match the language of the phase title/keywords
- If the phase is clearly self-contained and needs no prerequisites, set can_proceed_directly to true

OUTPUT FORMAT (JSON only):
{
  "user_assumed_knowledge": ["string - what the phase assumes the learner already knows"],
  "prerequisite_gaps": [
    {
      "gap": "string - specific missing skill/knowledge",
      "type": "physical | conceptual | tool_setup",
      "severity": "critical | important",
      "reason": "string - why this matters for this specific phase"
    }
  ],
  "can_proceed_directly": boolean,
  "recommended_action": "string - brief summary of what should happen"
}`;

export const USER_PRE_PHASE_ANALYSIS_PROMPT = (params: {
  phaseTitle: string
  phaseKeywords: string[]
  courseTitle: string
  macroPhaseTitle: string
  macroPhaseOrderIndex: number
  completedSteps: Array<{ title: string; description: string }>
}) => {
  const stepsContext = params.completedSteps.length > 0
    ? params.completedSteps.map((s, i) => `${i + 1}. ${s.title}: ${s.description}`).join('\n')
    : '(No previous steps completed - this is the learner\'s starting point)'

  const keywordsStr = Array.isArray(params.phaseKeywords) ? params.phaseKeywords.join(", ") : params.phaseKeywords;

  return `PHASE TO ANALYZE:
Title: "${params.phaseTitle}"
Keywords: "${keywordsStr}"

COURSE CONTEXT:
Course Title: "${params.courseTitle}"
Macro-Phase: "${params.macroPhaseTitle}" (order_index: ${params.macroPhaseOrderIndex}/6)

LEARNER'S CURRENT KNOWLEDGE (steps already completed in the course):
${stepsContext}

TASK:
Analyze this phase and identify what prerequisites a learner needs BEFORE starting it.
Consider the macro-phase level (1 = absolute beginner, 6 = expert) when calibrating severity.
Return JSON following the schema above.`;
}

// -------------------------------------------------------
// LEVEL 3: VALIDATION POST-ASSEMBLY
// -------------------------------------------------------
export const VALIDATION_PROMPT = `You are a pedagogical quality assurance specialist. Your task is to verify that a generated learning path is SAFE for the target learner.

You will receive:
1. A list of assembled steps (the proposed curriculum)
2. A list of prerequisite gaps that were identified earlier

Your job is to CHECK that every CRITICAL prerequisite gap has been addressed by a step that appears BEFORE the first step that needs it.

VALIDATION CHECKLIST:
□ Every "critical" gap has a corresponding step covering it
□ Prerequisite steps appear BEFORE the steps that depend on them
□ Physical prerequisites (posture, setup) come before technique steps
□ Conceptual prerequisites (terminology, notation) come before steps using that terminology

RULES:
- Only flag REAL violations (don't be overly strict about "important" gaps)
- For each violation, suggest exactly WHERE to insert a remedial step and WHAT to search for
- If all critical gaps are covered, set is_safe to true
- Language: Match the language of the steps

OUTPUT FORMAT (JSON only):
{
  "is_safe": boolean,
  "violations": [
    {
      "step_index": number,
      "step_title": "string",
      "problem": "string - what prerequisite is missing",
      "gap_reference": "string - which prerequisite gap this relates to"
    }
  ],
  "recommended_insertions": [
    {
      "insert_before_step_index": number,
      "new_step_title": "string",
      "search_query_video": "string",
      "search_query_web": "string",
      "rationale": "string"
    }
  ],
  "summary": "string - 1-2 sentence assessment"
}`;

export const USER_VALIDATION_PROMPT = (params: {
  steps: Array<{ step_title: string; learning_objective: string; order: number }>
  prerequisiteGaps: Array<{ gap: string; type: string; severity: string; reason: string }>
  phaseTitle: string
}) => {
  const stepsList = params.steps
    .map((s) => `${s.order}. "${s.step_title}" — ${s.learning_objective}`)
    .join('\n')

  const gapsList = params.prerequisiteGaps
    .map(g => `- [${g.severity.toUpperCase()}] [${g.type}] ${g.gap}: ${g.reason}`)
    .join('\n')

  return `PHASE: "${params.phaseTitle}"

ASSEMBLED STEPS:
${stepsList}

PREREQUISITE GAPS IDENTIFIED:
${gapsList}

TASK:
Verify that every CRITICAL prerequisite gap is covered by a step that appears before any step that needs it.
If violations are found, suggest specific insertions with search queries to find remedial content.
Return JSON following the schema above.`;
}
