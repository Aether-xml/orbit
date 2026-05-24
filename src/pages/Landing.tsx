import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Zap, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

export const Landing = () => {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <span className="font-display text-2xl text-[var(--accent)] italic">
          Orbit 🪐
        </span>
        <div className="flex items-center gap-3">
          <Link to="/giris">
            <Button variant="ghost" size="sm">Giriş Yap</Button>
          </Link>
          <Link to="/kayit">
            <Button variant="primary" size="sm">Kayıt Ol</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-5xl md:text-7xl text-[var(--text-primary)] leading-tight mb-6">
            Algoritma yok.{' '}
            <span className="text-[var(--accent)] italic">Reklam yok.</span>
            <br />
            Sadece sen.
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-10 leading-relaxed">
            Orbit, gerçek bağlantılar kurabileceğin, içeriğin üzerinde tam
            kontrol sahibi olduğun yeni nesil sosyal medya platformu.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/kayit">
              <Button size="lg" rightIcon={<ArrowRight size={18} />}>
                Yörüngeye Gir
              </Button>
            </Link>
            <Link to="/giris">
              <Button variant="outline" size="lg">
                Giriş Yap
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Özellikler */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24"
        >
          {[
            {
              icon: Zap,
              title: 'Kronolojik Feed',
              desc: 'Takip ettiğin kişilerin içeriklerini, sıra sende olmak üzere gör. Algoritma seninle ilgilenemez.',
            },
            {
              icon: Shield,
              title: 'Gizlilik Önce',
              desc: 'Özel hesap, engelleme, susturma. Kim ne göreceğine sen karar verirsin.',
            },
            {
              icon: Users,
              title: 'Gerçek Topluluk',
              desc: 'Discord benzeri sunucular, hikayeler, reels. Her şey tek bir yerde.',
            },
          ].map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.4 + i * 0.1 }}
                className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-xl)] p-6 text-left"
              >
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center mb-4">
                  <Icon size={20} className="text-[var(--accent)]" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          © 2024 Orbit. Türkiye'den 🇹🇷 sevgiyle yapıldı.
        </p>
      </footer>
    </div>
  )
}