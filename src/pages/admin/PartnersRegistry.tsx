import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Upload,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Phone,
  Mail,
  Globe,
} from "lucide-react"
import { EditModalHeader } from "@/components/EditModalHeader"
import { RecordDeleteModal } from "@/components/RecordDeleteModal"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useErpStore, getTradeLicenseStatus, type Customer, type Supplier } from "@/lib/erpStore"
import { useFeedback } from "@/context/FeedbackContext"
import { Skeleton } from "@/components/ui/skeleton"
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

export default function PartnersRegistry() {
  const erp = useErpStore()
  const isLoading = erp.isLoading()
  const { showToast } = useFeedback()

  const customers = erp.getCustomers()
  const suppliers = erp.getSuppliers()

  const [activeTab, setActiveTab] = useState<"customers" | "suppliers">("customers")
  const [search, setSearch] = useState("")

  // Modals & Deleting states
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)

  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)

  // Customer Form State
  const [custName, setCustName] = useState("")
  const [custCountry, setCustCountry] = useState("Ethiopia")
  const [custRegion, setCustRegion] = useState("")
  const [custContactPerson, setCustContactPerson] = useState("")
  const [custPhone, setCustPhone] = useState("")
  const [custEmail, setCustEmail] = useState("")
  const [custAddress, setCustAddress] = useState("")
  const [custCategory, setCustCategory] = useState("Commercial Union")
  const [custTradePaperName, setCustTradePaperName] = useState("")
  const [custTradePaperUrl, setCustTradePaperUrl] = useState("")


  // Preview states
  const [previewUrl, setPreviewUrl] = useState("")
  const [previewName, setPreviewName] = useState("")

  // Supplier Form State
  const [suppName, setSuppName] = useState("")
  const [suppCountry, setSuppCountry] = useState("China")
  const [suppCity, setSuppCity] = useState("")
  const [suppContactPerson, setSuppContactPerson] = useState("")
  const [suppPhone, setSuppPhone] = useState("")
  const [suppEmail, setSuppEmail] = useState("")
  const [suppAddress, setSuppAddress] = useState("")
  const [suppCategory, setSuppCategory] = useState("Pharmaceutical Manufacturer")
  const [suppTaxId, setSuppTaxId] = useState("")
  const [suppTradePaperName, setSuppTradePaperName] = useState("")
  const [suppTradePaperUrl, setSuppTradePaperUrl] = useState("")

  const openAddCustomer = () => {
    setCustName("")
    setCustCountry("Ethiopia")
    setCustRegion("")
    setCustContactPerson("")
    setCustPhone("")
    setCustEmail("")
    setCustAddress("")
    setCustCategory("Commercial Union")
    setCustTradePaperName("")
    setCustTradePaperUrl("")
    setEditingCustomer(null)
    setShowAddCustomerModal(true)
  }

  const openEditCustomer = (c: Customer) => {
    setEditingCustomer(c)
    setCustName(c.name || "")
    setCustCountry(c.country || "Ethiopia")
    setCustRegion(c.region || "")
    setCustContactPerson(c.contactPerson || "")
    setCustPhone(c.phone || "")
    setCustEmail(c.email || "")
    setCustAddress(c.address || "")
    setCustCategory(c.category || "Commercial Union")
    setCustTradePaperName(c.tradePaperFileName || "")
    setCustTradePaperUrl(c.tradePaperUrl || "")
    setShowAddCustomerModal(true)
  }

  const openAddSupplier = () => {
    setSuppName("")
    setSuppCountry("China")
    setSuppCity("")
    setSuppContactPerson("")
    setSuppPhone("")
    setSuppEmail("")
    setSuppAddress("")
    setSuppCategory("Pharmaceutical Manufacturer")
    setSuppTaxId("")
    setSuppTradePaperName("")
    setSuppTradePaperUrl("")
    setEditingSupplier(null)
    setShowAddSupplierModal(true)
  }

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s)
    setSuppName(s.name || "")
    setSuppCountry(s.country || "China")
    setSuppCity(s.city || "")
    setSuppContactPerson(s.contactPerson || "")
    setSuppPhone(s.phone || "")
    setSuppEmail(s.email || "")
    setSuppAddress(s.address || "")
    setSuppCategory(s.category || "Pharmaceutical Manufacturer")
    setSuppTaxId(s.taxId || "")
    setSuppTradePaperName(s.tradePaperFileName || "")
    setSuppTradePaperUrl(s.tradePaperUrl || "")
    setShowAddSupplierModal(true)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fileType: "trade" | "supplier" = "trade") => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = (reader.result as string) || ""
      if (fileType === "supplier") {
        setSuppTradePaperName(file.name)
        setSuppTradePaperUrl(url)
      } else {
        setCustTradePaperName(file.name)
        setCustTradePaperUrl(url)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!custName.trim()) {
      showToast("Validation Error", "warning", "Customer name is required.")
      return
    }

    if (editingCustomer) {
      const isNewFile = custTradePaperUrl !== (editingCustomer.tradePaperUrl || "")
      const uploadedAt = isNewFile ? new Date().toISOString() : editingCustomer.tradePaperUploadedAt

      erp.updateCustomer(editingCustomer.id, {
        name: custName.trim(),
        country: custCountry,
        region: custRegion,
        contactPerson: custContactPerson,
        phone: custPhone,
        email: custEmail,
        address: custAddress,
        category: custCategory,
        tradePaperFileName: custTradePaperName,
        tradePaperUrl: custTradePaperUrl,
        tradePaperUploadedAt: uploadedAt,
      })
      showToast("Customer Updated", "success", `Customer ${custName} successfully updated in registry.`)
    } else {
      const hasFile = !!custTradePaperUrl
      const newCust: Customer = {
        id: `CUST-${Date.now().toString().slice(-4)}`,
        name: custName.trim(),
        country: custCountry,
        region: custRegion,
        contactPerson: custContactPerson,
        phone: custPhone,
        email: custEmail,
        address: custAddress,
        category: custCategory,
        tradePaperFileName: custTradePaperName,
        tradePaperUrl: custTradePaperUrl,
        tradePaperUploadedAt: hasFile ? new Date().toISOString() : undefined,
      }
      erp.addCustomer(newCust)
      showToast("Customer Added", "success", `New customer ${custName} added to registry.`)
    }
    setShowAddCustomerModal(false)
  }

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault()
    if (!suppName.trim()) {
      showToast("Validation Error", "warning", "Supplier name is required.")
      return
    }

    if (editingSupplier) {
      erp.updateSupplier(editingSupplier.id, {
        name: suppName.trim(),
        country: suppCountry,
        city: suppCity,
        contactPerson: suppContactPerson,
        phone: suppPhone,
        email: suppEmail,
        address: suppAddress,
        category: suppCategory,
        taxId: suppTaxId,
        tradePaperFileName: suppTradePaperName,
        tradePaperUrl: suppTradePaperUrl,
      })
      showToast("Supplier Updated", "success", `Supplier ${suppName} successfully updated in registry.`)
    } else {
      const newSupp: Supplier = {
        id: `SUPP-${Date.now().toString().slice(-4)}`,
        name: suppName.trim(),
        country: suppCountry,
        city: suppCity,
        contactPerson: suppContactPerson,
        phone: suppPhone,
        email: suppEmail,
        address: suppAddress,
        category: suppCategory,
        taxId: suppTaxId,
        warehouseTarget: "WH1",
        rating: "A",
        status: "Active",
        tradePaperFileName: suppTradePaperName,
        tradePaperUrl: suppTradePaperUrl,
      }
      erp.addSupplier(newSupp)
      showToast("Supplier Added", "success", `New Supplier ${suppName} onboarded to registry.`)
    }

    setShowAddSupplierModal(false)
  }

  const handleDeleteCustomer = (c: Customer) => {
    setDeletingCustomer(c)
  }

  const handleDeleteSupplier = (s: Supplier) => {
    setDeletingSupplier(s)
  }

  // Filtered lists
  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase()
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.contactPerson || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    )
  })

  const filteredSuppliers = suppliers.filter((s) => {
    const q = search.toLowerCase()
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.contactPerson || "").toLowerCase().includes(q) ||
      (s.phone || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q)
    )
  })

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={fade} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Partners Registry</h1>
            <p className="text-sm text-gray-500 mt-1">Manage enterprise Customers, Suppliers, contact directories, and default Trade Licenses.</p>
          </div>
          <div className="shrink-0">
            <SubPageNav items={getSectionChildren("/admin")} />
          </div>
        </div>

        {/* Tab Switcher & Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <GlassCard className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Total Registered Customers</span>
              <p className="text-2xl font-black font-mono text-emerald-700 mt-0.5">{customers.length}</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700">
              <Users className="size-5" />
            </div>
          </GlassCard>

          <GlassCard className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Total Registered Suppliers</span>
              <p className="text-2xl font-black font-mono text-blue-700 mt-0.5">{suppliers.length}</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-100 text-blue-700">
              <Building2 className="size-5" />
            </div>
          </GlassCard>

          <GlassCard className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Active Trade Licenses Onboarded</span>
              <p className="text-2xl font-black font-mono text-purple-700 mt-0.5">
                {customers.filter((c) => c.tradePaperFileName).length + suppliers.filter((s) => s.tradePaperFileName).length}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-purple-100 text-purple-700">
              <ShieldCheck className="size-5" />
            </div>
          </GlassCard>
        </div>

        {/* Master Registry Table Card */}
        <GlassCard className="p-0 border border-white/65 shadow-md overflow-hidden">
          {/* Header Toolbar */}
          <div className="p-4 border-b border-zinc-200/80 bg-white/40 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left Dual Tab Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-200/70 rounded-2xl">
              <button
                onClick={() => setActiveTab("customers")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === "customers"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Users className="size-3.5 text-emerald-600" /> Customers ({customers.length})
              </button>
              <button
                onClick={() => setActiveTab("suppliers")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === "suppliers"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Building2 className="size-3.5 text-blue-600" /> Suppliers ({suppliers.length})
              </button>
            </div>

            {/* Right Search & Action Trigger */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="size-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-semibold outline-none focus:border-zinc-400"
                />
              </div>

              {activeTab === "customers" ? (
                <button
                  onClick={openAddCustomer}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="size-3.5" /> Add Customer
                </button>
              ) : (
                <button
                  onClick={openAddSupplier}
                  className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="size-3.5" /> Add Supplier
                </button>
              )}
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            {activeTab === "customers" ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100/90 text-zinc-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-zinc-200/80">
                  <tr>
                    <th className="px-4 py-3">Customer ID / Name</th>
                    <th className="px-4 py-3">Category & Region</th>
                    <th className="px-4 py-3">Contact Details</th>
                    <th className="px-4 py-3 text-center">Trade License</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 font-semibold text-zinc-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center"><Skeleton className="h-6 w-full bg-zinc-200/80" /></td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-400 font-medium">No customers found in registry.</td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-white/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-mono font-black text-zinc-950">{c.id}</div>
                          <div className="font-bold text-zinc-900 text-sm mt-0.5">{c.name}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-200/80">
                            {c.category || "General Client"}
                          </span>
                          <div className="text-[11px] text-zinc-500 font-medium mt-1 flex items-center gap-1">
                            <Globe className="size-3 text-zinc-400" /> {c.country} {c.region ? `(${c.region})` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-zinc-900">{c.contactPerson || "N/A"}</div>
                          <div className="text-[11px] text-zinc-500 flex items-center gap-3 mt-1">
                            {c.phone && <span className="flex items-center gap-1"><Phone className="size-3 text-zinc-400" /> {c.phone}</span>}
                            {c.email && <span className="flex items-center gap-1"><Mail className="size-3 text-zinc-400" /> {c.email}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {c.tradePaperFileName || c.tradePaperUrl ? (
                              (() => {
                                const evaluation = getTradeLicenseStatus(c)
                                const isExpired = evaluation.status === "expired"
                                return (
                                  <div className="flex flex-col items-center gap-1">
                                    {c.tradePaperUrl ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPreviewUrl(c.tradePaperUrl || "")
                                          setPreviewName(c.tradePaperFileName || "Trade License")
                                        }}
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold transition-colors border ${
                                          isExpired 
                                            ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" 
                                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                        }`}
                                        title={isExpired ? "Trade License Expired! Click to view" : "View Trade License"}
                                      >
                                        <CheckCircle2 className={`size-3 ${isExpired ? "text-rose-500" : "text-emerald-600"}`} /> {c.tradePaperFileName || "Trade License"} ↗
                                      </button>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-50 text-zinc-700 border-zinc-200">
                                        <CheckCircle2 className="size-3 text-zinc-400" /> {c.tradePaperFileName}
                                      </span>
                                    )}
                                    <span className={`text-[9px] font-black uppercase tracking-wider ${isExpired ? "text-rose-600" : "text-emerald-600"}`}>
                                      {isExpired ? "Expired" : `Valid (${evaluation.daysRemaining}d remaining)`}
                                    </span>
                                  </div>
                                )
                              })()
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertCircle className="size-2.5 text-amber-500" /> Trade License Missing
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditCustomer(c)}
                              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                              title="Edit Customer"
                            >
                              <Edit className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(c)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Delete Customer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100/90 text-zinc-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-zinc-200/80">
                  <tr>
                    <th className="px-4 py-3">Supplier ID / Name</th>
                    <th className="px-4 py-3">Category & Location</th>
                    <th className="px-4 py-3">Contact Details</th>
                    <th className="px-4 py-3 text-center">Trade License</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 font-semibold text-zinc-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center"><Skeleton className="h-6 w-full bg-zinc-200/80" /></td>
                    </tr>
                  ) : filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-400 font-medium">No suppliers found in registry.</td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-white/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-mono font-black text-zinc-950">{s.id}</div>
                          <div className="font-bold text-zinc-900 text-sm mt-0.5">{s.name}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100/80 text-blue-800 border border-blue-200/80">
                            {s.category || "Supplier Partner"}
                          </span>
                          <div className="text-[11px] text-zinc-500 font-medium mt-1 flex items-center gap-1">
                            <Globe className="size-3 text-zinc-400" /> {s.country} {s.city ? `(${s.city})` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-zinc-900">{s.contactPerson || "N/A"}</div>
                          <div className="text-[11px] text-zinc-500 flex items-center gap-3 mt-1">
                            {s.phone && <span className="flex items-center gap-1"><Phone className="size-3 text-zinc-400" /> {s.phone}</span>}
                            {s.email && <span className="flex items-center gap-1"><Mail className="size-3 text-zinc-400" /> {s.email}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {s.tradePaperFileName ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                              <CheckCircle2 className="size-3 text-blue-600" /> {s.tradePaperFileName}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle className="size-3 text-amber-500" /> Missing Trade License
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditSupplier(s)}
                              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                              title="Edit Supplier"
                            >
                              <Edit className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(s)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Delete Supplier"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* MODAL: ADD/EDIT CUSTOMER */}
      <AnimatePresence>
        {showAddCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-zinc-200 overflow-y-auto max-h-[90vh]"
            >
              <EditModalHeader
                title={editingCustomer ? `Edit Customer: ${editingCustomer.name}` : "Onboard New Customer"}
                subtitle={editingCustomer ? `ID: ${editingCustomer.id} • ${editingCustomer.category}` : "Register customer profile and default Trade License for future orders."}
                onClose={() => setShowAddCustomerModal(false)}
                onRequestDelete={editingCustomer ? () => setDeletingCustomer(editingCustomer) : undefined}
                deleteLabel="Delete Customer Profile"
              />

              <form onSubmit={handleSaveCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Customer / Union Name *</label>
                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="e.g. Mekelle Agro-Vet Union"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Category</label>
                    <select
                      value={custCategory}
                      onChange={(e) => setCustCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    >
                      <option value="Commercial Union">Commercial Union</option>
                      <option value="Government Agency">Government Agency</option>
                      <option value="Wholesale Distributor">Wholesale Distributor</option>
                      <option value="Retail Pharmacy Chain">Retail Pharmacy Chain</option>
                      <option value="International Importer">International Importer</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={custCountry}
                      onChange={(e) => setCustCountry(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Region / City</label>
                    <input
                      type="text"
                      value={custRegion}
                      onChange={(e) => setCustRegion(e.target.value)}
                      placeholder="e.g. Tigray / Mekelle"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={custContactPerson}
                      onChange={(e) => setCustContactPerson(e.target.value)}
                      placeholder="Officer Name"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      placeholder="+251 ..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      placeholder="contact@domain.com"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                {/* Customer Documents Section */}
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                  <span className="text-xs font-black uppercase text-zinc-900 tracking-wider block">Customer Documents & Licenses</span>
                  
                  {/* Trade License */}
                  <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-800">Trade License / Business Permit</span>
                      {custTradePaperName && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="size-3" /> Attached
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="cursor-pointer px-3 py-1 rounded-lg bg-zinc-900 text-white font-bold text-[11px] hover:bg-zinc-800 flex items-center gap-1 shrink-0">
                        <Upload className="size-3" /> Select File
                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, "trade")} />
                      </label>
                      <span className="text-[11px] font-mono text-zinc-600 truncate flex-1">{custTradePaperName || "No file chosen"}</span>
                      {custTradePaperUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewUrl(custTradePaperUrl)
                            setPreviewName(custTradePaperName || "Trade License")
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md inline-flex items-center gap-1 shrink-0"
                        >
                          View Doc ↗
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(false)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 shadow-md"
                  >
                    {editingCustomer ? "Save Changes" : "Create Customer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD/EDIT SUPPLIER */}
      <AnimatePresence>
        {showAddSupplierModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-zinc-200 overflow-y-auto max-h-[90vh]"
            >
              <EditModalHeader
                title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : "Onboard New Supplier"}
                subtitle={editingSupplier ? `ID: ${editingSupplier.id} • ${editingSupplier.category}` : "Register supplier details and contact profile."}
                onClose={() => setShowAddSupplierModal(false)}
                onRequestDelete={editingSupplier ? () => setDeletingSupplier(editingSupplier) : undefined}
                deleteLabel="Delete Supplier Profile"
              />

              <form onSubmit={handleSaveSupplier} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Supplier Company Name *</label>
                    <input
                      type="text"
                      required
                      value={suppName}
                      onChange={(e) => setSuppName(e.target.value)}
                      placeholder="e.g. Hebei Vet Chem Ltd"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Category</label>
                    <select
                      value={suppCategory}
                      onChange={(e) => setSuppCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    >
                      <option value="Pharmaceutical Manufacturer">Pharmaceutical Manufacturer</option>
                      <option value="Raw Materials Supplier">Raw Materials Supplier</option>
                      <option value="Packaging Equipment Vendor">Packaging Equipment Vendor</option>
                      <option value="Logistics Shipping Partner">Logistics Shipping Partner</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={suppCountry}
                      onChange={(e) => setSuppCountry(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">City</label>
                    <input
                      type="text"
                      value={suppCity}
                      onChange={(e) => setSuppCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Tax ID / TIN</label>
                    <input
                      type="text"
                      value={suppTaxId}
                      onChange={(e) => setSuppTaxId(e.target.value)}
                      placeholder="Tax Reg ID"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={suppContactPerson}
                      onChange={(e) => setSuppContactPerson(e.target.value)}
                      placeholder="Account Officer"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={suppPhone}
                      onChange={(e) => setSuppPhone(e.target.value)}
                      placeholder="+86 ..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={suppEmail}
                      onChange={(e) => setSuppEmail(e.target.value)}
                      placeholder="sales@vendor.com"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                {/* Trade Paper File Upload */}
                <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-900 block">Default Trade Paper / Manufacturer Registration</span>
                      <span className="text-[10px] text-zinc-500 font-medium block">Pre-attached automatically for import Purchase Orders</span>
                    </div>
                    {suppTradePaperName && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="size-3" /> Attached
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <label className="cursor-pointer px-4 py-1.5 rounded-xl bg-zinc-900 text-white font-bold text-xs hover:bg-zinc-800 shadow-sm flex items-center gap-1.5">
                      <Upload className="size-3.5" /> Select Trade Paper File
                      <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, "supplier")} />
                    </label>
                    <span className="text-xs font-mono text-zinc-600 truncate">{suppTradePaperName || "No file chosen"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowAddSupplierModal(false)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 shadow-md"
                  >
                    {editingSupplier ? "Save Changes" : "Create Supplier"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REUSABLE DELETE CONFIRMATION MODALS */}
      <RecordDeleteModal
        isOpen={!!deletingCustomer}
        title="Delete Customer Profile?"
        recordId={deletingCustomer?.id}
        recordName={deletingCustomer?.name}
        description="This will permanently delete this customer profile from system registry."
        onClose={() => setDeletingCustomer(null)}
        onConfirmDelete={() => {
          if (!deletingCustomer) return
          erp.deleteCustomer(deletingCustomer.id)
          showToast("Customer Removed", "info", `Customer ${deletingCustomer.name} deleted.`)
          setDeletingCustomer(null)
          setShowAddCustomerModal(false)
          setEditingCustomer(null)
        }}
      />

      <RecordDeleteModal
        isOpen={!!deletingSupplier}
        title="Delete Supplier Profile?"
        recordId={deletingSupplier?.id}
        recordName={deletingSupplier?.name}
        description="This will permanently delete this supplier profile from system registry."
        onClose={() => setDeletingSupplier(null)}
        onConfirmDelete={() => {
          if (!deletingSupplier) return
          erp.deleteSupplier(deletingSupplier.id)
          showToast("Supplier Removed", "info", `Supplier ${deletingSupplier.name} deleted.`)
          setDeletingSupplier(null)
          setShowAddSupplierModal(false)
          setEditingSupplier(null)
        }}
      />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!previewUrl}
        onClose={() => {
          setPreviewUrl("")
          setPreviewName("")
        }}
        fileUrl={previewUrl}
        fileName={previewName}
      />
    </div>
  )
}
