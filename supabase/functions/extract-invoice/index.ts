// Supabase Edge Function: extract-invoice
//
// Receives a signed URL to a photographed invoice/receipt, sends it to
// Claude's vision API, and returns structured JSON (vendor, date, total,
// line items). The Anthropic API key lives only here as a server-side
// secret — it is never exposed to the browser.
//
// Deploy:
//   supabase functions deploy extract-invoice
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Local test:
//   supabase functions serve extract-invoice

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")

const EXTRACTION_PROMPT = `You are reading a photo of a store receipt or invoice for a home-building
company's cost tracking system. Look at the image and return ONLY a JSON object,
no other text, no markdown fences, in exactly this shape:

{
  "vendor": "string or null",
  "date": "YYYY-MM-DD or null",
  "total": number or null,
  "line_items": [
    { "description": "string", "quantity": number or null, "unit_cost": number or null }
  ]
}

If a field is illegible or absent, use null. Do not guess numbers you cannot read clearly.`

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { imageUrl } = await req.json()
    if (!imageUrl) throw new Error("imageUrl is required")

    // fetch the image bytes and base64-encode for the vision API
    const imgResp = await fetch(imageUrl)
    const contentType = imgResp.headers.get("content-type") || "image/jpeg"
    const bytes = new Uint8Array(await imgResp.arrayBuffer())
    let binary = ""
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)

    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: contentType, data: base64 } },
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          },
        ],
      }),
    })

    if (!claudeResp.ok) throw new Error(`Claude API error: ${await claudeResp.text()}`)
    const data = await claudeResp.json()
    const text = data.content.find((b: any) => b.type === "text")?.text ?? "{}"
    const cleaned = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(cleaned)

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    })
  }
})
