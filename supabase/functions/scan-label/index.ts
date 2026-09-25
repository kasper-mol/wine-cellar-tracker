import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const MODEL = 'claude-haiku-4-5-20251001'
const DAILY_SCAN_LIMIT = 100

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You read wine bottle labels from a photo and extract structured data.

Respond with ONLY a single JSON object, no markdown fences, no commentary before or after it, matching exactly this shape:
{
  "producer": string | null,
  "name": string | null,
  "vintage": number | null,
  "appellationText": string | null,
  "grapesText": string[],
  "styleGuess": "red" | "white" | "rosé" | "sparkling" | "dessert" | null,
  "producerLink": string | null
}

Rules:
- Use what's printed on the label. Where the label doesn't print the grape(s) but the appellation conventionally implies them (e.g. Chablis implies Chardonnay), you may fill grapesText from that general knowledge.
- For producerLink: you may use the web_search tool, at most once, to try to find this specific wine's page on the producer's own official website. Only return a URL you're reasonably confident is correct and on the producer's own domain (not a retailer or Vivino). If unsure or nothing findable, return null. Never fabricate a URL.
- Output nothing but the JSON object as your final message — no other text.`

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return json({ error: 'Not authenticated' }, 401)

    const today = new Date().toISOString().slice(0, 10)
    const { data: usageRow } = await supabase
      .from('scan_usage')
      .select('count')
      .eq('user_id', user.id)
      .eq('day', today)
      .maybeSingle()

    const usedToday = usageRow?.count ?? 0
    if (usedToday >= DAILY_SCAN_LIMIT) {
      return json({ error: 'Daily scan limit reached — try again tomorrow.' }, 429)
    }

    const { image, mediaType } = await req.json()
    if (!image) return json({ error: 'Missing image' }, 400)

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 1 }],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image },
              },
              {
                type: 'text',
                text: 'Extract this wine label. Respond with only the JSON object described in the system prompt.',
              },
            ],
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      return json({ error: `Anthropic API error: ${errText}` }, 502)
    }

    const result = await anthropicRes.json()
    const textBlocks = (result.content ?? []).filter(
      (block: { type: string }) => block.type === 'text',
    )
    const finalText = textBlocks[textBlocks.length - 1]?.text ?? ''
    const jsonMatch = finalText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return json({ error: 'Model did not return usable JSON' }, 502)

    const parsed = JSON.parse(jsonMatch[0])

    await supabase
      .from('scan_usage')
      .upsert({ user_id: user.id, day: today, count: usedToday + 1 }, { onConflict: 'user_id,day' })

    return json(parsed, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})
