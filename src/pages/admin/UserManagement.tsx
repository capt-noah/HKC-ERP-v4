import { useState } from "react"
import { motion } from "framer-motion"
import { Search, Plus, Filter, X, ShieldCheck, UserCheck, Trash2, Mail, Users, UserX } from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { cn } from "@/lib/utils"
import { useFeedback } from "@/context/FeedbackContext"

export interface UserAccount {
  id: string
  name: string
  email: string
  department: string
  role: "Admin" | "HR Manager" | "Finance Auditor" | "Staff"
  lastLogin: string
  status: "Active" | "Suspended" | "Invited"
  avatarBg: string
  initials: string
}

const initialUsers: UserAccount[] = []

const fade = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

const avatarBgPresets = [
  "bg-pink-100 text-pink-700 border border-pink-200",
  "bg-purple-100 text-purple-700 border border-purple-200",
  "bg-green-100 text-green-700 border border-green-200",
  "bg-emerald-100 text-emerald-700 border border-emerald-200",
  "bg-sky-100 text-sky-700 border border-sky-200",
  "bg-rose-100 text-rose-700 border border-rose-200",
  "bg-blue-100 text-blue-700 border border-blue-200",
  "bg-indigo-100 text-indigo-700 border border-indigo-200"
]

export default function UserManagement() {
  const [users, setUsers] = useState<UserAccount[]>(initialUsers)
  const { showToast, confirm } = useFeedback()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRole, setSelectedRole] = useState("All")
  const [selectedStatus, setSelectedStatus] = useState("All")
  const [showAddModal, setShowAddModal] = useState(false)

  // New user form state
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    department: "Tech",
    role: "Staff" as UserAccount["role"],
    status: "Active" as UserAccount["status"]
  })

  const roles = ["All", "Admin", "HR Manager", "Finance Auditor", "Staff"]
  const statuses = ["All", "Active", "Suspended", "Invited"]

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUser.name || !newUser.email) return

    const randomPreset = avatarBgPresets[Math.floor(Math.random() * avatarBgPresets.length)]
    const initials = newUser.name
      .split(" ")
      .map(part => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()

    const createdUser: UserAccount = {
      id: `USR-0${users.length + 1}`,
      name: newUser.name,
      email: newUser.email,
      department: newUser.department,
      role: newUser.role,
      lastLogin: newUser.status === "Active" ? "Active Now" : "Pending Invitation",
      status: newUser.status,
      avatarBg: randomPreset,
      initials: initials || "U"
    }

    setUsers([...users, createdUser])
    setNewUser({
      name: "",
      email: "",
      department: "Tech",
      role: "Staff",
      status: "Active"
    })
    setShowAddModal(false)
    showToast(
      "User Onboarded Successfully",
      "success",
      `${createdUser.name} has been configured with ${createdUser.role} clearance.`
    )
  }

  const handleDeleteUser = (id: string) => {
    const targetUser = users.find(u => u.id === id)
    if (!targetUser) return

    confirm({
      title: "Confirm Privilege Revocation",
      message: `Are you absolutely sure you want to permanently delete ${targetUser.name}'s system user profile and access credentials?`,
      confirmLabel: "Revoke Access",
      cancelLabel: "Cancel",
      isDestructive: true,
      onConfirm: () => {
        setUsers(users.filter(u => u.id !== id))
        showToast(
          "Access Privileges Revoked",
          "warning",
          `System credentials for ${targetUser.name} were deleted successfully.`
        )
      }
    })
  }

  const handleToggleStatus = (id: string) => {
    const targetUser = users.find(u => u.id === id)
    if (!targetUser) return

    const nextStatus: UserAccount["status"] = targetUser.status === "Active" ? "Suspended" : "Active"

    confirm({
      title: nextStatus === "Suspended" ? "Suspend System User" : "Activate System User",
      message: `Do you want to ${nextStatus === "Suspended" ? "temporarily suspend" : "reactivate"} system access privileges for ${targetUser.name}?`,
      confirmLabel: nextStatus === "Suspended" ? "Suspend Account" : "Activate Account",
      isDestructive: nextStatus === "Suspended",
      onConfirm: () => {
        setUsers(
          users.map(u => {
            if (u.id === id) {
              return {
                ...u,
                status: nextStatus,
                lastLogin: nextStatus === "Active" ? "Active Now" : "Suspended"
              }
            }
            return u
          })
        )
        showToast(
          `Account ${nextStatus === "Active" ? "Reactivated" : "Suspended"}`,
          nextStatus === "Active" ? "success" : "warning",
          `${targetUser.name}'s account status has been updated to ${nextStatus}.`
        )
      }
    })
  }

  const handleRoleChange = (id: string, newRole: UserAccount["role"]) => {
    const targetUser = users.find(u => u.id === id)
    if (!targetUser) return

    setUsers(
      users.map(u => {
        if (u.id === id) {
          return { ...u, role: newRole }
        }
        return u
      })
    )
    showToast(
      "Clearance Level Updated",
      "info",
      `Assigned ${targetUser.name} with ${newRole} system authority.`
    )
  }

  // Filters calculation
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = selectedRole === "All" || user.role === selectedRole
    const matchesStatus = selectedStatus === "All" || user.status === selectedStatus

    return matchesSearch && matchesRole && matchesStatus
  })

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 pt-24 pb-12">
        {/* Header Block */}
        <motion.div variants={fade} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">User Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage user accounts and authorization access levels.</p>
          </div>

          {/* Right: Sub-navigation options */}
          <div className="shrink-0">
            <SubPageNav items={getSectionChildren("/admin")} />
          </div>
        </motion.div>

        {/* Controls Row: Search, Filter, and Add Button */}
        <motion.div variants={fade} className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mb-6">
          {/* Search */}
          <div className="relative flex items-center h-[38px] px-3.5 rounded-full glass-nav hover:bg-white/50 focus-within:bg-white/80 focus-within:border-black/20 focus-within:ring-1 focus-within:ring-black/5 transition-all w-full sm:w-48 shrink-0">
            <Search className="size-3.5 text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="bg-transparent border-none text-xs font-semibold text-black outline-none w-full"
            />
          </div>

          {/* Role Filter */}
          <div className="relative flex items-center h-[38px] px-3.5 rounded-full glass-nav hover:bg-white/50 transition-all shrink-0">
            <ShieldCheck className="size-3.5 text-gray-400 mr-2 shrink-0" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-black outline-none pr-4 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:8px_auto] bg-[right_center] bg-no-repeat"
            >
              {roles.map(r => (
                <option key={r} value={r} className="bg-white text-black text-xs font-semibold">Role: {r}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative flex items-center h-[38px] px-3.5 rounded-full glass-nav hover:bg-white/50 transition-all shrink-0">
            <Filter className="size-3.5 text-gray-400 mr-2 shrink-0" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-black outline-none pr-4 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:8px_auto] bg-[right_center] bg-no-repeat"
            >
              {statuses.map(s => (
                <option key={s} value={s} className="bg-white text-black text-xs font-semibold">Status: {s}</option>
              ))}
            </select>
          </div>

          {/* Action Button: Add User */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-black hover:bg-zinc-800 text-white rounded-full h-[38px] px-4 text-xs font-bold shadow-sm transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="size-3.5" />
            <span>Add User</span>
          </button>
        </motion.div>

        {/* User Accounts Grid/Table */}
        <motion.div variants={fade}>
          <GlassCard>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/5 text-xs text-gray-400 font-bold uppercase tracking-wider">
                    <th className="py-4 px-4">User</th>
                    <th className="py-4 px-4">Department</th>
                    <th className="py-4 px-4">Access Role</th>
                    <th className="py-4 px-4">Last Activity</th>
                    <th className="py-4 px-4 text-center">Security Status</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                        No user accounts match your search query or filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-black/[0.01] transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("size-10 rounded-full flex items-center justify-center text-xs font-black", user.avatarBg)}>
                              {user.initials}
                            </div>
                            <div>
                              <p className="text-sm font-extrabold text-black">{user.name}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Mail className="size-3 shrink-0" /> {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-xs font-bold text-gray-700">{user.department}</td>
                        <td className="py-4 px-4">
                          <div className="relative inline-block text-left">
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value as UserAccount["role"])}
                              className="bg-black/5 hover:bg-black/10 transition-colors text-xs font-semibold px-2.5 py-1 rounded-md text-black cursor-pointer outline-none border-none appearance-none pr-5 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23222%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:6px_auto] bg-[right_6px_center] bg-no-repeat"
                            >
                              <option value="Admin">Admin</option>
                              <option value="HR Manager">HR Manager</option>
                              <option value="Finance Auditor">Finance Auditor</option>
                              <option value="Staff">Staff</option>
                            </select>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-xs font-semibold text-gray-500">{user.lastLogin}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={cn(
                            "inline-flex items-center text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-sm",
                            user.status === "Active" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            user.status === "Suspended" && "bg-rose-50 text-rose-700 border-rose-200",
                            user.status === "Invited" && "bg-indigo-50 text-indigo-700 border-indigo-200"
                          )}>
                            {user.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user.status !== "Invited" && (
                              <button
                                onClick={() => handleToggleStatus(user.id)}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all active:scale-90",
                                  user.status === "Active"
                                    ? "hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                                    : "hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800"
                                )}
                                title={user.status === "Active" ? "Suspend Account" : "Activate Account"}
                              >
                                {user.status === "Active" ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-700 transition-all active:scale-90"
                              title="Delete Account"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white/95 backdrop-blur-lg border border-black/10 rounded-3xl p-6 shadow-2xl relative"
          >
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-5 top-5 p-1 text-gray-400 hover:text-black rounded-lg transition-colors"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-xl font-black text-black tracking-tight mb-4 flex items-center gap-2">
              <Users className="size-5 text-black" />
              <span>Create User Account</span>
            </h3>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. David Kassa"
                  className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-green-700 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="e.g. david@hkctrading.erp"
                  className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-green-700 focus:bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Department</label>
                  <select
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                    className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3.5 text-sm font-semibold text-black outline-none focus:border-green-700 focus:bg-white transition-colors"
                  >
                    <option value="Tech">Tech</option>
                    <option value="Product">Product</option>
                    <option value="HR">HR</option>
                    <option value="Sales">Sales</option>
                    <option value="Finance">Finance</option>
                    <option value="Executive">Executive</option>
                    <option value="Design">Design</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">System Access Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserAccount["role"] })}
                    className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3.5 text-sm font-semibold text-black outline-none focus:border-green-700 focus:bg-white transition-colors"
                  >
                    <option value="Admin">Admin</option>
                    <option value="HR Manager">HR Manager</option>
                    <option value="Finance Auditor">Finance Auditor</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Initial Security Status</label>
                <div className="grid grid-cols-3 gap-3">
                  {(["Active", "Suspended", "Invited"] as UserAccount["status"][]).map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setNewUser({ ...newUser, status })}
                      className={cn(
                        "py-2.5 rounded-2xl text-xs font-bold transition-all border",
                        newUser.status === status
                          ? "bg-black text-white border-transparent shadow-md"
                          : "bg-black/[0.02] border-black/10 text-gray-500 hover:bg-black/[0.04]"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-full border border-black/10 text-xs font-bold hover:bg-black/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-black hover:bg-zinc-800 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                >
                  Save User
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
