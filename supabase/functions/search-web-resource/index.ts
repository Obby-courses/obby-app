// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // CORS handling
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  console.log("[VERSION] 2026-02-01 - WEB SEARCH (RAPIDAPI ONLY)")

  try {
    const { 
      query,
      step_title, 
      course_title
    } = await req.json()
    
    // Construct search query
    const searchQuery = query || (step_title ? `${step_title} ${course_title || ''}` : null)

    if (!searchQuery) {
      throw new Error("Missing search query or step_title")
    }

    console.log(`[TARGET] Searching web (RapidAPI) for: "${searchQuery}"`)

    const RAPID_API_KEY = Deno.env.get("RAPID_API_KEY")

    if (!RAPID_API_KEY) {
      throw new Error("RAPID_API_KEY not configured")
    }

    /* ========== RapidAPI (Real-Time Web Search) with Fallbacks ========== */
    const fetchFromRapid = async (q: string, useLocale = true) => {
      const url = new URL("https://real-time-web-search.p.rapidapi.com/search")
      url.searchParams.append("q", q)
      url.searchParams.append("num", "10")
      if (useLocale) {
        url.searchParams.append("hl", "it")
        url.searchParams.append("gl", "it")
      }
      
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPID_API_KEY,
          'x-rapidapi-host': 'real-time-web-search.p.rapidapi.com'
        }
      })
      return await res.json()
    }

    let rapidData = await fetchFromRapid(searchQuery, true)
    
    // FALLBACK 1: Se 0 risultati, prova ricerca globale (senza it/it)
    const hasResults = (d: any) => {
      if (!d || d.status !== "OK" || !d.data) return false
      const results = Array.isArray(d.data) ? d.data : d.data.organic_results
      return Array.isArray(results) && results.length > 0
    }

    if (!hasResults(rapidData)) {
      console.log("⚠️ Zero risultati (Italia). Provo ricerca globale...")
      rapidData = await fetchFromRapid(searchQuery, false)
    }

    // FALLBACK 2: Se ancora 0, semplifica la query (prime 4 parole)
    if (!hasResults(rapidData)) {
      const simpleQuery = searchQuery.split(' ').slice(0, 4).join(' ')
      console.log(`⚠️ Ancora 0 risultati. Provo query semplificata: "${simpleQuery}"`)
      rapidData = await fetchFromRapid(simpleQuery, false)
    }

    if (rapidData.status === "ERROR") {
      throw new Error(`RapidAPI Error: ${rapidData.error?.message || "Unknown error"}`)
    }

    let rawResults = []
    if (Array.isArray(rapidData.data)) {
      rawResults = rapidData.data
    } else if (rapidData.data && Array.isArray(rapidData.data.organic_results)) {
      rawResults = rapidData.data.organic_results
    }

    const results = rawResults.map((item: any) => ({
      title: item.title,
      link: item.url || item.link,
      snippet: item.snippet || item.description,
      source: item.source || item.displayed_link || "Web",
      thumbnail_url: item.thumbnail || null,
      type: 'webpage'
    }))

    console.log(`✅ Web search: ${results.length} results extracted.`)

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err) {
    console.error(`[ERROR] ${err.message}`)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: corsHeaders
    })
  }
})
