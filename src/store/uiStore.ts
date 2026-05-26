import { create } from 'zustand'

type Toast = {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

type UiState = {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// Kısa yardımcılar
export const toast = {
  success: (message: string) =>
    useUiStore.getState().addToast({ type: 'success', message }),
  error: (message: string) =>
    useUiStore.getState().addToast({ type: 'error', message }),
  warning: (message: string) =>
    useUiStore.getState().addToast({ type: 'warning', message }),
  info: (message: string) =>
    useUiStore.getState().addToast({ type: 'info', message }),
}
