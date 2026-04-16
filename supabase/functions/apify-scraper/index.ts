// supabase/functions/apify-scraper/index.ts
// Deno Edge Function — runs Apify Google Maps Extractor and returns clean B2B leads.
// Uses async polling instead of synchronous blocking to avoid Supabase's 60s timeout.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ACTOR_ID = 'compass~google-maps-extractor';
const POLL_INTERVAL_MS = 3000; // Check every 3 seconds
const MAX_WAIT_MS = 55000;     // Give up after 55s (just under Supabase 60s limit)

interface ApifyPlace {
  title?: string;
  name?: string;
  website?: string;
  phone?: string;
  phoneUnformatted?: string;
  address?: string;
}

interface CleanLead {
  name: string;
  website: string;
  phone: string;
  location: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // --- 1. Parse incoming request ---
    const { searchQuery } = await req.json();

    if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim() === '') {
      return new Response(JSON.stringify({ error: 'searchQuery is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- 2. Retrieve API token securely from Supabase secrets ---
    const APIFY_API_TOKEN = Deno.env.get('APIFY_API_TOKEN');
    if (!APIFY_API_TOKEN) {
      throw new Error('APIFY_API_TOKEN secret is not configured in Supabase.');
    }

    const BASE = `https://api.apify.com/v2`;

    // --- 3. START the actor run (non-blocking) ---
    const startRes = await fetch(`${BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_API_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchStringsArray: [searchQuery.trim()],
        maxCrawledPlacesPerSearch: 5,
        maxImages: 0,
        maxReviews: 0,
        exportPlaceUrls: false,
        includeHistogram: false,
        includeOpeningHours: false,
        includePeopleAlsoSearch: false,
        language: 'en',
      }),
    });

    if (!startRes.ok) {
      const errText = await startRes.text();
      console.error(`Apify start error ${startRes.status}:`, errText);
      throw new Error(`Failed to start Apify actor: ${startRes.status} - ${errText}`);
    }

    const startData = await startRes.json();
    const runId = startData?.data?.id;
    const datasetId = startData?.data?.defaultDatasetId;

    if (!runId) {
      throw new Error('Apify did not return a run ID.');
    }

    console.log(`[apify-scraper] Run started: ${runId}`);

    // --- 4. POLL until the run finishes or we hit the timeout ---
    const deadline = Date.now() + MAX_WAIT_MS;
    let status = 'RUNNING';

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);

      const statusRes = await fetch(`${BASE}/actor-runs/${runId}?token=${APIFY_API_TOKEN}`);
      if (!statusRes.ok) {
        console.warn(`Poll error ${statusRes.status}, retrying...`);
        continue;
      }

      const statusData = await statusRes.json();
      status = statusData?.data?.status ?? 'UNKNOWN';
      console.log(`[apify-scraper] Run ${runId} status: ${status}`);

      if (status === 'SUCCEEDED') break;
      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        throw new Error(`Apify actor run ${status.toLowerCase()}.`);
      }
    }

    if (status !== 'SUCCEEDED') {
      throw new Error('Search timed out — Apify actor did not finish in time. Please try again.');
    }

    // --- 5. FETCH dataset results ---
    const dataRes = await fetch(
      `${BASE}/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}&limit=5&format=json`
    );

    if (!dataRes.ok) {
      throw new Error(`Failed to fetch Apify results: ${dataRes.status}`);
    }

    const rawData: ApifyPlace[] = await dataRes.json();

    // --- 6. Clean and normalize the response ---
    const leads: CleanLead[] = rawData.slice(0, 5).map((place) => ({
      name: place.title || place.name || 'Unknown Business',
      website: place.website || '',
      phone: place.phone || place.phoneUnformatted || '',
      location: place.address || 'Location unavailable',
    }));

    // --- 7. Return success ---
    return new Response(JSON.stringify({ leads }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred.';
    console.error('[apify-scraper] Error:', message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
