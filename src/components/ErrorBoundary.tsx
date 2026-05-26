import { Component, type ReactNode, type ErrorInfo } from 'react'

type State = { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Orbit crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message ?? 'Bilinmeyen hata'
      return (
        <div className="min-h-dvh bg-bg-base flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-error/10 border border-error/30 flex items-center justify-center text-error text-2xl">!</div>
          <h1 className="text-text-primary text-xl font-semibold">Bir şey ters gitti</h1>
          <p className="text-text-muted text-sm max-w-xs">
            Uygulamada beklenmedik bir hata oluştu. Sayfayı yenile, sorun sürerse birkaç dakika sonra tekrar dene.
          </p>
          <pre className="text-text-muted text-[10px] max-w-xs overflow-hidden whitespace-pre-wrap opacity-50">{message}</pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 px-5 py-2.5 rounded-lg bg-accent text-bg-base font-semibold text-sm"
          >
            Sayfayı yenile
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
