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
  BookOpen,
  Save,
  RotateCcw,
  Check,
  Receipt,
  Warehouse as WarehouseIcon,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  X,
  Percent,
  MapPin,
  Tag,
  UserCheck,
  MoreVertical,
} from "lucide-react"
import { useErpStore, type Warehouse } from "@/lib/erpStore"
import { useFinanceStore, type TaxRule } from "@/lib/financeStore"
import { cn } from "@/lib/utils"
import { LoadingDots } from "@/components/ui/LoadingDots"

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
  const taxRules = finance.getTaxRules()
  const warehouses = erp.getWarehouses()

  const [activeTab, setActiveTab] = useState<"general" | "tax" | "warehouses" | "rates" | "accounts">("general")
  const [isSaved, setIsSaved] = useState(false)

  // 1. General & Entity Profile State
  const [companyName, setCompanyName] = useState(companySettings.company_name || "")
  const [tinNumber, setTinNumber] = useState(companySettings.tin_number || "")
  const [address, setAddress] = useState(companySettings.address || "")
  const [contactEmail, setContactEmail] = useState(companySettings.contact_email || "")
  const [contactPhone, setContactPhone] = useState(companySettings.contact_phone || "")
  const [baseCurrency, setBaseCurrency] = useState(companySettings.base_currency || "ETB")
  const [fiscalYearStart, setFiscalYearStart] = useState(companySettings.fiscal_year_start || "July")

  // 2. Processing & Storage Rates State
  const [procRate, setProcRate] = useState<number | "">(companySettings.processing_rate_per_quintal ?? 0)
  const [baseStorage, setBaseStorage] = useState<number | "">(companySettings.base_storage_rate_per_quintal_day ?? 0)
  const [storageIncrement, setStorageIncrement] = useState<number | "">(companySettings.storage_increment_per_month ?? 0)
  const [maxStorageMonth, setMaxStorageMonth] = useState<number | "">(companySettings.max_storage_month_cap ?? 0)
  const [storageFreeDays, setStorageFreeDays] = useState<number | "">(companySettings.storage_free_days ?? 0)

  // 3. Default GL Account Mappings State
  const [defaultInventoryAcc, setDefaultInventoryAcc] = useState(companySettings.default_inventory_account_id || "")
  const [defaultRevenueAcc, setDefaultRevenueAcc] = useState(companySettings.default_revenue_account_id || "")
  const [defaultCogsAcc, setDefaultCogsAcc] = useState(companySettings.default_cogs_account_id || "")
  const [defaultDamageAcc, setDefaultDamageAcc] = useState(companySettings.default_damage_account_id || "")
  const [defaultCashAcc, setDefaultCashAcc] = useState(companySettings.default_cash_account_id || "")

  // 4. Tax Rules Modal & Editing State
  const [taxModalOpen, setTaxModalOpen] = useState(false)
  const [editingTaxRule, setEditingTaxRule] = useState<TaxRule | null>(null)
  const [taxName, setTaxName] = useState("")
  const [taxRate, setTaxRate] = useState<number>(0)
  const [taxType, setTaxType] = useState<TaxRule["type"]>("VAT/GST")
  const [taxAccountCode, setTaxAccountCode] = useState("")
  const [taxIsInclusive, setTaxIsInclusive] = useState(false)
  const [taxDescription, setTaxDescription] = useState("")

  // 5. Warehouse Modal & Editing State
  const [whModalOpen, setWhModalOpen] = useState(false)
  const [isSavingWh, setIsSavingWh] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [whName, setWhName] = useState("")
  const [whCode, setWhCode] = useState("")
  const [whLocation, setWhLocation] = useState("")
  const [whType, setWhType] = useState("Dry Storage / Processing")
  const [whSpecialization, setWhSpecialization] = useState("Commercial & Specialty Coffee")
  const [whTargetMarkets, setWhTargetMarkets] = useState("Domestic & Export")
  const [whManager, setWhManager] = useState("")
  const [whStatus, setWhStatus] = useState("Active")
  const [activeWhMenuId, setActiveWhMenuId] = useState<string | null>(null)

  // Sync state whenever store data changes from Supabase
  useEffect(() => {
    const s = finance.getCompanySettings()
    setCompanyName(s.company_name || "")
    setTinNumber(s.tin_number || "")
    setAddress(s.address || "")
    setContactEmail(s.contact_email || "")
    setContactPhone(s.contact_phone || "")
    setBaseCurrency(s.base_currency || "ETB")
    setFiscalYearStart(s.fiscal_year_start || "July")
    setProcRate(s.processing_rate_per_quintal ?? 0)
    setBaseStorage(s.base_storage_rate_per_quintal_day ?? 0)
    setStorageIncrement(s.storage_increment_per_month ?? 0)
    setMaxStorageMonth(s.max_storage_month_cap ?? 0)
    setStorageFreeDays(s.storage_free_days ?? 0)
    setDefaultInventoryAcc(s.default_inventory_account_id || "")
    setDefaultRevenueAcc(s.default_revenue_account_id || "")
    setDefaultCogsAcc(s.default_cogs_account_id || "")
    setDefaultDamageAcc(s.default_damage_account_id || "")
    setDefaultCashAcc(s.default_cash_account_id || "")
  }, [finance])

  // Save Company & Rates Configurations to Supabase
  const handleSave = () => {
    confirm({
      title: "Save System Settings",
      message: "Persist the configured entity profile, fee rates, and ledger mappings to Supabase?",
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
          processing_rate_per_quintal: Number(procRate) || 0,
          base_storage_rate_per_quintal_day: Number(baseStorage) || 0,
          storage_increment_per_month: Number(storageIncrement) || 0,
          max_storage_month_cap: Number(maxStorageMonth) || 0,
          storage_free_days: Number(storageFreeDays) || 0,
          default_inventory_account_id: defaultInventoryAcc,
          default_revenue_account_id: defaultRevenueAcc,
          default_cogs_account_id: defaultCogsAcc,
          default_damage_account_id: defaultDamageAcc,
          default_cash_account_id: defaultCashAcc,
        }

        erp.updateCompanySettings(updated)
        setIsSaved(true)
        showToast("System Settings Saved", "success", "Configuration parameters have been synchronized with the database.")
        setTimeout(() => setIsSaved(false), 3000)
      },
    })
  }

  // Discard Unsaved Changes (revert form state back to store values)
  const handleDiscardChanges = () => {
    const s = finance.getCompanySettings()
    setCompanyName(s.company_name || "")
    setTinNumber(s.tin_number || "")
    setAddress(s.address || "")
    setContactEmail(s.contact_email || "")
    setContactPhone(s.contact_phone || "")
    setBaseCurrency(s.base_currency || "ETB")
    setFiscalYearStart(s.fiscal_year_start || "July")
    setProcRate(s.processing_rate_per_quintal ?? 0)
    setBaseStorage(s.base_storage_rate_per_quintal_day ?? 0)
    setStorageIncrement(s.storage_increment_per_month ?? 0)
    setMaxStorageMonth(s.max_storage_month_cap ?? 0)
    setStorageFreeDays(s.storage_free_days ?? 0)
    setDefaultInventoryAcc(s.default_inventory_account_id || "")
    setDefaultRevenueAcc(s.default_revenue_account_id || "")
    setDefaultCogsAcc(s.default_cogs_account_id || "")
    setDefaultDamageAcc(s.default_damage_account_id || "")
    setDefaultCashAcc(s.default_cash_account_id || "")
    showToast("Changes Discarded", "info", "Form values have been reverted to current database state.")
  }

  // --- Tax Rule Handlers ---
  const handleOpenTaxModal = (rule?: TaxRule) => {
    if (rule) {
      setEditingTaxRule(rule)
      setTaxName(rule.name)
      setTaxRate(rule.ratePercent)
      setTaxType(rule.type)
      setTaxAccountCode(rule.accountCode || "")
      setTaxIsInclusive(rule.isInclusive || false)
      setTaxDescription(rule.description || "")
    } else {
      setEditingTaxRule(null)
      setTaxName("")
      setTaxRate(15)
      setTaxType("VAT/GST")
      setTaxAccountCode("")
      setTaxIsInclusive(false)
      setTaxDescription("")
    }
    setTaxModalOpen(true)
  }

  const handleSaveTaxRule = () => {
    if (!taxName.trim()) {
      showToast("Validation Error", "warning", "Please provide a valid tax name.")
      return
    }
    if (isNaN(taxRate) || taxRate < 0) {
      showToast("Validation Error", "warning", "Tax rate percentage must be a non-negative number.")
      return
    }

    if (editingTaxRule) {
      finance.updateTaxRule(editingTaxRule.id, {
        name: taxName.trim(),
        ratePercent: Number(taxRate),
        type: taxType,
        accountCode: taxAccountCode.trim(),
        isInclusive: taxIsInclusive,
        description: taxDescription.trim(),
      })
      showToast("Tax Rate Updated", "success", `Tax rule '${taxName}' has been updated to ${taxRate}%.`)
    } else {
      finance.addTaxRule({
        name: taxName.trim(),
        ratePercent: Number(taxRate),
        type: taxType,
        accountCode: taxAccountCode.trim(),
        isInclusive: taxIsInclusive,
        description: taxDescription.trim(),
      })
      showToast("Tax Rule Created", "success", `New tax rule '${taxName}' with ${taxRate}% rate has been added.`)
    }
    setTaxModalOpen(false)
  }

  const handleDeleteTaxRule = (id: string, name: string) => {
    confirm({
      title: "Delete Tax Rule",
      message: `Are you sure you want to delete tax rule '${name}'? Existing historical invoices will retain their recorded totals.`,
      confirmLabel: "Delete Rule",
      cancelLabel: "Cancel",
      isDestructive: true,
      onConfirm: () => {
        finance.deleteTaxRule(id)
        showToast("Tax Rule Deleted", "info", `Tax rule '${name}' was removed.`)
      },
    })
  }

  // --- Warehouse Handlers ---
  const handleOpenWhModal = (wh?: Warehouse) => {
    if (wh) {
      setEditingWarehouse(wh)
      setWhName(wh.name)
      setWhCode(wh.code || wh.id)
      setWhLocation(wh.location || "")
      setWhType(wh.type || "Dry Storage / Processing")
      setWhSpecialization(wh.specialization || "Commercial & Specialty Coffee")
      setWhTargetMarkets(wh.targetMarkets || "Domestic & Export")
      setWhManager(wh.manager || "")
      setWhStatus(wh.status || "Active")
    } else {
      setEditingWarehouse(null)
      setWhName("")
      setWhCode("")
      setWhLocation("")
      setWhType("Dry Storage / Processing")
      setWhSpecialization("Commercial & Specialty Coffee")
      setWhTargetMarkets("Domestic & Export")
      setWhManager("")
      setWhStatus("Active")
    }
    setWhModalOpen(true)
  }

  const handleSaveWarehouse = async () => {
    if (!whName.trim()) {
      showToast("Validation Error", "warning", "Warehouse name is required.")
      return
    }

    try {
      setIsSavingWh(true)
      if (editingWarehouse) {
        await erp.updateWarehouse(editingWarehouse.id, {
          name: whName.trim(),
          code: whCode.trim() || editingWarehouse.id,
          location: whLocation.trim(),
          type: whType,
          specialization: whSpecialization.trim(),
          targetMarkets: whTargetMarkets.trim(),
          manager: whManager.trim() || "Unassigned",
          status: whStatus,
        })
        showToast("Warehouse Updated", "success", `Warehouse '${whName}' updated successfully.`)
      } else {
        await erp.addWarehouse({
          name: whName.trim(),
          code: whCode.trim(),
          location: whLocation.trim(),
          type: whType,
          specialization: whSpecialization.trim(),
          targetMarkets: whTargetMarkets.trim(),
          manager: whManager.trim() || "Unassigned",
          status: whStatus,
        })
        showToast("Warehouse Created", "success", `New warehouse facility '${whName}' added.`)
      }
      setWhModalOpen(false)
    } catch (err: any) {
      showToast("Save Failed", "warning", err.message || "Failed to save warehouse.")
    } finally {
      setIsSavingWh(false)
    }
  }

  const handleDeleteWarehouse = (wh: Warehouse) => {
    setActiveWhMenuId(null)

    // Prompt 1: Initial Warning Confirmation
    confirm({
      title: "Step 1 of 2: Confirm Warehouse Deletion",
      message: `Are you sure you want to request deletion of warehouse facility '${wh.name}' (${wh.code || wh.id})? This facility must have 0 active stock in inventory before it can be removed.`,
      confirmLabel: "Proceed to Final Confirmation",
      cancelLabel: "Cancel",
      isDestructive: true,
      onConfirm: () => {
        // Prompt 2: Final High-Security Confirmation
        setTimeout(() => {
          confirm({
            title: `⚠️ FINAL CONFIRMATION (Step 2 of 2): Permanent Delete`,
            message: `FINAL STEP: Are you absolutely certain you want to permanently delete '${wh.name}' (${wh.code || wh.id}) from the Supabase database? This action is irreversible.`,
            confirmLabel: "Yes, Permanently Delete Facility",
            cancelLabel: "Abort Deletion",
            isDestructive: true,
            onConfirm: async () => {
              const res = await erp.deleteWarehouse(wh.id)
              if (res.success) {
                showToast("Warehouse Deleted", "info", `Warehouse facility '${wh.name}' has been permanently deleted.`)
              } else {
                showToast("Deletion Blocked", "warning", res.error || "Could not delete warehouse.")
              }
            },
          })
        }, 150)
      },
    })
  }

  const settingsTabs = [
    { id: "general" as const, label: "Company Profile", icon: Building2, description: "Legal entity, TIN, address & currency" },
    { id: "tax" as const, label: "Tax Rates & Rules", icon: Receipt, description: "Configure VAT, withholding & customs rates" },
    { id: "warehouses" as const, label: "Warehouse Facilities", icon: WarehouseIcon, description: "Change warehouse names, codes & details" },
    { id: "rates" as const, label: "Processing & Storage", icon: SlidersHorizontal, description: "Toll fee rates & tiered monthly storage" },
    { id: "accounts" as const, label: "GL Account Mappings", icon: BookOpen, description: "Default inventory, revenue, and COGS accounts" },
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
            <p className="text-sm text-gray-500 mt-1">Configure company profile, tax rules, warehouse locations, fee schedules, and ledger mappings.</p>
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
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-sm font-semibold px-4 py-3 rounded-2xl mb-6 flex items-center gap-2 shadow-sm"
            >
              <Check className="size-4 shrink-0 text-emerald-600" />
              Configurations have been synchronized to Supabase!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layout Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Sidebar Tabs */}
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
                        <p className="text-xs text-gray-400">Configure legal enterprise metadata, tax identity, and official business contacts.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Legal Enterprise Name</label>
                        <input
                          type="text"
                          value={companyName}
                          placeholder="e.g. HKC Trading Enterprise"
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">TIN / Tax Number</label>
                        <input
                          type="text"
                          value={tinNumber}
                          placeholder="e.g. 0012345678"
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
                          placeholder="e.g. info@hkctrading.com"
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Contact Phone</label>
                        <input
                          type="text"
                          value={contactPhone}
                          placeholder="e.g. +251 11 662 4580"
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
                        placeholder="e.g. Bole Subcity, Woreda 03, Addis Ababa, Ethiopia"
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

              {/* Tab 2: Tax Rates & Rules */}
              {activeTab === "tax" && (
                <motion.div key="tax" variants={listContainer} initial="hidden" animate="show" className="flex flex-col gap-5">
                  <GlassCard>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-black/5">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700">
                          <Receipt className="size-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-black">Tax Rates & Legal Rules</h3>
                          <p className="text-xs text-gray-400">Manage statutory tax categories, tax rates, withholding thresholds, and GL account assignments.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenTaxModal()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-black hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
                      >
                        <Plus className="size-4" /> Add Tax Rule
                      </button>
                    </div>

                    {taxRules.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-black/10 rounded-2xl">
                        <Percent className="size-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-gray-500">No Tax Rules Configured</p>
                        <p className="text-xs text-gray-400 mt-1">Click &quot;Add Tax Rule&quot; to establish standard VAT or withholding tax rates.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {taxRules.map((rule) => (
                          <div
                            key={rule.id}
                            className="p-4 rounded-2xl bg-black/[0.02] border border-black/5 hover:border-black/15 transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {rule.type}
                                  </span>
                                  <h4 className="text-base font-bold text-black mt-1.5">{rule.name}</h4>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-2xl font-black text-black tracking-tight">{rule.ratePercent}%</span>
                                  <p className="text-[10px] font-semibold text-gray-400">{rule.isInclusive ? "Tax Inclusive" : "Tax Exclusive"}</p>
                                </div>
                              </div>
                              {rule.description && <p className="text-xs text-gray-500 mb-3">{rule.description}</p>}
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2 pt-2 border-t border-black/5 font-mono">
                                <span>GL Account:</span>
                                <span className="font-bold text-black">{rule.accountCode || "Default Tax Ledger"}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-black/5">
                              <button
                                onClick={() => handleOpenTaxModal(rule)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-black/10 bg-white hover:bg-gray-50 text-black text-xs font-semibold transition-all"
                              >
                                <Pencil className="size-3.5" /> Edit Rate
                              </button>
                              <button
                                onClick={() => handleDeleteTaxRule(rule.id, rule.name)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-all"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {/* Tab 3: Warehouse Facilities */}
              {activeTab === "warehouses" && (
                <motion.div key="warehouses" variants={listContainer} initial="hidden" animate="show" className="flex flex-col gap-5">
                  <GlassCard>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-black/5">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700">
                          <WarehouseIcon className="size-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-black">Warehouse & Processing Facilities</h3>
                          <p className="text-xs text-gray-400">Change facility names, assign managers, modify physical locations, and manage storage hubs.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenWhModal()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-black hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
                      >
                        <Plus className="size-4" /> Add Warehouse
                      </button>
                    </div>

                    {warehouses.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-black/10 rounded-2xl">
                        <WarehouseIcon className="size-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-gray-500">No Warehouse Facilities</p>
                        <p className="text-xs text-gray-400 mt-1">Click &quot;Add Warehouse&quot; to establish an active storage or processing depot.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {warehouses.map((wh) => (
                          <div
                            key={wh.id}
                            className="p-5 rounded-2xl bg-black/[0.02] border border-black/5 hover:border-black/15 transition-all flex flex-col justify-between relative"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black text-white font-mono">
                                      {wh.code || wh.id}
                                    </span>
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                        wh.status === "Active"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-zinc-100 text-zinc-600 border-zinc-200"
                                      )}
                                    >
                                      {wh.status || "Active"}
                                    </span>
                                  </div>
                                  <h4 className="text-base font-bold text-black mt-2">{wh.name}</h4>
                                </div>

                                {/* 3-Dots Action Menu */}
                                <div className="relative">
                                  <button
                                    onClick={() => setActiveWhMenuId(activeWhMenuId === wh.id ? null : wh.id)}
                                    className="p-1.5 rounded-xl hover:bg-black/5 text-gray-400 hover:text-black transition-colors"
                                    title="More Options"
                                  >
                                    <MoreVertical className="size-4" />
                                  </button>

                                  <AnimatePresence>
                                    {activeWhMenuId === wh.id && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-20"
                                          onClick={() => setActiveWhMenuId(null)}
                                        />
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                          className="absolute right-0 top-8 z-30 w-48 bg-white rounded-2xl shadow-xl border border-black/10 p-1.5 flex flex-col gap-1"
                                        >
                                          <button
                                            onClick={() => {
                                              setActiveWhMenuId(null)
                                              handleOpenWhModal(wh)
                                            }}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-black hover:bg-black/[0.04] rounded-xl transition-colors text-left"
                                          >
                                            <Pencil className="size-3.5 text-gray-500" /> Edit Parameters
                                          </button>
                                          <div className="h-px bg-black/5 my-0.5" />
                                          <button
                                            onClick={() => handleDeleteWarehouse(wh)}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
                                          >
                                            <Trash2 className="size-3.5 text-rose-600" /> Delete Facility...
                                          </button>
                                        </motion.div>
                                      </>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>

                              <div className="space-y-2 mt-3 text-xs">
                                <div className="flex items-center gap-2 text-gray-500">
                                  <MapPin className="size-3.5 text-gray-400 shrink-0" />
                                  <span className="truncate">{wh.location || "Location not specified"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500">
                                  <Tag className="size-3.5 text-gray-400 shrink-0" />
                                  <span className="truncate">{wh.specialization || wh.type || "Dry Storage / Processing"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500">
                                  <UserCheck className="size-3.5 text-gray-400 shrink-0" />
                                  <span>Manager: <strong className="text-black font-semibold">{wh.manager || "Unassigned"}</strong></span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-black/5">
                              <span className="text-[11px] text-gray-400 font-mono">ID: {wh.id}</span>
                              <button
                                onClick={() => handleOpenWhModal(wh)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-black/10 bg-white hover:bg-gray-50 text-black text-xs font-semibold transition-all shadow-2xs"
                              >
                                <Pencil className="size-3.5" /> Edit Warehouse
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {/* Tab 4: Processing & Storage Rates */}
              {activeTab === "rates" && (
                <motion.div key="rates" variants={listContainer} initial="hidden" animate="show" className="flex flex-col gap-5">
                  <GlassCard>
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-black/5">
                      <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
                        <SlidersHorizontal className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">Processing Services & Storage Fee Rates</h3>
                        <p className="text-xs text-gray-400">Configure global toll processing fee rates and monthly tiered storage fee schedules.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Processing Rate (ETB / Quintal)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={procRate}
                          placeholder="0.00"
                          onChange={(e) => setProcRate(e.target.value === "" ? "" : Number(e.target.value))}
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
                          placeholder="0.00"
                          onChange={(e) => setBaseStorage(e.target.value === "" ? "" : Number(e.target.value))}
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
                          placeholder="0.00"
                          onChange={(e) => setStorageIncrement(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors font-mono"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Automatic fee addition applied for each month goods remain stored.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">Max Storage Month Cap (Months)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={maxStorageMonth}
                          placeholder="0"
                          onChange={(e) => setMaxStorageMonth(e.target.value === "" ? "" : Number(e.target.value))}
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
                        placeholder="0"
                        onChange={(e) => setStorageFreeDays(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full md:w-1/2 bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-3 text-sm font-semibold text-black outline-none focus:border-emerald-600 focus:bg-white transition-colors font-mono"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Initial grace window before storage fees begin accruing.</p>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Tab 5: GL Account Mappings */}
              {activeTab === "accounts" && (
                <motion.div key="accounts" variants={listContainer} initial="hidden" animate="show" className="flex flex-col gap-5">
                  <GlassCard>
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-black/5">
                      <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700">
                        <BookOpen className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">Default Chart of Accounts Mappings</h3>
                        <p className="text-xs text-gray-400">Map standard business transactions to specific accounts from your Chart of Accounts.</p>
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
                          <option value="">Select Ledger Account...</option>
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
                          <option value="">Select Ledger Account...</option>
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
                          <option value="">Select Ledger Account...</option>
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
                          <option value="">Select Ledger Account...</option>
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
                        <option value="">Select Ledger Account...</option>
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
            </AnimatePresence>

            {/* Bottom Action Buttons (for tabs with general form inputs) */}
            {["general", "rates", "accounts"].includes(activeTab) && (
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={handleDiscardChanges}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full glass-card border border-black/5 text-xs font-bold hover:bg-white text-[#505054] transition-colors h-[38px]"
                >
                  <RotateCcw className="size-3.5" />
                  Discard Changes
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-black hover:bg-zinc-800 text-white text-xs font-bold active:scale-95 transition-all shadow-md h-[38px]"
                >
                  {isSaved ? <Check className="size-3.5 text-emerald-400" /> : <Save className="size-3.5" />}
                  {isSaved ? "Settings Saved" : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Modal: Add/Edit Tax Rule */}
      <AnimatePresence>
        {taxModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-black/10"
            >
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                    <Receipt className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-black">
                      {editingTaxRule ? "Edit Tax Rule" : "Add New Tax Rule"}
                    </h3>
                    <p className="text-xs text-gray-400">Configure tax rates and statutory categories</p>
                  </div>
                </div>
                <button
                  onClick={() => setTaxModalOpen(false)}
                  className="p-2 rounded-full hover:bg-black/5 text-gray-400 hover:text-black transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Tax Name</label>
                  <input
                    type="text"
                    value={taxName}
                    placeholder="e.g. Standard VAT (15%)"
                    onChange={(e) => setTaxName(e.target.value)}
                    className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-2.5 text-sm font-semibold text-black outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Tax Type</label>
                  <select
                    value={taxType}
                    onChange={(e) => setTaxType(e.target.value as TaxRule["type"])}
                    className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-2.5 text-sm font-semibold text-black outline-none focus:border-indigo-600 focus:bg-white"
                  >
                    <option value="VAT/GST">VAT / GST</option>
                    <option value="Withholding Tax (TDS)">Withholding Tax (TDS)</option>
                    <option value="Import Duty">Import Duty</option>
                  </select>
                </div>

                {/* Horizontal Scroll / Slider Bar for Tax Percentage */}
                <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-black uppercase tracking-wider">
                        Tax Rate Percentage
                      </label>
                      <p className="text-[11px] text-gray-400">Slide or scroll to select exact rate with decimals.</p>
                    </div>
                    <div className="flex items-center bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-2xl shadow-xs">
                      <span className="text-xl font-black text-indigo-700 font-mono tracking-tight">
                        {Number(taxRate || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Range Slider Track */}
                  <div className="relative pt-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={taxRate || 0}
                      onChange={(e) => setTaxRate(Math.round(Number(e.target.value) * 10) / 10)}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                      style={{
                        background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${Math.min(100, Math.max(0, taxRate || 0))}%, #e5e7eb ${Math.min(100, Math.max(0, taxRate || 0))}%, #e5e7eb 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-mono mt-1 px-0.5">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Preset Quick Buttons & Exact Number Input */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Presets:</span>
                      {[0, 2, 5, 10, 15, 30].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTaxRate(preset)}
                          className={cn(
                            "px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-colors border",
                            Number(taxRate) === preset
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-white text-gray-600 border-black/10 hover:border-black/30 hover:bg-gray-50"
                          )}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400 font-semibold mr-1">Exact:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value === "" ? 0 : Math.round(Number(e.target.value) * 10) / 10)}
                        className="w-20 bg-white border border-black/10 rounded-xl px-2.5 py-1 text-xs font-bold text-black font-mono text-right outline-none focus:border-indigo-600 shadow-2xs"
                      />
                      <span className="text-xs font-bold text-gray-500 font-mono">%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">GL Account Code</label>
                  <select
                    value={taxAccountCode}
                    onChange={(e) => setTaxAccountCode(e.target.value)}
                    className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-2.5 text-sm font-semibold text-black outline-none focus:border-indigo-600 focus:bg-white"
                  >
                    <option value="">Select Ledger Account...</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.code}>
                        {a.code} - {a.name} ({a.account_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/[0.02] border border-black/5">
                  <div>
                    <p className="text-xs font-bold text-black">Tax Inclusivity</p>
                    <p className="text-[11px] text-gray-400">Check if sales/purchase prices already include this tax.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={taxIsInclusive}
                    onChange={(e) => setTaxIsInclusive(e.target.checked)}
                    className="size-4 rounded accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Description (Optional)</label>
                  <input
                    type="text"
                    value={taxDescription}
                    placeholder="e.g. Standard 15% value added tax for all commercial commodities"
                    onChange={(e) => setTaxDescription(e.target.value)}
                    className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-2.5 text-sm font-semibold text-black outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-black/5">
                <button
                  onClick={() => setTaxModalOpen(false)}
                  className="px-4 py-2 rounded-2xl border border-black/10 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTaxRule}
                  className="px-5 py-2 rounded-2xl bg-black text-white text-xs font-bold hover:bg-zinc-800 shadow-md"
                >
                  {editingTaxRule ? "Update Tax Rate" : "Save Tax Rule"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Add/Edit Warehouse */}
      <AnimatePresence>
        {whModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-black/10"
            >
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                    <WarehouseIcon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-black">
                      {editingWarehouse ? "Edit Warehouse Facility" : "Add Warehouse Facility"}
                    </h3>
                    <p className="text-xs text-gray-400">Manage storage depot details and location parameters</p>
                  </div>
                </div>
                <button
                  onClick={() => setWhModalOpen(false)}
                  className="p-2 rounded-full hover:bg-black/5 text-gray-400 hover:text-black transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Warehouse Name</label>
                    <input
                      type="text"
                      value={whName}
                      placeholder="e.g. Central Processing Depot"
                      onChange={(e) => setWhName(e.target.value)}
                      className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-2.5 text-sm font-semibold text-black outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Facility Code</label>
                    <input
                      type="text"
                      value={whCode}
                      placeholder="e.g. WH-01"
                      onChange={(e) => setWhCode(e.target.value)}
                      className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-2.5 text-sm font-semibold text-black outline-none focus:border-amber-600 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Physical Location / Address</label>
                  <input
                    type="text"
                    value={whLocation}
                    placeholder="e.g. Kality Industrial Zone, Addis Ababa"
                    onChange={(e) => setWhLocation(e.target.value)}
                    className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-2.5 text-sm font-semibold text-black outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Facility Type</label>
                    <select
                      value={whType}
                      onChange={(e) => setWhType(e.target.value)}
                      className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-2.5 text-sm font-semibold text-black outline-none focus:border-amber-600 focus:bg-white"
                    >
                      <option value="Dry Storage / Processing">Dry Storage / Processing</option>
                      <option value="Bonded Export Warehouse">Bonded Export Warehouse</option>
                      <option value="Regional Transit Depot">Regional Transit Depot</option>
                      <option value="Cold / Climate Controlled">Cold / Climate Controlled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Operational Status</label>
                    <select
                      value={whStatus}
                      onChange={(e) => setWhStatus(e.target.value)}
                      className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-2.5 text-sm font-semibold text-black outline-none focus:border-amber-600 focus:bg-white"
                    >
                      <option value="Active">Active</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Facility Specialization</label>
                    <input
                      type="text"
                      value={whSpecialization}
                      placeholder="e.g. Export Grade 1 & 2 Coffee"
                      onChange={(e) => setWhSpecialization(e.target.value)}
                      className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-2.5 text-sm font-semibold text-black outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">Assigned Manager</label>
                    <input
                      type="text"
                      value={whManager}
                      placeholder="e.g. Dawit Tadesse"
                      onChange={(e) => setWhManager(e.target.value)}
                      className="w-full bg-black/[0.02] border border-black/10 rounded-2xl px-4 py-2.5 text-sm font-semibold text-black outline-none focus:border-amber-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-black/5">
                <button
                  type="button"
                  disabled={isSavingWh}
                  onClick={() => setWhModalOpen(false)}
                  className="px-4 py-2 rounded-2xl border border-black/10 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingWh}
                  onClick={handleSaveWarehouse}
                  className="min-w-[130px] inline-flex items-center justify-center px-5 py-2 rounded-2xl bg-black text-white text-xs font-bold hover:bg-zinc-800 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSavingWh ? <LoadingDots color="bg-white" size="sm" /> : (editingWarehouse ? "Save Changes" : "Create Warehouse")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
