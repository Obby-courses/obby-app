// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { categorizeResource } from '../categorize-resource.ts'
import {
    CURRICULUM_ASSEMBLY_PROMPT,
    PRE_PHASE_ANALYSIS_PROMPT,
    THEME_DISCOVERY_PROMPT,
    USER_CURRICULUM_ASSEMBLY_PROMPT,
    USER_PRE_PHASE_ANALYSIS_PROMPT,
    USER_THEME_DISCOVERY_PROMPT,
    USER_VALIDATION_PROMPT,
    VALIDATION_PROMPT
} from '../prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SEARCH_RESOURCES_FN = 'search-resources'
const SEARCH_WEB_FN = 'search-web-resource'

/* ------------------------------------------------------------------
   HELPER FUNCTIONS
   ------------------------------------------------------------------ */

// Domain detection helper
function detectDomain(courseTitle?: string): string {
  if (!courseTitle) return 'generico'
  const lower = courseTitle.toLowerCase()
  
  const domainMap: Record<string, string[]> = {
    'cucina': ['cucina', 'cooking', 'chef', 'ricetta', 'food', 'mangiare'],
    'programmazione': ['react', 'javascript', 'python', 'coding', 'dev', 'web', 'programmazione'],
    'fitness': ['fitness', 'workout', 'exercise', 'training', 'yoga', 'palestra'],
    'design': ['design', 'ui', 'ux', 'grafica', 'photoshop', 'illustrator'],
    'business': ['marketing', 'business', 'sales', 'startup', 'impresa', 'vendita'],
    'lingua': ['english', 'italiano', 'spanish', 'language', 'lingua', 'tedesco', 'francese']
  }
  
  for (const [domain, keywords] of Object.entries(domainMap)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return domain
    }
  }
  
  return 'generico'
}

// Resource quality filter
interface ResourceCandidate {
  id: string
  theme_id: string
  type: 'video' | 'webpage'
  title: string
  url: string
  description: string
  thumbnail_url?: string
  metrics?: {
    views?: number
    likes?: number
    duration?: number // in seconds
  }
}

function filterQualityResources(resources: ResourceCandidate[]): ResourceCandidate[] {
  const PAYWALL_DOMAINS = [
    'medium.com',
    'nytimes.com', 
    'wsj.com',
    'ft.com',
    'udemy.com',
    'coursera.org'
  ]
  
  return resources.filter(r => {
    // Video quality checks
    if (r.type === 'video' && r.metrics) {
      const duration = r.metrics.duration || 0
      const views = r.metrics.views || 0
      const likes = r.metrics.likes || 0
      
      // Skip very short or very long videos (3m to 30m)
      if (duration < 180 || duration > 1800) return false
      
      // Skip videos with poor engagement if metrics exist
      if (views > 100 && likes > 0) {
        const engagementRate = likes / views
        if (engagementRate < 0.005) return false // < 0.5% engagement (relaxed slightly)
      }
    }
    
    // Webpage quality checks
    if (r.type === 'webpage') {
      // Skip if description too short
      if (!r.description || r.description.length < 50) return false
      
      // Skip known paywall domains
      try {
        const hostname = new URL(r.url).hostname.replace('www.', '')
        if (PAYWALL_DOMAINS.some(pd => hostname.includes(pd))) return false
      } catch (e) {
        return false // Invalid URL
      }
    }
    
    return true
  })
}

