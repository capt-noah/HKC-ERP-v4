import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuthStore } from "@/lib/authStore"
import { API_BASE } from "@/lib/apiPersistence"
import { useFeedback } from "@/context/FeedbackContext"
import { KeyRound, User, Loader2, Eye, EyeOff } from "lucide-react"

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { showToast } = useFeedback()
  const login = useAuthStore((state: any) => state.login)
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || "/"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Invalid username or password")
      }

      login(data.user, data.token)
      showToast("Login Successful", "success", `Welcome back, ${data.user.name || data.user.username}!`)
      
      const userRoles = data.user.roles || (data.user.role ? [data.user.role] : [])
      const primaryRole = userRoles[0]
      if (from === "/" || from === "/login") {
        switch (primaryRole) {
          case "sales_manager":
            navigate("/sales")
            break
          case "hr_manager":
            navigate("/hr")
            break
          case "inventory_admin":
            navigate("/inventory")
            break
          case "finance_manager":
            navigate("/finance")
            break
          case "hkc_docs_manager":
            navigate("/sales/hkc-docs")
            break
          case "superadmin":
            navigate("/admin")
            break
          default:
            navigate("/")
        }
      } else {
        navigate(from, { replace: true })
      }
    } catch (error: any) {
      showToast("Authentication Failed", "warning", error.message || "Invalid username or password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen page-gradient p-4 relative overflow-hidden">
      {/* Decorative organic blur blobs to enhance the liquid glass aesthetic */}
      <div className="absolute top-1/4 left-1/4 size-72 rounded-full bg-green-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 size-96 rounded-full bg-emerald-100/50 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md p-8 space-y-8 glass-card border border-white/60 shadow-xl relative z-10">
        <div className="text-center">
          <div className="flex items-center justify-center mb-3">
            <img
              src="/hkc_logo.png"
              alt="HKC Trading Logo"
              className="h-16 w-auto object-contain"
            />
          </div>
          <h2 className="text-3xl font-extrabold text-black tracking-tight">HKC Trading</h2>
          <p className="mt-2 text-sm font-semibold text-zinc-500">Sign in to your dashboard</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="w-full bg-black/[0.02] border border-black/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-semibold text-black outline-none focus:border-green-750 focus:bg-white transition-colors placeholder-zinc-400"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full bg-black/[0.02] border border-black/10 rounded-2xl pl-12 pr-12 py-3.5 text-sm font-semibold text-black outline-none focus:border-green-750 focus:bg-white transition-colors placeholder-zinc-400"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-650 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-700 transition-all active:scale-95 shadow-md disabled:opacity-70 disabled:scale-100"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
