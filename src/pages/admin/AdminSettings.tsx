import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FloatingNav } from "@/components/FloatingNav"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { GlassCard } from "@/components/GlassCard"
import { useFeedback } from "@/context/FeedbackContext"
import {
  Building2,
  SlidersHorizontal,
  PackageCheck,
  BookOpen,
  Database,
  Save,
  RotateCcw,
  Check,
  Download,
  Activity,
  Sparkles,
} from "lucide-react"
import { useErpStore } from "@/lib/erpStore"
import { useFinanceStore } from "@/lib/financeStore"
import { API_BASE } from "@/lib/apiPersistence"
import { cn } from "@/lib/utils"

const fade = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const listContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
}

export default function AdminSettings() {
  const subPages = getSectionChildren("/admin")
  const { showToast, confirm } = useFeedback()
  const erp = useErpStore()
  const finance = useFinanceStore()
  const companySettings = finance.getCompanySettings()
  const accounts = finance.getAccounts()

  const [activeTab, setActiveTab] = useState("general")
  const [isSaved, setIsSaved] = useState(false)

  // 1. General & Entity Profile
  const [companyName, setCompanyName] = useState(companySettings.company_name || "HKC Trading Enterprise")
  const [tinNumber, setTinNumber] = useState(companySettings.tin_number || "0012345678")
  const [address, setAddress] = useState(companySettings.address || "Bole Subcity, Woreda 03, Addis Ababa, Ethiopia")
  const [contactEmail, setContactEmail] = useState(companySettings.contact_email || "info@hkctrading.com")
  const [contactPhone, setContactPhone] = useState(companySettings.contact_phone || "+251 11 662 4580")
  const [baseCurrency, setBaseCurrency] = useState(companySettings.base_currency || "ETB")
  const [fiscalYearStart, setFiscalYearStart] = useState(companySettings.fiscal_year_start || "July")

  // 2. Processing & Storage Rates
  const [procRate, setProcRate] = useState<number>(companySettings.processing_rate_per_quintal ?? 150)
  const [baseStorage, setBaseStorage] = useState<number>(companySettings.base_storage_rate_per_quintal_day ?? 1.25)
  const [storageIncrement, setStorageIncrement] = useState<number>(companySettings.storage_increment_per_month ?? 0.25)
  const [maxStorageMonth, setMaxStorageMonth] = useState<number>(companySettings.max_storage_month_cap ?? 4)
  const [storageFreeDays, setStorageFreeDays] = useState<number>(companySettings.storage_free_days ?? 7)

  // 3. Inventory & Order Automation
  const [defaultReorderLevel, setDefaultReorderLevel] = useState<number>(companySettings.default_reorder_level ?? 50)
  const [preventNegativeStock, setPreventNegativeStock] = useState<boolean>(companySettings.prevent_negative_stock ?? true)
  const [autoDeliveryNotes, setAutoDeliveryNotes] = useState<boolean>(companySettings.auto_delivery_notes ?? true)
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(companySettings.default_payment_terms || "Net 30 Days")

  // 4. Default GL Account Mappings
  const [defaultInventoryAcc, setDefaultInventoryAcc] = useState(companySettings.default_inventory_account_id || "")
  const [defaultRevenueAcc, setDefaultRevenueAcc] = useState(companySettings.default_revenue_account_id || "")
  const [defaultCogsAcc, setDefaultCogsAcc] = useState(companySettings.default_cogs_account_id || "")
  const [defaultDamageAcc, setDefaultDamageAcc] = useState(companySettings.default_damage_account_id || "")
  const [defaultCashAcc, setDefaultCashAcc] = useState(companySettings.default_cash_account_id || "")

  // 5. Diagnostics & DB Export
  const [pingStatus, setPingStatus] = useState<"checking" | "online" | "offline">("checking")
  const [pingLatency, setPingLatency] = useState<number | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Sync state if store updates from API
  useEffect(() => {
    const s = finance.getCompanySettings()
    if (s.company_name) setCompanyName(s.company_name)
    if (s.tin_number) setTinNumber(s.tin_number)
    if (s.address) setAddress(s.address)
    if (s.contact_email) setContactEmail(s.contact_email)
    if (s.contact_phone) setContactPhone(s.contact_phone)
    if (s.base_currency) setBaseCurrency(s.base_currency)
    if (s.fiscal_year_start) setFiscalYearStart(s.fiscal_year_start)
    if (s.processing_rate_per_quintal !== undefined) setProcRate(s.processing_rate_per_quintal)
    if (s.base_storage_rate_per_quintal_day !== undefined) setBaseStorage(s.base_storage_rate_per_quintal_day)
    if (s.storage_increment_per_month !== undefined) setStorageIncrement(s.storage_increment_per_month)
    if (s.max_storage_month_cap !== undefined) setMaxStorageMonth(s.max_storage_month_cap)
    if (s.storage_free_days !== undefined) setStorageFreeDays(s.storage_free_days)
    if (s.default_reorder_level !== undefined) setDefaultReorderLevel(s.default_reorder_level)
    if (s.prevent_negative_stock !== undefined) setPreventNegativeStock(s.prevent_negative_stock)
    if (s.auto_delivery_notes !== undefined) setAutoDeliveryNotes(s.auto_delivery_notes)
    if (s.default_payment_terms) setDefaultPaymentTerms(s.default_payment_terms)
    if (s.default_inventory_account_id) setDefaultInventoryAcc(s.default_inventory_account_id)
    if (s.default_revenue_account_id) setDefaultRevenueAcc(s.default_revenue_account_id)
    if (s.default_cogs_account_id) setDefaultCogsAcc(s.default_cogs_account_id)
    if (s.default_damage_account_id) setDefaultDamageAcc(s.default_damage_account_id)
    if (s.default_cash_account_id) setDefaultCashAcc(s.default_cash_account_id)
  }, [finance])

  // Live ping check for Supabase / API backend
  const checkDiagnostics = async () => {
    setPingStatus("checking")
    const startTime = performance.now()
    try {
      const res = await fetch(`${API_BASE}/api/health`, { method: "GET" })
      const endTime = performance.now()
      if (res.ok) {
        setPingStatus("online")
        setPingLatency(Math.round(endTime - startTime))
      } else {
        setPingStatus("offline")
      }
    } catch {
      // Fallback check against resource endpoint
      try {
        const res2 = await fetch(`${API_BASE}/api/resources/company_settings`, { method: "GET" })
        const endTime2 = performance.now()
        if (res2.ok) {
          setPingStatus("online")
          setPingLatency(Math.round(endTime2 - startTime))
        } else {
          setPingStatus("offline")
        }
      } catch {
        setPingStatus("offline")
      }
    }
  }

  useEffect(() => {
    checkDiagnostics()
  }, [])

  const handleSave = () => {
    confirm({
      title: "Save ERP System Settings",
      message: "Are you sure you want to persist these configurations to the Supabase database?",
      confirmLabel: "Save Configurations",
      cancelLabel: "Cancel",
      onConfirm: () => {
        const updated = {
          company_name: companyName,
          tin_number: tinNumber,
          address,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          base_currency: baseCurrency,
          fiscal_year_start: fiscalYearStart,
          processing_rate_per_quintal: Number(procRate),
          base_storage_rate_per_quintal_day: Number(baseStorage),
          storage_increment_per_month: Number(storageIncrement),
          max_storage_month_cap: Number(maxStorageMonth),
          storage_free_days: Number(storageFreeDays),
          default_reorder_level: Number(defaultReorderLevel),
          prevent_negative_stock: preventNegativeStock,
          auto_delivery_notes: autoDeliveryNotes,
          default_payment_terms: defaultPaymentTerms,
          default_inventory_account_id: defaultInventoryAcc,
          default_revenue_account_id: defaultRevenueAcc,
          default_cogs_account_id: defaultCogsAcc,
          default_damage_account_id: defaultDamageAcc,
          default_cash_account_id: defaultCashAcc,
        }

        erp.updateCompanySettings(updated)
        setIsSaved(true)
        showToast("System Settings Saved", "success", "All configuration parameters have been synchronized with Supabase.")
        setTimeout(() => setIsSaved(false), 3000)
      },
    })
  }

  const handleReset = () => {
    confirm({
      title: "Reset Configuration Defaults",
      message: "This will revert company defaults, processing rates, and automation rules to standard values. Proceed?",
      confirmLabel: "Reset All",
      cancelLabel: "Cancel",
      isDestructive: true,
      onConfirm: () => {
        const defaults = {
          company_name: "HKC Trading Enterprise",
          tin_number: "0012345678",
          address: "Bole Subcity, Woreda 03, Addis Ababa, Ethiopia",
          contact_email: "info@hkctrading.com",
          contact_phone: "+251 11 662 4580",
          base_currency: "ETB",
          fiscal_year_start: "July",
          processing_rate_per_quintal: 150,
          base_storage_rate_per_quintal_day: 1.25,
          storage_increment_per_month: 0.25,
          max_storage_month_cap: 4,
          storage_free_days: 7,
          default_reorder_level: 50,
          prevent_negative_stock: true,
          auto_delivery_notes: true,
          default_payment_terms: "Net 30 Days",
          default_inventory_account_id: "",
          default_revenue_account_id: "",
          default_cogs_account_id: "",
          default_damage_account_id: "",
          default_cash_account_id: "",
        }
        setCompanyName(defaults.company_name)
        setTinNumber(defaults.tin_number)
        setAddress(defaults.address)
        setContactEmail(defaults.contact_email)
        setContactPhone(defaults.contact_phone)
        setBaseCurrency(defaults.base_currency)
        setFiscalYearStart(defaults.fiscal_year_start)
        setProcRate(defaults.processing_rate_per_quintal)
        setBaseStorage(defaults.base_storage_rate_per_quintal_day)
        setStorageIncrement(defaults.storage_increment_per_month)
        setMaxStorageMonth(defaults.max_storage_month_cap)
        setStorageFreeDays(defaults.storage_free_days)
        setDefaultReorderLevel(defaults.default_reorder_level)
        setPreventNegativeStock(defaults.prevent_negative_stock)
        setAutoDeliveryNotes(defaults.auto_delivery_notes)
        setDefaultPaymentTerms(defaults.default_payment_terms)
        setDefaultInventoryAcc("")
        setDefaultRevenueAcc("")
        setDefaultCogsAcc("")
        setDefaultDamageAcc("")
        setDefaultCashAcc("")

        erp.updateCompanySettings(defaults)
        showToast("Configurations Reset", "warning", "System settings reverted to default baseline parameters.")
      },
    })
  }

  // Real JSON Database Export
  const handleExportDatabase = () => {
    setIsExporting(true)
    try {
      const dump = {
        exported_at: new Date().toISOString(),
        system: "HKC Trading Enterprise ERP",
        company_settings: finance.getCompanySettings(),
        products: erp.getProducts(),
        stock_movements: erp.getStockMovements(),
        sales_orders: erp.getSalesOrders(),
        purchase_orders: erp.getPurchaseOrders(),
        quotations: erp.getQuotations(),
        delivery_notes: erp.getDeliveryNotes(),
        transfers: erp.getTransfers(),
        chart_of_accounts: finance.getAccounts(),
        journal_entries: finance.getJournalEntries(),
        journal_entry_lines: finance.getJournalEntryLines(),
        invoices: finance.getInvoices(),
        payments: finance.getPayments(),
        accounting_periods: finance.getAccountingPeriods(),
        tax_rules: finance.getTaxRules(),
        fixed_assets: finance.getFixedAssets(),
      }

      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `hkc_erp_backup_${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast("Database Exported", "success", "Complete ERP database dump downloaded as JSON.")
    } catch (err: any) {
      showToast("Export Failed", "warning", err.message || "Failed to generate database dump.")
    } finally {
      setIsExporting(false)
    }
  }

  const settingsTabs = [
    { id: "general", label: "Company Profile", icon: Building2, description: "Name, TIN, address, currency & fiscal cycle" },
    { id: "rates", label: "Processing & Storage", icon: SlidersHorizontal, description: "Toll fee rates & tiered monthly storage" },
    { id: "automation", label: "Inventory & Orders", icon: PackageCheck, description: "Reorder levels, negative stock & delivery rules" },
    { id: "accounts", label: "GL Account Mappings", icon: BookOpen, description: "Default inventory, revenue, and COGS accounts" },
    { id: "diagnostics", label: "Diagnostics & Backup", icon: Database, description: "Database JSON export & live Supabase ping" },
  ]

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <motion.div variants={fade} initial="hidden" animate="visible" className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-900 text-white flex items-center gap-1">
                <Sparkles className="size-3 text-emerald-400" /> Operational Configurations
              </span>
            </div>
            <h1 className="text-3xl font-black text-black tracking-tight">System Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Configure company profiles, processing fee rates, automation rules, and default ledger mappings.</p>
          </div>
          <div className="shrink-0">
            <SubPageNav items={subPages} />
          </div>
        </div>

        {/* Saved Success Banner */}
        <AnimatePresence>
          {isSaved && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-sm font-semibold px-4 py-3 rounded-2xl mb-6 flex items-center gap-2"
            >
              <Check className="size-4 shrink-0 text-emerald-600" />
              Global preferences and environment variables have been synchronized to Supabase!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layout Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Sidebar Tabs Selectors */}
          <div className="flex flex-col gap-2">
            {settingsTabs.map((tab) => {
              const TabIcon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3.5 group",
                    isSelected
                      ? "bg-[#1c1c1e] border-transparent text-white shadow-md shadow-black/10"
                      : "glass-card border-black/[0.03] text-[#505054] hover:text-black hover:bg-white/80 hover:border-black/10"
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "bg-white/10 text-white"
                        : "bg-black/5 text-[#505054] group-hover:bg-black/10 group-hover:text-black"
                    )}
                  >
                    <TabIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-bold leading-tight", isSelected ? "text-white" : "text-black")}>
                      {tab.label}
                    </p>
                    <p className={cn("text-xs mt-0.5 truncate", isSelected ? "text-zinc-400" : "text-gray-400")}>
                      {tab.description}
                    </p>
                  </div>
                </button>
              )
            })}

            {/* Quick Status Widget */}
            <div className="mt-4 p-4 rounded-2xl glass-card border border-black/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="size-3.5 text-emerald-500" /> Database Status
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                    pingStatus === "online"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : pingStatus === "checking"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  )}
                >
                  {pingStatus}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Backend Latency</span>
                  <span className="text-black font-semibold font-mono">{pingLatency !== null ? `${pingLatency} ms` : "—"}</span>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                  <span>Total Products</span>
                  <span className="text-black font-semibold font-mono">{erp.getProducts().length} items</span>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                  <span>Chart of Accounts</span>
                  <span className="text-black font-semibold font-mono">{accounts.length} codes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Tab Content */}
          <div className="flex flex-col gap-6">
            <AnimatePresence mode="wait">
              {/* Tab 1: Company Profile */}
              {activeTab === "general" && (
                <motion.div key="general" variants={listContainer} initial="hidden" animate="show" className="flex flex-col gap-5">
                  <GlassCard>
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-black/5">
                      <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
                        <Building2 className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">Company & Entity Profile</h3>
                        <p className="text-xs text-gray-400">Configure global metadata, tax identity, and official business contacts.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Legal Enterprise Name</label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">TIN / Tax Number</label>
                        <input
                          type="text"
                          value={tinNumber}
                          onChange={(e) => setTinNumber(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Contact Email</label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Contact Phone</label>
                        <input
                          type="text"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors font-mono"
                        />
                      </div>
                    </div>

                    <div className="mb-5">
                      <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Head Office Physical Address</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Primary Operating Currency</label>
                        <select
                          value={baseCurrency}
                          onChange={(e) => setBaseCurrency(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                        >
                          <option value="ETB">ETB (Br) - Ethiopian Birr</option>
                          <option value="USD">USD ($) - United States Dollar</option>
                          <option value="EUR">EUR (€) - Euro</option>
                          <option value="GBP">GBP (£) - British Pound</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Fiscal Year Start Month</label>
                        <select
                          value={fiscalYearStart}
                          onChange={(e) => setFiscalYearStart(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                        >
                          <option value="July">July (Hamle 1 - Ethiopian Fiscal Calendar)</option>
                          <option value="January">January (Gregorian Fiscal Calendar)</option>
                          <option value="September">September (Meskerem 1)</option>
                        </select>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Tab 2: Processing & Storage Rates */}
              {activeTab === "rates" && (
                <motion.div key="rates" variants={listContainer} initial="hidden" animate="show" className="flex flex-col gap-5">
                  <GlassCard>
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-black/5">
                      <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
                        <SlidersHorizontal className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">Processing Services & Storage Fee Rates</h3>
                        <p className="text-xs text-gray-400">Configure global processing fee rates and monthly tiered storage fee rules.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Processing Rate (ETB / Quintal)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={procRate}
                          onChange={(e) => setProcRate(Number(e.target.value))}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors font-mono"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Default fee applied per quintal of coffee processed in Toll Processing.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Base Storage Rate (ETB / Quintal / Day)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={baseStorage}
                          onChange={(e) => setBaseStorage(Number(e.target.value))}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors font-mono"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Initial rate charged for warehouse inventory storage per day.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Monthly Increment Rate (ETB)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={storageIncrement}
                          onChange={(e) => setStorageIncrement(Number(e.target.value))}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors font-mono"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Automatic fee addition applied for each month goods remain stored.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Max Storage Month Cap (Months)</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={maxStorageMonth}
                          onChange={(e) => setMaxStorageMonth(Number(e.target.value))}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors font-mono"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Maximum month cap before tiered storage rates stop compounding.</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Free Storage Grace Period (Days)</label>
                      <input
                        type="number"
                        min="0"
                        value={storageFreeDays}
                        onChange={(e) => setStorageFreeDays(Number(e.target.value))}
                        className="w-full md:w-1/2 bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors font-mono"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Initial grace window before storage fees begin accruing.</p>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Tab 3: Inventory & Orders Automation */}
              {activeTab === "automation" && (
                <motion.div key="automation" variants={listContainer} initial="hidden" animate="show" className="flex flex-col gap-5">
                  <GlassCard>
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-black/5">
                      <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700">
                        <PackageCheck className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">Inventory & Order Automation Rules</h3>
                        <p className="text-xs text-gray-400">Manage reorder thresholds, negative balance validation, and automated workflows.</p>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      {/* Negative stock prevention toggle */}
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-black/[0.01] hover:bg-black/[0.02] transition-colors border border-black/5">
                        <div>
                          <p className="text-sm font-bold text-black">Strict Negative Stock Prevention</p>
                          <p className="text-xs text-gray-400">Prevents confirmation of sales orders or delivery notes if inventory quantity is insufficient.</p>
                        </div>
                        <button
                          onClick={() => setPreventNegativeStock(!preventNegativeStock)}
                          className={cn(
                            "w-11 h-6 rounded-full p-1 transition-colors duration-300 relative shrink-0",
                            preventNegativeStock ? "bg-emerald-600" : "bg-black/10"
                          )}
                        >
                          <div
                            className={cn(
                              "size-4 rounded-full bg-white transition-transform duration-300 shadow",
                              preventNegativeStock ? "translate-x-5" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>

                      {/* Auto delivery note generation */}
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-black/[0.01] hover:bg-black/[0.02] transition-colors border border-black/5">
                        <div>
                          <p className="text-sm font-bold text-black">Auto-Generate Delivery Notes</p>
                          <p className="text-xs text-gray-400">Automatically creates draft delivery notes when a sales order is confirmed.</p>
                        </div>
                        <button
                          onClick={() => setAutoDeliveryNotes(!autoDeliveryNotes)}
                          className={cn(
                            "w-11 h-6 rounded-full p-1 transition-colors duration-300 relative shrink-0",
                            autoDeliveryNotes ? "bg-emerald-600" : "bg-black/10"
                          )}
                        >
                          <div
                            className={cn(
                              "size-4 rounded-full bg-white transition-transform duration-300 shadow",
                              autoDeliveryNotes ? "translate-x-5" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Default Product Reorder Level (Units)</label>
                        <input
                          type="number"
                          min="1"
                          value={defaultReorderLevel}
                          onChange={(e) => setDefaultReorderLevel(Number(e.target.value))}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-indigo-600 focus:bg-white transition-colors font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Default Sales Payment Terms</label>
                        <select
                          value={defaultPaymentTerms}
                          onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                        >
                          <option value="Net 30 Days">Net 30 Days</option>
                          <option value="Due on Receipt">Due on Receipt</option>
                          <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                          <option value="Net 60 Days">Net 60 Days</option>
                          <option value="50% Advance / 50% Delivery">50% Advance / 50% Delivery</option>
                        </select>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Tab 4: GL Account Mappings */}
              {activeTab === "accounts" && (
                <motion.div key="accounts" variants={listContainer} initial="hidden" animate="show" className="flex flex-col gap-5">
                  <GlassCard>
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-black/5">
                      <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700">
                        <BookOpen className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">Default Chart of Accounts Mappings</h3>
                        <p className="text-xs text-gray-400">Map standard transaction lines to specific ledger accounts from your Chart of Accounts.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Default Inventory Asset Account</label>
                        <select
                          value={defaultInventoryAcc}
                          onChange={(e) => setDefaultInventoryAcc(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-amber-600 focus:bg-white transition-colors"
                        >
                          <option value="">Auto Select (1410 - Stock In Hand)</option>
                          {accounts
                            .filter((a) => a.account_type === "Asset")
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} - {a.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Default Sales Revenue Account</label>
                        <select
                          value={defaultRevenueAcc}
                          onChange={(e) => setDefaultRevenueAcc(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-amber-600 focus:bg-white transition-colors"
                        >
                          <option value="">Auto Select (4000 - Sales Revenue)</option>
                          {accounts
                            .filter((a) => a.account_type === "Revenue")
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} - {a.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Default Cost of Goods Sold (COGS)</label>
                        <select
                          value={defaultCogsAcc}
                          onChange={(e) => setDefaultCogsAcc(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-amber-600 focus:bg-white transition-colors"
                        >
                          <option value="">Auto Select (5000 - Cost of Goods Sold)</option>
                          {accounts
                            .filter((a) => a.account_type === "Expense")
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} - {a.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Default Damage / Adjustment Loss Account</label>
                        <select
                          value={defaultDamageAcc}
                          onChange={(e) => setDefaultDamageAcc(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-amber-600 focus:bg-white transition-colors"
                        >
                          <option value="">Auto Select (5100 - Inventory Adjustment Loss)</option>
                          {accounts
                            .filter((a) => a.account_type === "Expense")
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} - {a.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Primary Settlement Cash / Bank Account</label>
                      <select
                        value={defaultCashAcc}
                        onChange={(e) => setDefaultCashAcc(e.target.value)}
                        className="w-full md:w-1/2 bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-amber-600 focus:bg-white transition-colors"
                      >
                        <option value="">Auto Select (1010 - Cash on Hand)</option>
                        {accounts
                          .filter((a) => a.account_type === "Asset")
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} - {a.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Tab 5: Diagnostics & Backup */}
              {activeTab === "diagnostics" && (
                <motion.div key="diagnostics" variants={listContainer} initial="hidden" animate="show" className="flex flex-col gap-5">
                  <GlassCard>
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-black/5">
                      <div className="p-2.5 rounded-2xl bg-sky-100 text-sky-700">
                        <Database className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">Database Diagnostics & JSON Export</h3>
                        <p className="text-xs text-gray-400">Download complete data backups and inspect real-time connection status.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                      <div className="p-5 rounded-2xl bg-black/[0.02] border border-black/5 flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-black mb-1">Full ERP Snapshot Export</h4>
                          <p className="text-xs text-gray-400 mb-4">
                            Generate a formatted JSON backup of all registered products, stock movements, invoices, and accounting journals.
                          </p>
                        </div>
                        <button
                          onClick={handleExportDatabase}
                          disabled={isExporting}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-black hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                          <Download className="size-4" />
                          {isExporting ? "Generating Snapshot..." : "Export Raw JSON Dump"}
                        </button>
                      </div>

                      <div className="p-5 rounded-2xl bg-black/[0.02] border border-black/5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-bold text-black">Supabase REST Connectivity</h4>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                pingStatus === "online"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : pingStatus === "checking"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              )}
                            >
                              {pingStatus}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mb-4">
                            Live round-trip ping time to data synchronization endpoints.
                          </p>
                        </div>
                        <button
                          onClick={checkDiagnostics}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-black/10 bg-white hover:bg-gray-50 text-black text-xs font-bold transition-all active:scale-95"
                        >
                          <Activity className="size-4 text-emerald-600" />
                          Test Connection Ping
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full glass-card border border-black/5 text-xs font-bold hover:bg-white text-[#505054] transition-colors h-[38px]"
              >
                <RotateCcw className="size-3.5" />
                Reset Defaults
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-black hover:bg-zinc-800 text-white text-xs font-bold active:scale-95 transition-all shadow-md h-[38px]"
              >
                {isSaved ? <Check className="size-3.5 text-green-500" /> : <Save className="size-3.5" />}
                {isSaved ? "Settings Saved" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
