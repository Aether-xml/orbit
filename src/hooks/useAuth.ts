import { useEffect } from 'react'
import { supabase, signInWithGoogle, signOut } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import type { Profile } from '@/types/database'

export function useAuthInit() {
  const { setUser, setSession, setProfile, setLoading, setInitialized, reset } =
    useAuthStore()

  useEffect(() => {
    // Mevcut oturumu al
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
        setInitialized(true)
      }
    })

    // Auth değişikliklerini dinle
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

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      toast.error('Profil yüklenemedi.')
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
