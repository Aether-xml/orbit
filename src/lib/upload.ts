import { supabase } from '@/lib/supabase'

export async function uploadFile(bucket: string, file: File, path: string): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export function uniquePath(userId: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  return `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
}

export async function generateVideoThumbnail(videoFile: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const url = URL.createObjectURL(videoFile)

    video.src = url
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'

    video.addEventListener(
      'loadeddata',
      () => {
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8)
      },
      { once: true }
    )

    video.addEventListener('error', () => { URL.revokeObjectURL(url); resolve(null) }, { once: true })
  })
}
