# Directive: Deploy & Configure the `apify-scraper` Edge Function

## Goal
Deploy the Apify Google Maps scraper Edge Function to the project's Supabase instance and configure the required API token secret.

## Prerequisites
- Supabase CLI installed (`npm install supabase --save-dev` or globally)
- Logged in: `supabase login`
- Project linked: `supabase link --project-ref cdimbdksllhpwwyzlbuf`

## Steps

### 1. Get Your Apify API Token
1. Sign up / log in at https://console.apify.com
2. Go to **Settings → Integrations → API tokens**
3. Copy your **Personal API Token**

### 2. Set the Secret in Supabase
```bash
supabase secrets set APIFY_API_TOKEN=<your-apify-token> --project-ref cdimbdksllhpwwyzlbuf
```
Verify it was set:
```bash
supabase secrets list --project-ref cdimbdksllhpwwyzlbuf
```

### 3. Deploy the Edge Function
From the project root (`CRM_QPLAY/`):
```bash
supabase functions deploy apify-scraper --project-ref cdimbdksllhpwwyzlbuf
```

### 4. Test the Function
```bash
curl -X POST https://cdimbdksllhpwwyzlbuf.supabase.co/functions/v1/apify-scraper \
  -H "Authorization: Bearer <VITE_SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"searchQuery":"dental clinics in Doha"}'
```
Expected response:
```json
{
  "leads": [
    { "name": "...", "website": "...", "phone": "...", "location": "..." },
    ...
  ]
}
```

## Cost Control
- The function passes `maxCrawledPlacesPerSearch: 5` to Apify — this keeps usage firmly within free tier limits.
- Apify free tier: $5 of free credits/month. Each Google Maps scrape of 5 places costs ~$0.003.

## Actor Details
- **Actor:** `compass/google-maps-scraper` (lightweight, community actor)
- **Endpoint:** `/run-sync-get-dataset-items` — synchronous call, waits up to 60s for results

## Troubleshooting
- **"APIFY_API_TOKEN secret is not configured"** → Run step 2 above.
- **Apify 401 error** → Token is invalid or expired. Regenerate at console.apify.com.
- **Empty results array** → The search query returned no places. Try a more specific query.
- **Timeout** → The actor took >60s. Retry or reduce search scope.
- **CORS errors in browser** → Ensure `verify_jwt = false` is set in `supabase/config.toml` and function is redeployed.
