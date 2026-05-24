import { formatDistanceToNow, format } from 'date-fns'
import { tr } from 'date-fns/locale'

// Tarih formatlama
export const timeAgo = (dateStr: string): string => {
  return formatDistanceToNow(new Date(dateStr), {
    addSuffix: true,
    locale: tr,
  })
}

export const formatDate = (dateStr: string): string => {
  return format(new Date(dateStr), 'd MMMM yyyy', { locale: tr })
}

export const formatDateTime = (dateStr: string): string => {
  return format(new Date(dateStr), 'd MMM yyyy, HH:mm', { locale: tr })
}

// Sayı formatlama (1200 → 1,2B)
export const formatCount = (count: number): string => {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}B`
  }
  return count.toString()
}

// Kullanıcı adı validasyonu
export const isValidUsername = (username: string): boolean => {
  return /^[a-z0-9_]{3,30}$/.test(username)
}

// URL validasyonu
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Hashtag parse
export const parseHashtags = (text: string): string[] => {
  const matches = text.match(/#[\wğüşıöçĞÜŞİÖÇ]+/gi)
  return matches ? matches.map((h) => h.slice(1).toLowerCase()) : []
}

// Mention parse
export const parseMentions = (text: string): string[] => {
  const matches = text.match(/@[\w]+/g)
  return matches ? matches.map((m) => m.slice(1).toLowerCase()) : []
}

// CSS değişkeninden renk alma
export const getCssVar = (name: string): string => {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

// Dosya boyutu formatlama
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Unique ID
export const generateId = (): string => {
  return crypto.randomUUID()
}

// Debounce
export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// DB trigger hata mesajlarını Türkçe göster
export const parseDbError = (message: string): string => {
  if (message.includes('Karakter limiti')) return message
  if (message.includes('Sunucu oluşturma limitine')) return message
  if (message.includes('Kayıt limitine')) return message
  if (message.includes('unique constraint')) return 'Bu kayıt zaten mevcut.'
  if (message.includes('foreign key')) return 'İlgili kayıt bulunamadı.'
  if (message.includes('not-null')) return 'Zorunlu alan boş bırakılamaz.'
  return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'
}

// Sınıf birleştirme (Tailwind ile)
export const cn = (...classes: (string | undefined | false | null)[]): string => {
  return classes.filter(Boolean).join(' ')
}