// Helper to extract metadata from a web page
async function fetchWebThumbnail(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000) // Slightly longer timeout
    
    const response = await fetch(url, { signal: controller.signal })
    const html = await response.text()
    clearTimeout(timeout)

    // 1. Try Open Graph Image (The most reliable for articles)
    const ogMatch = html.match(/<meta\s+[^>]*property=["']og:image["']\s+content=["']([^"']+)["']/i) || 
                    html.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+property=["']og:image["']/i)
    if (ogMatch?.[1]) return ogMatch[1].startsWith('//') ? `https:${ogMatch[1]}` : ogMatch[1]

    // 2. Try Twitter Image
    const twitterMatch = html.match(/<meta\s+[^>]*name=["']twitter:image["']\s+content=["']([^"']+)["']/i)
    if (twitterMatch?.[1]) return twitterMatch[1]

    // 3. Extraction Logic: Find the first significant <img> tag
    // We look for src that looks like an image and isn't a tiny icon/pixel
    const imgMatches = html.matchAll(/<img\s+[^>]*src=["']([^"']+)["']/gi)
    const baseUrl = new URL(url)

    for (const match of imgMatches) {
        let src = match[1]
        
        // Filter out junk
        const isJunk = src.includes('favicon') || 
                       src.includes('logo') || 
                       src.includes('icon') || 
                       src.includes('pixel') ||
                       src.includes('ads') ||
                       src.length < 10

        if (!isJunk) {
            // Resolve relative URLs
            if (!src.startsWith('http')) {
                try {
                    src = new URL(src, baseUrl).href
                } catch (e) { continue }
            }
            return src
        }
    }

    return null
  } catch (e) {
    console.warn(`[METADATA] Could not fetch thumbnail for ${url}:`, e.message)
    return null
  }
}

// Duplicate URL checker and resource creator
async function getOrCreateResource(
  supabase: any,
  resource: ResourceCandidate
): Promise<{ id: string }> {
  const cleanUrl = resource.url.trim()
  
  // Check if URL already exists
  const { data: existing } = await supabase
    .from('resources')
    .select('id, thumbnail_url')
    .eq('url', cleanUrl)
    .limit(1)
  
  if (existing && existing.length > 0) {
    console.log(`[DEDUP] Resource already exists: ${cleanUrl}`)
    return { id: existing[0].id }
  }

  // SCRAPING ENHANCEMENT: If thumbnail is missing and it's a webpage, try to fetch it
  let finalThumbnail = resource.thumbnail_url
  if (!finalThumbnail && resource.type === 'webpage') {
    console.log(`[SCRAPING] Fetching metadata for: ${cleanUrl}`)
    const extracted = await fetchWebThumbnail(cleanUrl)
    if (extracted) {
      console.log(`[SCRAPING] Found thumbnail: ${extracted}`)
      finalThumbnail = extracted
    }
  }
  
  // 1. Fetch RAW summary from API (if YouTube)
  let rawSummary = ""
  if (resource.type === 'video') {
    const vId = cleanUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1]
    if (vId) {
      console.log(`[RAW-SUM] Fetching raw summary for video ${vId}...`)
      try {
        const RAPID_API_KEY = Deno.env.get("RAPID_API_KEY")
        const sumRes = await fetch(`https://youtube-summarizer2.p.rapidapi.com/summarize?id=${vId}`, {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'youtube-summarizer2.p.rapidapi.com',
            'x-rapidapi-key': RAPID_API_KEY || ''
          }
        })
        if (sumRes.ok) {
          const sumData = await sumRes.json()
          rawSummary = sumData.summary || sumData.translated_summary || sumData.text || sumData.translated_transcript || ""
          if (rawSummary) console.log(`[RAW-SUM] Success: ${rawSummary.length} chars`)
        }
      } catch (sumErr) {
        console.warn(`[RAW-SUM] Failed for ${vId}:`, sumErr.message)
      }
    }
  }

  // FIX 4: Fallback to full description if raw summary is absent OR truncated
  // Truncation signals: ends with '...' OR suspiciously short (<200 chars)
  const isTruncated = !rawSummary || rawSummary.trimEnd().endsWith('...') || rawSummary.length < 200
  if (isTruncated && rawSummary) console.warn(`[RAW-SUM] Summary appears truncated (${rawSummary.length} chars, ends with '...': ${rawSummary.trimEnd().endsWith('...')}). Using full description.`)
  const finalSummary = (!isTruncated ? rawSummary : null) || resource.description

  // Categorize resource via LLM for technical metadata ONLY
  const metadata = await categorizeResource({
    title: resource.title,
    description: resource.description,
    type: resource.type
  })

  // Create new resource
  const { data: newResource, error: createError } = await supabase
    .from('resources')
    .insert({
      title: resource.title,
      url: cleanUrl,
      thumbnail_url: finalThumbnail,
      summary: finalSummary, // RAW SUMMARY
      raw_summary: rawSummary || null,
      type: resource.type,
      domain: metadata.domain,
      subdomain: metadata.subdomain,
      primary_topics: metadata.primary_topics,
      skill_level: metadata.skill_level,
      learning_objectives: metadata.learning_objectives,
      prerequisites: metadata.prerequisites,
      language: metadata.language,
      searchable_text: metadata.searchable_text
    })
    .select('id')
    .single()
  
  if (createError) {
    // Race condition check: if another process inserted it just now
    if (createError.code === '23505') { // Unique constraint violation if exists
       const { data: retry } = await supabase.from('resources').select('id').eq('url', cleanUrl).limit(1)
       if (retry?.[0]) return { id: retry[0].id }
    }
    throw new Error(`Failed to create resource: ${createError.message}`)
  }
  
  return { id: newResource.id }
}

/* ------------------------------------------------------------------
   MAIN FUNCTION
   ------------------------------------------------------------------ */

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  console.log("[VERSION] 2026-02-19 - PRIOR KNOWLEDGE & SKIPPED STATUS SUPPORT v1.1.5")

  try {
    const body = await req.json()
    console.log("[BODY]", JSON.stringify(body))
    let { 
      courseId, 
      phaseId, 
      phaseTitle,
      phaseKeywords,
      courseTitle, 
      courseDescription,
      preview,
      stepsToSave,
      priorKnowledge,
      toolStrategy,
      missingTools,
      availableTools
    } = body

    if (!courseId || !phaseId || !phaseTitle) {
      console.error("❌ Missing parameters:", { courseId, phaseId, phaseTitle })
      return new Response(
        JSON.stringify({ success: false, error: "Missing mandatory parameters (courseId, phaseId, or phaseTitle)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const GROQ_KEY = Deno.env.get('GROQ_API_KEY') || ''

    console.log("[CONFIG] Project URL:", SUPABASE_URL)
    console.log("[CONFIG] Groq Key present:", !!GROQ_KEY)

    if (!GROQ_KEY) throw new Error("Groq API Key not configured in Supabase env")

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Ensure we have course context
    let finalCourseTitle = courseTitle
    let finalCourseDescription = courseDescription

    if (!finalCourseTitle) {
      console.log(`[DATA] Fetching course title for ID: ${courseId}`)
      const { data: courseData } = await supabase
        .from('courses')
        .select('title, description')
        .eq('id', courseId)
        .single()
      
      if (courseData) {
        finalCourseTitle = courseData.title
        finalCourseDescription = courseData.description
      }
    }

    // 0) Load existing steps
    const { data: allStepsData, error: loadError } = await supabase
      .from('steps')
      .select('id, title, description, order_index, phase_id')
      .eq('course_id', courseId)
      .order('order_index')

    if (loadError) console.warn("⚠️ Error loading existing steps:", loadError.message)
    
    // Filter steps for THIS phase to pass as context
    const phaseSteps = (allStepsData || []).filter((s: any) => s.phase_id === phaseId)
    console.log(`[DATA] Found ${phaseSteps.length} existing steps in this phase`)

    /* ======================================================
       SCENARIO: SELECTIVE SAVE (stepsToSave provided)
       ====================================================== */
    if (stepsToSave && Array.isArray(stepsToSave)) {
      console.log(`💾 SCENARIO: SAVING ${stepsToSave.length} SELECTED STEPS`)
      const createdSteps = []
      let globalOrderOffset = phaseSteps.length

      for (const step of stepsToSave) {
        try {
          // 1. Get or Create Resource (The step must contain resource details)
          if (!step.resource) {
            console.warn(`[SAVE SKIP] Step '${step.step_title}' missing resource data`)
            continue
          }

          const { id: resourceId } = await getOrCreateResource(supabase, step.resource)

          // 2. Create Step
          const { data: savedStep, error: stepErr } = await supabase
            .from('steps')
            .insert({
              course_id: courseId,
              phase_id: phaseId,
              order_index: globalOrderOffset + step.order,
              title: step.step_title,
              description: step.learning_objective + (step.rationale ? " " + step.rationale : ""),
              completed: false,
              resource_id: resourceId
            })
            .select()
            .single()

          if (stepErr) throw stepErr
          createdSteps.push(savedStep)
          console.log(`✅ Saved selected step: ${savedStep.title}`)
        } catch (err) {
          console.error(`[SAVE ERROR] Failed to save step '${step.step_title}':`, err)
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        created_steps_count: createdSteps.length 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    /* ======================================================
       PHASE 0: PRE-PHASE ANALYSIS (Level 1)
       ====================================================== */
    console.log("🔬 PHASE 0: PRE-PHASE ANALYSIS")

    // Fetch macro-phase context for severity calibration
    let macroPhaseTitle = 'FONDAMENTI PRATICI'
    let macroPhaseOrderIndex = 1

    let effectiveKeywords = phaseKeywords || []
    try {
      const { data: phaseRow } = await supabase
        .from('phases')
        .select('macro_phase_id, keywords')
        .eq('id', phaseId)
        .single()

      if (phaseRow?.macro_phase_id) {
        const { data: macroData } = await supabase
          .from('macro_phases')
          .select('title, order_index')
          .eq('id', phaseRow.macro_phase_id)
          .single()

        if (macroData) {
          macroPhaseTitle = macroData.title
          macroPhaseOrderIndex = macroData.order_index
        }
      }
      
      if (!effectiveKeywords.length && phaseRow?.keywords) {
        effectiveKeywords = phaseRow.keywords
      }
    } catch (err) {
      console.warn('[PHASE 0] Could not fetch macro-phase context, using defaults:', err)
    }

    console.log(`[PHASE 0] Macro-phase: "${macroPhaseTitle}" (order: ${macroPhaseOrderIndex}/6)`)

    const prePhaseRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: PRE_PHASE_ANALYSIS_PROMPT },
          {
            role: 'user',
            content: USER_PRE_PHASE_ANALYSIS_PROMPT({
              phaseTitle,
              phaseKeywords: effectiveKeywords,
              courseTitle: finalCourseTitle,
              macroPhaseTitle,
              macroPhaseOrderIndex,
              completedSteps: (allStepsData || []).map((s: any) => ({ title: s.title, description: s.description || '' })),
              priorKnowledge
            })
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.4
      })
    })

    let prerequisiteGaps: any[] = []
    let canProceedDirectly = true

    if (prePhaseRes.ok) {
      const prePhaseData = await prePhaseRes.json()
      const prePhaseResult = JSON.parse(prePhaseData.choices[0].message.content)
      prerequisiteGaps = prePhaseResult.prerequisite_gaps || []
      canProceedDirectly = prePhaseResult.can_proceed_directly ?? true

      console.log(`[PHASE 0] Can proceed directly: ${canProceedDirectly}`)
      console.log(`[PHASE 0] Prerequisite gaps (${prerequisiteGaps.length}):`,
        prerequisiteGaps.map((g: any) => `[${g.severity}] ${g.gap}`))
    } else {
      console.warn(`[PHASE 0] Pre-phase analysis failed (${prePhaseRes.status}), proceeding without prerequisites`)
    }

    /* ======================================================
       PHASE 1: THEME DISCOVERY (Level 2 - Prerequisite-Aware)
       ====================================================== */
    console.log("🔍 PHASE 1: DISCOVERY")
    const discoveryRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: THEME_DISCOVERY_PROMPT },
          { 
            role: 'user', 
            content: USER_THEME_DISCOVERY_PROMPT({
              phaseTitle,
              phaseKeywords: effectiveKeywords,
              courseTitle: finalCourseTitle,
              domain: detectDomain(finalCourseTitle),
              prerequisiteGaps: prerequisiteGaps.length > 0 ? prerequisiteGaps : undefined,
              priorKnowledge,
              missingTools: missingTools && missingTools.length > 0 ? missingTools : undefined,
              toolStrategy: toolStrategy || undefined
            })
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      })
    })

    if (!discoveryRes.ok) throw new Error(`Discovery Error: ${discoveryRes.status}`)
    const discoveryData = await discoveryRes.json()
    const themesResult = JSON.parse(discoveryData.choices[0].message.content)
    const themes = themesResult.research_themes || []

    console.log(`[DISCOVERY] Generated ${themes.length} themes:`, themes.map((t: any) => t.theme_name))

    /* ======================================================
       PHASE 2: PARALLEL SEARCH
       ====================================================== */
    console.log("🌐 PHASE 2: PARALLEL SEARCH")
    
    // Create an array of search promises
    const searchPromises = themes.map(async (theme: any) => {
      const results: ResourceCandidate[] = []
      
      // Determine what to search based on hint
      const doSearchVideo = theme.resource_type_hint.includes('video') || theme.resource_type_hint === 'mixed'
      const doSearchWeb = theme.resource_type_hint.includes('article') || theme.resource_type_hint === 'documentation' || theme.resource_type_hint === 'mixed'

      try {
        if (doSearchVideo) {
             const res = await fetch(`${SUPABASE_URL}/functions/v1/${SEARCH_RESOURCES_FN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
                body: JSON.stringify({ 
                    step_title: theme.search_queries.video_query, // Using query as title prompt 
                    step_description: theme.rationale,
                    course_title: finalCourseTitle, 
                    phase_title: phaseTitle 
                }),
            })
            if (!res.ok) throw new Error(`Search Resources (Video) Error: ${res.status} - ${await res.text()}`)
            const data = await res.json()
            if (data.success && data.video) {
                results.push({
                    id: crypto.randomUUID(), // Temp ID
                    theme_id: theme.theme_id,
                    type: 'video',
                    title: data.video.title,
                    url: data.video.url,
                    description: data.video.description,
                    thumbnail_url: data.video.thumbnail_url,
                    metrics: {
                         // Mock metrics if not provided by search-resources (it mostly returns snippet)
                         // Real implementation would pass metrics through search-resources
                         views: 1000, 
                         likes: 10,
                         duration: 600
                    }
                })
            }
        }

        if (doSearchWeb) {
             const res = await fetch(`${SUPABASE_URL}/functions/v1/${SEARCH_WEB_FN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
                body: JSON.stringify({ query: theme.search_queries.web_query, course_title: finalCourseTitle }),
            })
            const data = await res.json()
            if (data.success && data.results) {
                // Take top 2 web results
                data.results.slice(0, 2).forEach((r: any) => {
                    results.push({
                        id: crypto.randomUUID(),
                        theme_id: theme.theme_id,
                        type: 'webpage',
                        title: r.title,
                        url: r.link,
                        description: r.snippet,
                        thumbnail_url: r.thumbnail_url
                    })
                })
            }
        }
      } catch (err) {
          console.error(`[SEARCH ERROR] Theme '${theme.theme_id}' failed:`, err)
      }
      return results
    })

    // Wait for all searches to complete
    const searchResultsNested = await Promise.all(searchPromises)
    const candidateResources = searchResultsNested.flat()

    console.log(`[SEARCH] Found ${candidateResources.length} total raw candidates`)

    /* ======================================================
       PHASE 3: QUALITY FILTERING & ASSEMBLY
       ====================================================== */
    console.log("🧠 PHASE 3: ASSEMBLY")

    // Filter quality
    // const qualityResources = filterQualityResources(candidateResources) // Enabled? 
    // Using filtered for now, but falling back to original if too aggressive
    let qualityResources = filterQualityResources(candidateResources)
    
    if (qualityResources.length < Math.max(2, themes.length / 2)) {
        console.warn("[FILTER] Warning: Quality filter removed too many resources. Using raw candidates.")
        qualityResources = candidateResources
    }

    console.log(`[FILTER] ${qualityResources.length} candidates passed filter`)

    // FIX 1: URL-level dedup — keep only the first occurrence of each URL
    // Prevents the same video from appearing twice under different temp UUIDs
    const seenUrls = new Set<string>()
    qualityResources = qualityResources.filter(r => {
      const key = r.url.trim().toLowerCase()
      if (seenUrls.has(key)) {
        console.log(`[DEDUP-POOL] Removed duplicate resource (same URL): ${r.title} — ${key}`)
        return false
      }
      seenUrls.add(key)
      return true
    })
    console.log(`[DEDUP-POOL] ${qualityResources.length} unique-URL candidates after dedup`)

    if (qualityResources.length === 0) {
         throw new Error("No valid resources found for this phase matching quality criteria.")
    }

    // Call Assembly LLM
    const assemblyRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: CURRICULUM_ASSEMBLY_PROMPT },
          { 
            role: 'user', 
            content: USER_CURRICULUM_ASSEMBLY_PROMPT({
              phaseTitle,
              phaseKeywords: effectiveKeywords,
              themes: themes,
              candidateResources: qualityResources,
              existingSteps: phaseSteps
            })
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      })
    })

    if (!assemblyRes.ok) throw new Error(`Assembly Error: ${assemblyRes.status}`)
    const assemblyData = await assemblyRes.json()
    const curriculum = JSON.parse(assemblyData.choices[0].message.content)
    
    let finalSteps = curriculum.steps || []
    console.log(`[ASSEMBLY] Planned ${finalSteps.length} steps`)

    /* ======================================================
       PHASE 3.5: VALIDATION POST-ASSEMBLY (Level 3)
       ====================================================== */
    let qualityResourcesPool = qualityResources // Keep reference for potential retry

    if (prerequisiteGaps.length > 0) {
      console.log("✅ PHASE 3.5: VALIDATION")

      const validationRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: VALIDATION_PROMPT },
            {
              role: 'user',
              content: USER_VALIDATION_PROMPT({
                steps: finalSteps,
                prerequisiteGaps,
                phaseTitle
              })
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      })

      if (validationRes.ok) {
        const validationData = await validationRes.json()
        const validation = JSON.parse(validationData.choices[0].message.content)

        console.log(`[VALIDATION] is_safe: ${validation.is_safe}`)
        console.log(`[VALIDATION] Summary: ${validation.summary}`)

        if (!validation.is_safe && validation.recommended_insertions?.length > 0) {
          console.log(`[VALIDATION] 🔄 ${validation.recommended_insertions.length} insertions needed, starting compensatory search...`)

          // Compensatory search for missing prerequisite resources
          const compensatoryPromises = validation.recommended_insertions.map(async (insertion: any) => {
            const compResults: ResourceCandidate[] = []

            try {
              // Search video — FIX 3: pass course_title and language for context-aware search
              if (insertion.search_query_video) {
                // Build a query that anchors to the course's target language/subject
                const contextualQuery = `${insertion.search_query_video} ${finalCourseTitle}`
                const res = await fetch(`${SUPABASE_URL}/functions/v1/${SEARCH_RESOURCES_FN}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
                  body: JSON.stringify({
                    step_title: contextualQuery,
                    step_description: insertion.rationale,
                    course_title: finalCourseTitle,
                    phase_title: phaseTitle
                  }),
                })
                const data = await res.json()
                if (data.success && data.video) {
                  compResults.push({
                    id: crypto.randomUUID(),
                    theme_id: `prerequisite_${insertion.insert_before_step_index}`,
                    type: 'video',
                    title: data.video.title,
                    url: data.video.url,
                    description: data.video.description,
                    thumbnail_url: data.video.thumbnail_url,
                    metrics: { views: 1000, likes: 10, duration: 600 }
                  })
                }
              }

              // Search web
              if (insertion.search_query_web) {
                const res = await fetch(`${SUPABASE_URL}/functions/v1/${SEARCH_WEB_FN}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE },
                  body: JSON.stringify({ query: insertion.search_query_web, course_title: finalCourseTitle }),
                })
                const data = await res.json()
                if (data.success && data.results) {
                  data.results.slice(0, 1).forEach((r: any) => {
                    compResults.push({
                      id: crypto.randomUUID(),
                      theme_id: `prerequisite_${insertion.insert_before_step_index}`,
                      type: 'webpage',
                      title: r.title,
                      url: r.link,
                      description: r.snippet,
                      thumbnail_url: r.thumbnail_url
                    })
                  })
                }
              }
            } catch (err) {
              console.error(`[COMPENSATORY SEARCH ERROR]`, err)
            }

            return { insertion, resources: compResults }
          })

          const compensatoryResults = await Promise.all(compensatoryPromises)

          // Build prerequisite steps from compensatory results
          // FIX 2: track URLs already in the pool to avoid adding duplicate videos
          const poolUrls = new Set<string>(qualityResourcesPool.map(r => r.url.trim().toLowerCase()))
          const prerequisiteSteps: any[] = []
          for (const { insertion, resources } of compensatoryResults) {
            if (resources.length > 0) {
              // Pick the first resource whose URL is not already in the pool
              const bestResource = resources.find(r => !poolUrls.has(r.url.trim().toLowerCase()))
              if (!bestResource) {
                console.warn(`[DEDUP-PREREQ] All compensatory resources for '${insertion.new_step_title}' are duplicates — skipping`)
                continue
              }
              poolUrls.add(bestResource.url.trim().toLowerCase())
              qualityResourcesPool = [...qualityResourcesPool, bestResource]

              prerequisiteSteps.push({
                resource_id: bestResource.id,
                step_title: insertion.new_step_title,
                // FIX 1: store only learning_objective — no internal 'Prerequisite insertion' text
                learning_objective: insertion.rationale,
                order: insertion.insert_before_step_index - 0.5
              })
            }
          }

          if (prerequisiteSteps.length > 0) {
            console.log(`[VALIDATION] Inserting ${prerequisiteSteps.length} prerequisite steps`)
            // Merge prerequisite steps with existing steps, re-order
            const mergedSteps = [...prerequisiteSteps, ...finalSteps]
              .sort((a, b) => a.order - b.order)
              .map((s, i) => ({ ...s, order: i + 1 }))
            finalSteps = mergedSteps
            console.log(`[VALIDATION] Final step count after insertion: ${finalSteps.length}`)
          } else {
            console.warn('[VALIDATION] Compensatory search found no resources, proceeding with current steps')
          }
        }
      } else {
        console.warn(`[VALIDATION] Validation call failed (${validationRes.status}), proceeding without validation`)
      }
    } else {
      console.log('[VALIDATION] No prerequisite gaps to validate, skipping Phase 3.5')
    }

    /* ======================================================
       PHASE 3.7: PREPARE PREVIEW RESPONSE
       ====================================================== */
    const stepsWithResources = finalSteps.map((step: any) => {
      const resource = qualityResourcesPool.find(r => r.id === step.resource_id)
      return {
        ...step,
        resource: resource // Embed resource data for the frontend
      }
    })

    if (preview === true) {
      console.log("👀 PREVIEW MODE: Returning steps without saving")
      return new Response(JSON.stringify({
        success: true,
        preview: true,
        steps: stepsWithResources,
        gaps: curriculum.gaps || [],
        coverage_analysis: curriculum.coverage_analysis
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    /* ======================================================
       PHASE 4: BATCH SAVE (PARALLEL)
       ====================================================== */
    console.log("💾 PHASE 4: SAVING")

    let globalOrderOffset = (allStepsData || []).filter((s: any) => s.phase_id === phaseId).length

    const createdStepsResults = await Promise.all(stepsWithResources.map(async (plan) => {
        const resourceCandidate = plan.resource
        if (!resourceCandidate) {
            console.warn(`[SAVE SKIP] Resource data not found for step '${plan.step_title}'`)
            return null
        }

        try {
            // 1. Get or Create Resource
            const { id: resourceId } = await getOrCreateResource(supabase, resourceCandidate)

            // 2. Insert Step
            const { data: savedStep, error: stepErr } = await supabase
                .from('steps')
                .insert({
                    course_id: courseId,
                    phase_id: phaseId,
                    order_index: globalOrderOffset + plan.order,
                    title: plan.step_title,
                    // FIX 1: use only learning_objective — rationale is internal and must not be shown to users
                    description: plan.learning_objective || "",
                    completed: false,
                    resource_id: resourceId
                })
                .select()
                .single()

            if (stepErr) throw stepErr
            console.log(`✅ Saved step: ${savedStep.title}`)
            return savedStep
        } catch (err) {
            console.error(`[SAVE ERROR] Failed to save step '${plan.step_title}':`, err)
            return null
        }
    }))

    const createdSteps = createdStepsResults.filter(s => s !== null)

    // TRIGGER DEDICATED MILESTONE GENERATION (Post-Bulk Save)
    try {
        console.log(`[BULK] Triggering dedicated milestone generation for phase ${phaseId}...`)
        // Fire and forget (optional, but better to await or handle in background if possible)
        // Here we await for safety but in a real high-perf scenario we might just fire it
        const milestoneTrigger = await fetch(`${SUPABASE_URL}/functions/v1/create-milestone`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${SERVICE_ROLE}`,
            apikey: SERVICE_ROLE
          },
          body: JSON.stringify({
            courseId,
            phaseId,
            phaseTitle,
            phaseKeywords: effectiveKeywords,
            steps: createdSteps, // Pass the newly created steps as context
            availableTools: availableTools // Pass available tools for constraint check
          })
        })
        
        if (milestoneTrigger.ok) {
            console.log("✅ Milestone generation triggered successfully via dedicated function")
        } else {
            console.error(`[TRIGGER ERROR] Milestone function returned ${milestoneTrigger.status}`)
        }
    } catch (mErr) {
        console.error("[TRIGGER ERROR] Failed to call dedicated milestone function:", mErr)
    }

    return new Response(JSON.stringify({ 
        success: true, 
        created_steps_count: createdSteps.length,
        gaps: curriculum.gaps || []
    }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err: any) {
    console.error('❌ FATAL ERROR in create-steps:', err)
    return new Response(JSON.stringify({ success: false, error: err.message || "Unspecified server error" }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})