import { useEffect } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuthStore } from "@/lib/authStore"
import type { Role } from "@/lib/authStore"
import { erpStore } from "@/lib/erpStore"
import { financeStore } from "@/lib/financeStore"
import { hrStore } from "@/lib/hrStore"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Role[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    if (isAuthenticated()) {
      void erpStore.reloadFromApi()
      void financeStore.reloadFromApi()
      void hrStore.reloadFromApi()
    }
  }, [isAuthenticated])

  if (!isAuthenticated() || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const userRoles = user.roles || ((user as any).role ? [(user as any).role] : [])

  // Superadmin has access to everything
  if (userRoles.includes("superadmin")) {
    return <>{children}</>
  }

  if (allowedRoles && !allowedRoles.some(r => userRoles.includes(r))) {
    // Redirect them to their home based on role if they try to access unauthorized page
    let homeRoute = "/"
    const firstRole = userRoles[0]
    switch (firstRole) {
      case "sales_manager":
        homeRoute = "/sales"
        break
      case "hr_manager":
        homeRoute = "/hr"
        break
      case "inventory_admin":
        homeRoute = "/inventory"
        break
      case "finance_manager":
        homeRoute = "/finance"
        break
      case "hkc_docs_manager":
        homeRoute = "/sales/hkc-docs"
        break
    }
    return <Navigate to={homeRoute} replace />
  }

  return <>{children}</>
}
