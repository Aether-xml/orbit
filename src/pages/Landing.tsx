import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Zap, Shield, Users } from 'lucide-react'

const features = [
  { icon: Zap,    text: 'Algoritma yok — sıralama sana ait' },
  { icon: Shield, text: 'Reklam yok — dikkatini satmıyoruz' },
  { icon: Users,  text: 'Gerçek bağlantılar — filtre kabarcığı yok' },
]

export default function Landing() {
  return (
    <div className="min-h-dvh bg-bg-base flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-10 bg-bg-base border-b border-line">
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <span className="font-display text-2xl text-text-primary">Orbit</span>
          <div className="flex items-center gap-3">
            <Link
              to="/giris"
              className="text-text-secondary hover:text-text-primary transition-default text-sm font-medium"
            >
              Giriş Yap
            </Link>
            <Link
              to="/kayit"
              className="bg-accent hover:bg-accent-hover text-text-inverse text-sm font-semibold px-4 py-2 rounded-full transition-default"
            >
              Kayıt Ol
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">

          {/* Sol — metin */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-accent-muted border border-accent-border rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="text-accent text-xs font-medium">Şu an beta'da</span>
              </div>

              <h1 className="font-display text-5xl lg:text-6xl text-text-primary leading-tight">
                Sosyal medya,
                <br />
                <span className="text-accent">senin gibi</span>
                <br />
                düşünülmüş.
              </h1>

              <p className="text-text-secondary text-lg leading-relaxed max-w-md">
                Algoritma yok. Reklam yok. Sadece sen, ve gerçekten takip etmek
                istediğin insanlar.
              </p>
            </div>

            {/* Özellikler */}
            <ul className="space-y-3">
              {features.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-text-secondary">
                  <span className="w-8 h-8 rounded-md bg-accent-muted border border-accent-border flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-accent" />
                  </span>
                  <span className="text-sm">{text}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <Link
                to="/kayit"
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-text-inverse font-semibold px-6 py-3 rounded-full transition-default"
              >
                Ücretsiz Başla
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/giris"
                className="text-text-secondary hover:text-text-primary text-sm transition-default"
              >
                Zaten hesabım var
              </Link>
            </div>
          </motion.div>

          {/* Sağ — illüstrasyon */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            className="hidden lg:flex items-center justify-center"
          >
            <img
              src="/landing-hero.png"
              alt=""
              className="w-full max-w-md select-none"
              draggable={false}
            />
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-line py-6 px-6">
        <p className="text-text-muted text-sm text-center">
          © 2026 Orbit. Tüm hakları saklıdır.
        </p>
      </footer>
    </div>
  )
}

