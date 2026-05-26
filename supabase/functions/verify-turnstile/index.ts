import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const { token } = await req.json() as { token?: string }

  if (!token) {
    return new Response(
      JSON.stringify({ success: false, error: 'Token eksik' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) {
    return new Response(
      JSON.stringify({ success: false, error: 'Sunucu yapılandırma hatası' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const body = new URLSearchParams({ secret, response: token })
  const cfRes = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const { success } = await cfRes.json() as { success: boolean }

  return new Response(
    JSON.stringify({ success }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
