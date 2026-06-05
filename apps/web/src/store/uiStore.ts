import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  chatOpen: boolean
  membersOpen: boolean
  settingsOpen: boolean
  activeModal: string | null
  theme: string
  notifications: Array<{
    id: string
    type: 'success' | 'error' | 'info' | 'warning'
    message: string
  }>

  toggleSidebar: () => void
  toggleChat: () => void
  toggleMembers: () => void
  openModal: (modal: string) => void
  closeModal: () => void
  setTheme: (theme: string) => void
  addNotification: (notif: Omit<UIState['notifications'][0], 'id'>) => void
  removeNotification: (id: string) => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  chatOpen: true,
  membersOpen: true,
  settingsOpen: false,
  activeModal: null,
  theme: 'cyberpunk',
  notifications: [],
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  toggleMembers: () => set((s) => ({ membersOpen: !s.membersOpen })),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  setTheme: (theme) => set({ theme }),
  addNotification: (notif) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ notifications: [...s.notifications, { ...notif, id }] }))
    setTimeout(
      () => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
      4000
    )
  },
  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}))
