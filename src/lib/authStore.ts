import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Role = "superadmin" | "sales_manager" | "hr_manager" | "inventory_admin" | "finance_manager" | "hkc_docs_manager"

export interface User {
  id: string
  username: string
  roles: Role[]
  fullname: string
  warehouse_ids: string[]
}

interface AuthState {
  user: User | null
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null as User | null,
      token: null as string | null,
      login: (user: User, token: string) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      isAuthenticated: () => !!get().token,
    }),
    {
      name: "auth-storage",
    }
  )
)
