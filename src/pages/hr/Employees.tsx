import { useState } from "react"
import { motion } from "framer-motion"
import { X, UserMinus } from "lucide-react"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useHRStore } from "@/lib/hrStore"
import { 
  HRTableToolbar, 
  ResizableTableHeader, 
  useTableSort, 
  useColumnWidths, 
  type TableColumn 
} from "@/components/HRTable"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.05 } } }

export default function Employees() {
  const store = useHRStore()
  const employees = store.getEmployees()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDept, setSelectedDept] = useState("All")
  const [showAddModal, setShowAddModal] = useState(false)
  
  // New Employee Form State
  const [newEmp, setNewEmp] = useState({
    name: "",
    role: "",
    department: "Tech",
    email: "",
    salary: "",
    status: "Active" as const,
  })

  const departments = ["All", ...Array.from(new Set(employees.map(e => e.department)))]

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDept = selectedDept === "All" || emp.department === selectedDept
    return matchesSearch && matchesDept
  })

  const { sortKey, sortDir, handleSort, handleClearSort, sortItems } = useTableSort()
  const sortedEmployees = sortItems(filteredEmployees)

  const columns: TableColumn[] = [
    { key: "name", label: "Employee", initialWidth: 200 },
    { key: "department", label: "Department", initialWidth: 150 },
    { key: "email", label: "Contact & ID", initialWidth: 200 },
    { key: "joinDate", label: "Join Date", initialWidth: 130 },
    { key: "salary", label: "Salary", align: "right", initialWidth: 140 },
    { key: "status", label: "Status", align: "center", initialWidth: 120 },
    { key: "actions", label: "Actions", align: "right", sortable: false, initialWidth: 90 },
  ]

  const { colWidths, handleResizeStart } = useColumnWidths({
    name: 200,
    department: 150,
    email: 200,
    joinDate: 130,
    salary: 140,
    status: 120,
    actions: 90,
  })

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmp.name || !newEmp.role || !newEmp.email || !newEmp.salary) return

    store.addEmployee({
      name: newEmp.name,
      role: newEmp.role,
      department: newEmp.department,
      email: newEmp.email,
      status: newEmp.status,
      statusColor: newEmp.status === "Active" 
        ? "bg-green-100 text-green-700 border border-green-200" 
        : "bg-zinc-100 text-zinc-700 border border-zinc-200",
      joinDate: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
      employmentType: "Full-Time",
      salary: parseFloat(newEmp.salary) || 50000,
      presentToday: newEmp.status === "Active",
    })

    setShowAddModal(false)
    setNewEmp({
      name: "",
      role: "",
      department: "Tech",
      email: "",
      salary: "",
      status: "Active",
    })
  }

  const handleDeleteEmployee = (id: string) => {
    store.deleteEmployee(id)
  }


  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Header Block */}
        <motion.div variants={fade} className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight mt-1">Employee Directory</h1>
            <p className="text-xs font-semibold text-zinc-500 max-w-xl leading-relaxed mt-1">
              Staff records, department allocations, role assignments, and active employment statuses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/hr")} />
          </div>
        </motion.div>

        {/* Directory Grid/List */}
        <motion.div variants={fade}>
          <GlassCard className="p-0 overflow-hidden border border-black/5 shadow-xs">
            <HRTableToolbar
              title="Employee Roster"
              subtitle={`${sortedEmployees.length} active staff across departments`}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search employee, role, email..."
              filters={[
                {
                  value: selectedDept,
                  onChange: setSelectedDept,
                  ariaLabel: "Department Filter",
                  options: departments.map((d) => ({ value: d, label: d === "All" ? "All Departments" : d })),
                },
              ]}
              actions={[
                {
                  label: "Add Employee",
                  onClick: () => setShowAddModal(true),
                },
              ]}
            />

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <ResizableTableHeader
                  columns={columns}
                  colWidths={colWidths}
                  onResizeStart={handleResizeStart}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  onClearSort={handleClearSort}
                />
                <tbody className="divide-y divide-black/5 text-xs">
                  {sortedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400 font-medium">
                        No employees match your search or filter.
                      </td>
                    </tr>
                  ) : (
                    sortedEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-black/[0.02] transition-colors">
                        <td style={{ width: `${colWidths.name}px` }} className="py-3.5 px-3.5 truncate">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`size-8 rounded-full ${emp.avatarBg} flex items-center justify-center text-xs font-black text-zinc-800 shadow-2xs shrink-0`}>
                              {emp.initials}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-black truncate">{emp.name}</p>
                              <p className="text-[10px] text-zinc-500 truncate">{emp.role}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ width: `${colWidths.department}px` }} className="py-3.5 px-3.5 truncate">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/5 text-zinc-800 inline-block truncate">
                            {emp.department}
                          </span>
                        </td>
                        <td style={{ width: `${colWidths.email}px` }} className="py-3.5 px-3.5 truncate">
                          <p className="text-xs font-medium text-zinc-900 truncate">{emp.email}</p>
                          <p className="text-[10px] text-zinc-400 font-mono font-bold truncate">{emp.id}</p>
                        </td>
                        <td style={{ width: `${colWidths.joinDate}px` }} className="py-3.5 px-3.5 text-xs font-medium text-zinc-600 font-mono truncate">
                          {emp.joinDate}
                        </td>
                        <td style={{ width: `${colWidths.salary}px` }} className="py-3.5 px-3.5 text-xs font-black text-black font-mono text-right truncate">
                          ETB {emp.salary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ width: `${colWidths.status}px` }} className="py-3.5 px-3.5">
                          <div className="flex justify-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${emp.statusColor}`}>
                              <span className={`size-1.5 rounded-full ${emp.status === "Active" ? "bg-emerald-500" : "bg-zinc-400"}`} />
                              {emp.status}
                            </span>
                          </div>
                        </td>
                        <td style={{ width: `${colWidths.actions}px` }} className="py-3.5 px-3.5 text-right">
                          <button
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-zinc-400 transition-all active:scale-90"
                            title="Remove profile"
                          >
                            <UserMinus className="size-4" />
                          </button>
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

      {/* Add Employee Modal */}
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
            
            <h3 className="text-xl font-black text-black tracking-tight mb-4">Add Employee Profile</h3>
            
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={newEmp.name}
                  onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-green-700 focus:bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Role / Position</label>
                  <input
                    type="text"
                    required
                    value={newEmp.role}
                    onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                    placeholder="e.g. UX Designer"
                    className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-green-700 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Department</label>
                  <select
                    value={newEmp.department}
                    onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                    className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3.5 text-sm font-semibold text-black outline-none focus:border-green-700 focus:bg-white transition-colors"
                  >
                    <option value="Tech">Tech</option>
                    <option value="Product">Product</option>
                    <option value="HR">HR</option>
                    <option value="Sales">Sales</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Work Email</label>
                <input
                  type="email"
                  required
                  value={newEmp.email}
                  onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                  placeholder="e.g. john@hkctrading.erp"
                  className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-green-700 focus:bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Monthly Salary (ETB)</label>
                  <input
                    type="number"
                    required
                    value={newEmp.salary}
                    onChange={(e) => setNewEmp({ ...newEmp, salary: e.target.value })}
                    placeholder="e.g. 75000"
                    className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-green-700 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={newEmp.status}
                    onChange={(e) => setNewEmp({ ...newEmp, status: e.target.value as any })}
                    className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3.5 text-sm font-semibold text-black outline-none focus:border-green-700 focus:bg-white transition-colors"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-black/10 text-black hover:bg-black/5 rounded-2xl py-3 text-sm font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#242427] text-white hover:bg-[#323236] rounded-2xl py-3 text-sm font-bold transition-all shadow-md"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
