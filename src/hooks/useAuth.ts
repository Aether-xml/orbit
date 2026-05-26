import { useEffect } from 'react'
import { supabase, signInWithGoogle, signOut } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import type { Profile } from '@/types/database'

export function useAuthInit() {
  const { setUser, setSession, setProfile, setLoading, setInitialized, reset } =
    useAuthStore()

  useEffect(() => {
    let mounted = true

    // ÖNEMLİ: onAuthStateChange callback'i SENKRON olmalı ve İÇİNDE BAŞKA
    // SUPABASE ÇAĞRISI YAPILMAMALI. supabase-js 2.45+ auth mutex'i tutar;
    // callback bitmeden başka call yapılırsa deadlock olur → refresh sonrası
    // tüm sorgular sonsuza dek takılır ("sayfa yüklenmiyor").
    // Çözüm: setTimeout(_, 0) ile bir sonraki tick'e ertele.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const userId = session.user.id
          setTimeout(() => {
            if (mounted) void fetchProfile(userId)
          }, 0)
        } else {
          reset()
          setInitialized(true)
        }
      }
    )

    // Fallback: auth state 15 saniye içinde gelmezse spinner'ı kaldır
    // (5sn mobile data'da yetersiz kalıyordu — kullanıcı /giris'e haksız redirect oluyordu)
    const fallback = setTimeout(() => {
      if (!mounted) return
      setLoading(false)
      setInitialized(true)
    }, 15000)

    return () => {
      mounted = false
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
