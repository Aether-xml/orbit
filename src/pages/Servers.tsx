import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Link2, Globe, Users, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/uiStore'
import type { Server } from '@/types/database'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'

// ── Toggle (local copy, same as Settings) ─────────────

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none',
        checked ? 'bg-accent' : 'bg-bg-overlay border border-line'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

// ── Server card ───────────────────────────────────────

function ServerCard({
  server,
  joined,
  onClick,
}: {
  server: Server
  joined: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-line hover:bg-bg-overlay transition-default text-left"
    >
      <div className="w-12 h-12 rounded-xl bg-bg-elevated flex-shrink-0 overflow-hidden flex items-center justify-center border border-line">
        {server.avatar_url ? (
          <img src={server.avatar_url} alt={server.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-text-muted font-bold text-lg">{server.name[0]?.toUpperCase()}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-primary truncate">{server.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="flex items-center gap-1 text-text-muted text-xs">
            <Users size={11} />
            {server.member_count} üye
          </span>
          {server.description && (
            <span className="text-text-muted text-xs truncate">{server.description}</span>
          )}
        </div>
      </div>
      {joined ? (
        <ChevronRight size={16} className="text-text-muted flex-shrink-0" />
      ) : (
        <span className="text-accent text-xs font-medium flex-shrink-0 px-2 py-1 rounded-full border border-accent/40">
          Katıl
        </span>
      )}
    </button>
  )
}

// ── Create server modal ───────────────────────────────

function CreateServerModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const { user } = useAuthStore()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!user?.id || !name.trim()) return
    setLoading(true)

    const { data: server, error } = await supabase
      .from('servers')
      .insert({ owner_id: user.id, name: name.trim(), description: desc.trim() || null, is_public: isPublic })
      .select()
      .single()

    if (error || !server) {
      toast.error('Sunucu oluşturulamadı')
      setLoading(false)
      return
    }

    await supabase.from('server_members').insert({ server_id: server.id, user_id: user.id, role: 'owner' })

    const { data: cat } = await supabase
      .from('server_categories')
      .insert({ server_id: server.id, name: 'Genel', position: 0 })
      .select()
      .single()

    if (cat) {
      await supabase
        .from('server_channels')
        .insert({ server_id: server.id, category_id: cat.id, name: 'genel', position: 0 })
    }

    setLoading(false)
    setName('')
    setDesc('')
    onClose()
    onCreated(server.id)
  }

  return (
    <Modal open={open} onClose={onClose} title="Sunucu Oluştur" size="sm">
      <div className="p-5 space-y-4">
        <Input
          label="Sunucu Adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Benim Sunucum"
          autoFocus
        />
        <Input
          label="Açıklama (isteğe bağlı)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Bu sunucu hakkında..."
        />
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-text-primary">Herkese Açık</p>
            <p className="text-xs text-text-muted mt-0.5">Keşfet bölümünde görünsün</p>
          </div>
          <ToggleSwitch checked={isPublic} onChange={setIsPublic} />
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            İptal
          </Button>
          <Button
            type="button"
            className="flex-1"
            loading={loading}
            onClick={() => void handleCreate()}
            disabled={!name.trim()}
          >
            Oluştur
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Join server modal ─────────────────────────────────

function JoinServerModal({
  open,
  onClose,
  onJoined,
}: {
  open: boolean
  onClose: () => void
  onJoined: (id: string) => void
}) {
  const { user } = useAuthStore()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    if (!user?.id || !code.trim()) return
    setLoading(true)

    const { data: server } = await supabase
      .from('servers')
      .select('id, name')
      .eq('invite_code', code.trim().toUpperCase())
      .single()

    if (!server) {
      toast.error('Geçersiz davet kodu')
      setLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from('server_members')
      .select('server_id')
      .eq('server_id', server.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      toast.info('Zaten bu sunucunun üyesisin')
      setLoading(false)
      onClose()
      onJoined(server.id)
      return
    }

    const { error } = await supabase
      .from('server_members')
      .insert({ server_id: server.id, user_id: user.id, role: 'member' })

    if (error) {
      toast.error('Katılım başarısız')
    } else {
      toast.success(`${server.name} sunucusuna katıldın!`)
      setCode('')
      onClose()
      onJoined(server.id)
    }
    setLoading(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Sunucuya Katıl" size="sm">
      <div className="p-5 space-y-4">
        <p className="text-text-muted text-sm">Bir davet kodu girerek sunucuya anında katılabilirsin.</p>
        <Input
          label="Davet Kodu"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCD1234"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') void handleJoin() }}
        />
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            İptal
          </Button>
          <Button
            type="button"
            className="flex-1"
            loading={loading}
            onClick={() => void handleJoin()}
            disabled={!code.trim()}
          >
            Katıl
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main component ────────────────────────────────────

export default function Servers() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  const { data: myServers = [] } = useQuery({
    queryKey: ['my-servers', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data: memberRows } = await supabase
        .from('server_members')
        .select('server_id')
        .eq('user_id', user.id)
      const ids = memberRows?.map((r) => r.server_id) ?? []
      if (!ids.length) return []
      const { data: servers } = await supabase.from('servers').select('*').in('id', ids)
      return (servers ?? []) as Server[]
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  })

  const { data: publicServers = [] } = useQuery({
    queryKey: ['public-servers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('servers')
        .select('*')
        .eq('is_public', true)
        .order('member_count', { ascending: false })
        .limit(20)
      return (data ?? []) as Server[]
    },
    staleTime: 1000 * 60 * 5,
  })

  const myServerIds = new Set(myServers.map((s) => s.id))
  const discoverServers = publicServers.filter((s) => !myServerIds.has(s.id))

  const handleJoinPublic = async (server: Server) => {
    if (!user?.id) return
    const { error } = await supabase
      .from('server_members')
      .insert({ server_id: server.id, user_id: user.id, role: 'member' })
    if (error) {
      toast.error('Katılım başarısız')
    } else {
      toast.success(`${server.name} sunucusuna katıldın!`)
      void queryClient.invalidateQueries({ queryKey: ['my-servers'] })
      navigate(`/sunucular/${server.id}`)
    }
  }

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-line px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-text-primary">Sunucular</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setJoinOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-text-secondary text-sm hover:bg-bg-overlay transition-default"
          >
            <Link2 size={14} />
            <span className="hidden sm:inline">Katıl</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-bg-base text-sm font-medium hover:bg-accent/90 transition-default"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Oluştur</span>
          </button>
        </div>
      </div>

      {/* My servers */}
      {myServers.length > 0 && (
        <section className="p-4 border-b border-line">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
            Üye Olduklarım
          </h2>
          <div className="space-y-2">
            {myServers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                joined
                onClick={() => navigate(`/sunucular/${server.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Discover */}
      {discoverServers.length > 0 && (
        <section className="p-4">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
            Keşfet
          </h2>
          <div className="space-y-2">
            {discoverServers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                joined={false}
                onClick={() => void handleJoinPublic(server)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {myServers.length === 0 && discoverServers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <Globe size={44} className="text-text-muted mb-4 opacity-60" />
          <p className="font-medium text-text-primary mb-1">Henüz sunucu yok</p>
          <p className="text-text-muted text-sm mb-6">
            Bir sunucu oluştur veya davet kodu ile katıl
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setJoinOpen(true)}>
              <Link2 size={14} className="mr-1.5" />
              Katıl
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={14} className="mr-1.5" />
              Oluştur
            </Button>
          </div>
        </div>
      )}

      <CreateServerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          void queryClient.invalidateQueries({ queryKey: ['my-servers'] })
          navigate(`/sunucular/${id}`)
        }}
      />
      <JoinServerModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={(id) => {
          void queryClient.invalidateQueries({ queryKey: ['my-servers'] })
          navigate(`/sunucular/${id}`)
        }}
      />
    </div>
  )
}
