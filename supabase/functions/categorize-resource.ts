// @ts-nocheck
/**
 * Shared utility for AI-powered resource categorization.
 * Called by getOrCreateResource in create-steps and create-milestone
 * to enrich new resources with semantic metadata before DB insert.
 */

import { UNIVERSAL_RESOURCE_CATEGORIZER } from './prompts.ts'

const GROQ_KEY = Deno.env.get('GROQ_API_KEY')!

// -------------------------------------------------------
// Types
// -------------------------------------------------------
export interface ResourceMetadata {
  domain: string
  subdomain: string | null
  primary_topics: Array<{
    type: 'skill' | 'concept' | 'tool' | 'technique' | 'entity'
    term: string
    original: string
  }>
  skill_level: 'beginner' | 'intermediate' | 'advanced'
  learning_objectives: string[]
  prerequisites: string[]
  language: string
  searchable_text: string
}

// Minimal safe fallback when LLM fails
const FALLBACK_METADATA: ResourceMetadata = {
  domain: 'other',
  subdomain: null,
  primary_topics: [{ type: 'concept', term: 'general_tutorial', original: 'tutorial' }],
  skill_level: 'beginner',
  learning_objectives: [],
  prerequisites: [],
  language: 'it',
  searchable_text: ''
}

// -------------------------------------------------------
// Main function
// -------------------------------------------------------
export async function categorizeResource(input: {
  title: string
  description: string
  type: 'video' | 'webpage'
}): Promise<ResourceMetadata> {
  const userContent = `Title: "${input.title}"\nDescription: "${input.description}"`

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: UNIVERSAL_RESOURCE_CATEGORIZER },
            { role: 'user', content: userContent }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      })

      if (!res.ok) {
        console.warn(`[CATEGORIZE] Attempt ${attempt + 1} HTTP error: ${res.status}`)
        continue
      }

      const data = await res.json()
      const parsed: ResourceMetadata = JSON.parse(data.choices[0].message.content)

      // Quick sanity checks
      if (!parsed.domain || !Array.isArray(parsed.primary_topics)) {
        console.warn(`[CATEGORIZE] Attempt ${attempt + 1} invalid structure, retrying...`)
        continue
      }

      // Ensure searchable_text is populated even if LLM forgot
      if (!parsed.searchable_text) {
        const topicTerms = parsed.primary_topics.map(t => t.term).join(' ')
        parsed.searchable_text = `${input.title} ${input.description.substring(0, 200)} ${topicTerms}`
      }

      // Clamp primary_topics to max 5
      if (parsed.primary_topics.length > 5) {
        parsed.primary_topics = parsed.primary_topics.slice(0, 5)
      }

      console.log(`[CATEGORIZE] ✅ ${input.title} → domain:${parsed.domain}, topics:${parsed.primary_topics.length}, level:${parsed.skill_level}`)
      return parsed

    } catch (err) {
      console.warn(`[CATEGORIZE] Attempt ${attempt + 1} error:`, err?.message || err)
    }
  }

  // Both attempts failed — return safe fallback
  console.error(`[CATEGORIZE ERROR] All attempts failed for "${input.title}". Using fallback.`)
  return {
    ...FALLBACK_METADATA,
    searchable_text: `${input.title} ${input.description.substring(0, 200)}`
  }
}
