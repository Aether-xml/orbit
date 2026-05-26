import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: tr })
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'B'
  return String(n)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

const AVATAR_PALETTE = [
  '#5C6BC0', // indigo
  '#7C3AED', // violet
  '#0891B2', // cyan
  '#059669', // emerald
  '#D97706', // amber
  '#DB2777', // pink
  '#2563EB', // blue
  '#9333EA', // purple
  '#16A34A', // green
  '#0F766E', // teal
  '#C2410C', // orange
  '#7C2D12', // brown
]

export function getAvatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i)
    h |= 0
  }
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length] ?? '#5C6BC0'
}

