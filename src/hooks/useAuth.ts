import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import type { Profile } from '@/types/database'

export const useAuth = () => {
  const {
    user,
    session,
    profile,
    isLoading,
    isInitialized,
    setUser,
    setSession,
    setProfile,
    setLoading,
    setInitialized,
    reset,
  } = useAuthStore()

  return {
    user,
    session,
    profile,
    isLoading,
    isInitialized,
    isAuthenticated: !!user,
    setProfile,
    reset,
  }
}

// App seviyesinde bir kez kullanılacak
export const useAuthListener = () => {
  const { setUser, setSession, setProfile, setLoading, setInitialized, reset } =
    useAuthStore()

  useEffect(() => {
    // Mevcut oturumu al
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          setSession(session)
          setUser(session.user)
          await fetchProfile(session.user.id)
        }
      } catch (err) {
        console.error('Auth başlatma hatası:', err)
      } finally {
        setLoading(false)
        setInitialized(true)
      }
    }

    initAuth()

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          if (event === 'SIGNED_OUT') {
            reset()
          }
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Profil yükleme hatası:', error)
      return
    }

    setProfile(data as Profile)
  }
}

// Oturumu gerektiren sayfalarda kullan
export const useRequireAuth = (redirectTo = '/giris') => {
  const { isAuthenticated, isInitialized } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthenticated, isInitialized, navigate, redirectTo])

  return { isAuthenticated, isInitialized }
}

// Giriş sayfasında (zaten giriş yaptıysa ana sayfaya yönlendir)
export const useRedirectIfAuthenticated = (redirectTo = '/ana-sayfa') => {
  const { isAuthenticated, isInitialized } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthenticated, isInitialized, navigate, redirectTo])
}

// Oturum açma işlemi hook'u
export const useSignOut = () => {
  const { reset } = useAuthStore()
  const navigate = useNavigate()

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      reset()
      navigate('/giris', { replace: true })
      toast.success('Çıkış yapıldı.')
    } catch {
      toast.error('Çıkış yapılırken bir hata oluştu.')
    }
  }

  return { signOut }
}