import { create } from 'zustand'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface Modal {
  id: string
  component: React.ReactNode
}

interface UiState {
  toasts: Toast[]
  modals: Modal[]
  isMobileSidebarOpen: boolean
  activeTheme: 'dark'

  addToast: (message: string, type: ToastType, duration?: number) => void
  removeToast: (id: string) => void
  pushModal: (modal: Modal) => void
  popModal: () => void
  closeModal: (id: string) => void
  setMobileSidebarOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  modals: [],
  isMobileSidebarOpen: false,
  activeTheme: 'dark',

  addToast: (message, type, duration = 4000) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: crypto.randomUUID(), message, type, duration },
      ],
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  pushModal: (modal) =>
    set((state) => ({
      modals: [...state.modals, modal],
    })),

  popModal: () =>
    set((state) => ({
      modals: state.modals.slice(0, -1),
    })),

  closeModal: (id) =>
    set((state) => ({
      modals: state.modals.filter((m) => m.id !== id),
    })),

  setMobileSidebarOpen: (open) =>
    set({ isMobileSidebarOpen: open }),
}))

// Kolaylık için toast helper'ları
export const toast = {
  success: (message: string) =>
    useUiStore.getState().addToast(message, 'success'),
  error: (message: string) =>
    useUiStore.getState().addToast(message, 'error'),
  warning: (message: string) =>
    useUiStore.getState().addToast(message, 'warning'),
  info: (message: string) =>
    useUiStore.getState().addToast(message, 'info'),
}