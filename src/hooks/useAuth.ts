import { useEffect } from 'react'
import { supabase, signInWithGoogle, signOut } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import type { Profile } from '@/types/database'

export function useAuthInit() {
  const { setUser, setSession, setProfile, setLoading, setInitialized, reset } =
    useAuthStore()

  useEffect(() => {
    // onAuthStateChange INITIAL_SESSION eventi mount'ta hemen tetiklenir —
    // getSession + onAuthStateChange çift çağrısı race condition yaratıyor, sadece biri yeterli
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          reset()
          setInitialized(true)
        }
      }
    )

    // Fallback: auth state 5 saniye içinde gelmezse spinner'ı kaldır
    const fallback = setTimeout(() => {
      setLoading(false)
      setInitialized(true)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallback)
    }
  }, [])

  async function fetchProfile(userId: string) {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      // Profil henüz oluşturulmadıysa (trigger gecikmesi) kısa bekle, bir kez daha dene
      if (error.code === 'PGRST116') {
        await new Promise((r) => setTimeout(r, 800))
        const { data: retry } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        if (retry) setProfile(retry as Profile)
      } else {
        toast.error('Profil yüklenemedi.')
      }
    } else {
      setProfile(data as Profile)
    }
    setLoading(false)
    setInitialized(true)
  }
}

export function useAuth() {
  const { user, session, profile, isLoading } = useAuthStore()

  const logout = async () => {
    const { error } = await signOut()
    if (error) toast.error('Çıkış yapılamadı.')
  }

  const loginWithGoogle = async () => {
    const { error } = await signInWithGoogle()
    if (error) toast.error('Google ile giriş başarısız.')
  }

  return {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated: !!user,
    logout,
    loginWithGoogle,
  }
}
