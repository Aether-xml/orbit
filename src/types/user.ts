// ── Rozet Tanımları ───────────────────────────────────────
export const BADGES = {
  'nova-plus': {
    label: 'Nova+ Üyesi',
    color: '#E8C547',
    icon: '⭐',
  },
  'early-adopter': {
    label: 'Erken Kullanıcı',
    color: '#4CAF82',
    icon: '🌱',
  },
  founder: {
    label: 'Kurucu',
    color: '#E05A5A',
    icon: '🔥',
  },
  verified: {
    label: 'Doğrulanmış',
    color: '#5A9FE0',
    icon: '✓',
  },
} as const

export type BadgeKey = keyof typeof BADGES

export interface Badge {
  label: string
  color: string
  icon: string
}

// ── Nova+ Özellik Limitleri ───────────────────────────────
export const NOVA_LIMITS = {
  POST_CHAR_LIMIT: {
    free: 280,
    nova: 500,
  },
  REEL_DURATION: {
    free: 60,   // saniye
    nova: 180,  // saniye
  },
  MEDIA_PER_POST: {
    free: 4,
    nova: 10,
  },
  BOOKMARK_LIMIT: {
    free: 500,
    nova: Infinity,
  },
  SERVER_LIMIT: {
    free: 3,
    nova: 10,
  },
} as const

// ── Kullanıcı Tercihleri ──────────────────────────────────
export interface UserPreferences {
  theme: 'dark'
  language: 'tr'
  notificationsEnabled: boolean
  emailNotifications: boolean
  showOnlineStatus: boolean
  allowDMsFrom: 'everyone' | 'following' | 'nobody'
}