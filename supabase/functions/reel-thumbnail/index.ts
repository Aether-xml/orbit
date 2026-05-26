import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { thumbnail_base64, reel_id, user_id } = await req.json() as {
      thumbnail_base64: string
      reel_id: string
      user_id: string
    }

    if (!thumbnail_base64 || !reel_id || !user_id) {
      return new Response(JSON.stringify({ error: 'thumbnail_base64, reel_id ve user_id gerekli' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // base64 data URL → Uint8Array
    const base64Data = thumbnail_base64.replace(/^data:image\/\w+;base64,/, '')
    const binaryStr = atob(base64Data)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }

    const fileName = `${user_id}/${reel_id}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('reel-thumbnails')
      .upload(fileName, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('reel-thumbnails')
      .getPublicUrl(fileName)

    return new Response(JSON.stringify({ url: publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Thumbnail yüklenemedi' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
