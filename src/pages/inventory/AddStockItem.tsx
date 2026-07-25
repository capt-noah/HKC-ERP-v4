import { useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  PackagePlus,
  Save,
  Send,
  Upload,
  X,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useErpStore, type Product } from "@/lib/erpStore"
import { useFinanceStore } from "@/lib/financeStore"
import { useFeedback } from "@/context/FeedbackContext"

type SaveMode = "draft" | "save" | "another" | "submit"
type FormStep = "item" | "stock" | "accounts" | "settings"

const itemCategories = ["Medicine", "Medical Equipment", "Consumable", "Chemical", "General Stock"]
const itemTypes = ["Finished Product", "Raw Material", "Consumable", "Spare Part", "Other"]
const packagingUnits = ["Boxes", "Bottles", "Bottle", "Vial", "Pack", "Carton", "Pieces", "Kilogram", "Liter", "Other"]
const warehouses = [
  { id: "WH1", label: "Warehouse 1" },
  { id: "WH2", label: "Warehouse 2" },
  { id: "WH3", label: "Warehouse 3" },
]
const alertPeriods = ["30 days before", "60 days before", "90 days before", "180 days before"]
const taxCategories = ["Tax Exempt", "Standard VAT", "Zero Rated", "Custom"]

const excelColumns = [
  "Description of Goods",
  "Packaging Unit",
  "Batch Number",
  "Manufacturing Date",
  "Expiry Date",
  "Quantity Per Pack",
  "Number of Cartons",
  "Total Quantity",
  "Quantity Sold",
  "Balance",
]

const previewRows = [
  { description: "Oxytetracycline 20% LA Injectable", batch: "B-OXY-IND-99", cartons: 12.5, balance: 1250, status: "Ready" },
  { description: "Amoxicillin Soluble Powder", batch: "B-AMX-CHN-88", cartons: 8, balance: 780, status: "Duplicate batch" },
  { description: "Sterile Vial Pack", batch: "", cartons: 4, balance: 400, status: "Missing batch" },
]

const formSteps: Array<{ id: FormStep; label: string; helper: string }> = [
  { id: "item", label: "Item", helper: "Name, SKU, package" },
  { id: "stock", label: "Stock", helper: "Batch, expiry, balance" },
  { id: "accounts", label: "Accounts", helper: "GL mapping" },
  { id: "settings", label: "Settings", helper: "Tracking and files" },
]

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", maximumFractionDigits: 2 }).format(value)
}

function formatMonth(value: string) {
  if (!value) return "Not set"
  const [year, month] = value.split("-").map(Number)
  if (!year || !month) return value
  return new Date(year, month - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", "-")
}

function monthsBetween(start: string, end: string) {
  if (!start || !end) return 0
  const [startYear, startMonth] = start.split("-").map(Number)
  const [endYear, endMonth] = end.split("-").map(Number)
  if (!startYear || !startMonth || !endYear || !endMonth) return 0
  return (endYear - startYear) * 12 + (endMonth - startMonth)
}

function badgeClass(value: string) {
  if (["In Stock", "Mapped"].includes(value)) return "bg-emerald-50 text-emerald-800 border-emerald-200"
  if (["Low Stock", "Not Mapped"].includes(value)) return "bg-amber-50 text-amber-800 border-amber-200"
  if (value === "Out of Stock") return "bg-rose-50 text-rose-800 border-rose-200"
  return "bg-zinc-100 text-zinc-700 border-zinc-200"
}

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-wide text-zinc-700">
      {children} {required && <span className="text-rose-600">*</span>}
    </label>
  )
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <GlassCard className="bg-white/92 border border-white/80 shadow-md rounded-2xl p-5">
      <h2 className="text-sm font-black text-zinc-950 tracking-tight mb-4">{title}</h2>
      {children}
    </GlassCard>
  )
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left transition hover:border-emerald-300"
    >
      <span className="text-xs font-bold text-zinc-700">{label}</span>
      <span className={`h-5 w-9 rounded-full p-0.5 transition ${value ? "bg-emerald-600" : "bg-zinc-200"}`}>
        <span className={`block size-4 rounded-full bg-white shadow-sm transition ${value ? "translate-x-4" : ""}`} />
      </span>
    </button>
  )
}

export default function AddStockItem() {
  const navigate = useNavigate()
  const erp = useErpStore()
  const finance = useFinanceStore()
  const { showToast, confirm } = useFeedback()
  const products = erp.getProducts()
  const accounts = finance.getAccounts()

  const inventoryAccounts = accounts.filter((account) => account.account_type === "Asset")
  const expenseAccounts = accounts.filter((account) => account.account_type === "Expense")
  const revenueAccounts = accounts.filter((account) => account.account_type === "Revenue")

  const [descriptionOfGoods, setDescriptionOfGoods] = useState("")
  const [itemCode, setItemCode] = useState("")
  const [category, setCategory] = useState("Medicine")
  const [itemType, setItemType] = useState("Finished Product")
  const [description, setDescription] = useState("")
  const [packagingUnit, setPackagingUnit] = useState("Boxes")
  const [quantityPerPack, setQuantityPerPack] = useState("")
  const [numberOfCartons, setNumberOfCartons] = useState("")
  const [minimumStockLevel, setMinimumStockLevel] = useState("0")
  const [reorderQuantity, setReorderQuantity] = useState("")
  const [batchNumber, setBatchNumber] = useState("")
  const [manufacturingDate, setManufacturingDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [expiryAlertEnabled, setExpiryAlertEnabled] = useState(true)
  const [alertPeriod, setAlertPeriod] = useState("90 days before")
  const [warehouse, setWarehouse] = useState("WH1")
  const [openingTotalOverride, setOpeningTotalOverride] = useState("")
  const [quantitySold, setQuantitySold] = useState("0")
  const [unitCost, setUnitCost] = useState("")
  const [inventoryAssetAccount, setInventoryAssetAccount] = useState("")
  const [cogsAccount, setCogsAccount] = useState("")
  const [revenueAccount, setRevenueAccount] = useState("")
  const [damageExpenseAccount, setDamageExpenseAccount] = useState("")
  const [taxCategory, setTaxCategory] = useState("Standard VAT")
  const [trackBatchNumber, setTrackBatchNumber] = useState(true)
  const [trackManufacturingDate, setTrackManufacturingDate] = useState(true)
  const [trackExpiryDate, setTrackExpiryDate] = useState(true)
  const [trackSerialNumber, setTrackSerialNumber] = useState(false)
  const [allowDecimalCartons, setAllowDecimalCartons] = useState(true)
  const [preventNegativeStock, setPreventNegativeStock] = useState(true)
  const [requireApproval, setRequireApproval] = useState(false)
  const [productImageName, setProductImageName] = useState("")
  const [supportingDocumentName, setSupportingDocumentName] = useState("")
  const [internalNotes, setInternalNotes] = useState("")
  const [showImport, setShowImport] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeStep, setActiveStep] = useState<FormStep>("item")

  const calculatedTotalQuantity = useMemo(() => {
    return Number(quantityPerPack || 0) * Number(numberOfCartons || 0)
  }, [quantityPerPack, numberOfCartons])
  const openingTotalQuantity = Number(openingTotalOverride || calculatedTotalQuantity || 0)
  const soldQuantity = Number(quantitySold || 0)
  const openingBalance = openingTotalQuantity - soldQuantity
  const totalStockValue = openingBalance * Number(unitCost || 0)
  const shelfLifeMonths = monthsBetween(manufacturingDate, expiryDate)
  const dateInvalid = Boolean(manufacturingDate && expiryDate && shelfLifeMonths <= 0)
  const duplicateBatch = products.some(
    (product) => product.sku.toLowerCase() === itemCode.toLowerCase() && product.batch.toLowerCase() === batchNumber.toLowerCase() && product.warehouse === warehouse
  )
  const expiryNear = shelfLifeMonths > 0 && shelfLifeMonths <= 6
  const stockStatus: Product["status"] = openingBalance <= 0 ? "Out of Stock" : openingBalance <= Number(minimumStockLevel || 0) ? "Low Stock" : requireApproval ? "Pending QA" : "In Stock"
  const glMapped = Boolean(inventoryAssetAccount && cogsAccount && revenueAccount && damageExpenseAccount)
  const hasRequiredFields = Boolean(descriptionOfGoods && itemCode && category && packagingUnit && quantityPerPack && numberOfCartons && batchNumber && manufacturingDate && expiryDate && warehouse && unitCost)
  const canSave = hasRequiredFields && !dateInvalid && openingBalance >= 0 && !duplicateBatch

  const resetForm = () => {
    setDescriptionOfGoods("")
    setItemCode("")
    setCategory("Medicine")
    setItemType("Finished Product")
    setDescription("")
    setPackagingUnit("Boxes")
    setQuantityPerPack("")
    setNumberOfCartons("")
    setMinimumStockLevel("0")
    setReorderQuantity("")
    setBatchNumber("")
    setManufacturingDate("")
    setExpiryDate("")
    setExpiryAlertEnabled(true)
    setAlertPeriod("90 days before")
    setWarehouse("WH1")
    setOpeningTotalOverride("")
    setQuantitySold("0")
    setUnitCost("")
    setInventoryAssetAccount("")
    setCogsAccount("")
    setRevenueAccount("")
    setDamageExpenseAccount("")
    setTaxCategory("Standard VAT")
    setInternalNotes("")
    setProductImageName("")
    setSupportingDocumentName("")
  }

  const handleGenerateCode = () => {
    const prefix = category.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "STK")
    setItemCode(`${prefix}-${String(products.length + 1).padStart(4, "0")}`)
  }

  const saveItem = async (mode: SaveMode) => {
    if (!canSave) {
      showToast("Cannot save item", "warning", "Complete required fields and resolve validation warnings first.")
      return
    }

    const product: Product = {
      id: `P-${Date.now()}`,
      name: descriptionOfGoods,
      sku: itemCode,
      category,
      itemType,
      description,
      warehouse,
      warehouseName: warehouses.find((item) => item.id === warehouse)?.label,
      quantity: openingBalance,
      quantityPerPack: Number(quantityPerPack),
      numberOfCartons: Number(numberOfCartons),
      totalQuantity: openingTotalQuantity,
      quantitySold: soldQuantity,
      openingBalance,
      reorderLevel: Number(minimumStockLevel || 0),
      reorderQuantity: Number(reorderQuantity || 0),
      valuationRate: Number(unitCost || 0),
      unit: packagingUnit,
      unitCost: Number(unitCost || 0),
      totalStockValue,
      sellingPrice: Number(unitCost || 0),
      batch: batchNumber,
      manufacturingDate,
      expiry: expiryDate,
      shelfLifeMonths,
      expiryAlertEnabled,
      expiryAlertPeriod: alertPeriod,
      status: stockStatus,
      stockBreakdown: [{ warehouse, qty: openingBalance }],
      batches: [{ batchNo: batchNumber, qty: openingBalance, expiry: expiryDate, status: "Released" }],
      origin: warehouse,
      supplierName: "Opening Stock Registration",
      inventoryAssetAccount,
      cogsAccount,
      revenueAccount,
      damageExpenseAccount,
      taxCategory,
      trackBatchNumber,
      trackManufacturingDate,
      trackExpiryDate,
      trackSerialNumber,
      allowDecimalCartons,
      preventNegativeStock,
      requireApprovalBeforeActivation: requireApproval,
      productImageName,
      supportingDocumentName,
      internalNotes,
      itemRegistrationStatus: mode === "draft" ? "Draft" : mode === "submit" ? "Submitted" : "Active",
      approvalStatus: mode === "submit" ? "Submitted" : "Not Submitted",
      createdBy: "Current User",
      createdDate: new Date().toISOString().split("T")[0],
    }

    setIsSaving(true)
    try {
      await erp.addProduct(product)
      showToast("Item registered successfully", "success", `${descriptionOfGoods} has been saved to Supabase inventory products.`)
    } catch (error) {
      showToast("Supabase save failed", "warning", error instanceof Error ? error.message : "The item could not be saved to Supabase.")
      setIsSaving(false)
      return
    }
    setIsSaving(false)

    if (mode === "another") {
      resetForm()
      return
    }

    navigate("/inventory/stock")
  }

  const cancel = () => {
    if (descriptionOfGoods || itemCode || batchNumber || quantityPerPack || numberOfCartons) {
      confirm({
        title: "Leave Add Item?",
        message: "This item has unsaved changes. Leaving now will discard the registration form.",
        confirmLabel: "Discard",
        cancelLabel: "Stay",
        isDestructive: true,
        onConfirm: () => navigate("/inventory/stock"),
      })
      return
    }
    navigate("/inventory/stock")
  }

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />

      <main className="max-w-[98%] mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-28">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="rounded-2xl border border-emerald-100 bg-white/85 px-4 py-3 shadow-sm">
            <p className="text-xs font-black text-zinc-950">Current warehouse</p>
            <p className="mt-0.5 text-[11px] font-bold text-zinc-500">{warehouses.find((item) => item.id === warehouse)?.label}</p>
          </div>
          <SubPageNav items={getSectionChildren("/inventory")} />
        </div>

        <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-black text-zinc-500">Inventory / Stock / Add Item</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-black">Add New Stock Item</h1>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                New Stock Registration
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-xs font-semibold leading-relaxed text-zinc-500">
              Register a new item, batch, packaging information, manufacturing date, expiry date, and opening stock.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowImport(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-black text-zinc-800 shadow-sm hover:bg-zinc-50">
              <FileSpreadsheet className="size-4" /> Import from Excel
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-black text-zinc-800 shadow-sm hover:bg-zinc-50">
              <Download className="size-4" /> Download Template
            </button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
            <GlassCard className="rounded-2xl border border-white/80 bg-white/95 p-2 shadow-md">
              <div className="grid gap-2 md:grid-cols-4">
                {formSteps.map((step) => {
                  const isActive = activeStep === step.id
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveStep(step.id)}
                      className={`rounded-xl px-4 py-3 text-left transition ${
                        isActive ? "bg-zinc-950 text-white shadow-md" : "text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="block text-xs font-black">{step.label}</span>
                      <span className={`mt-0.5 block text-[10px] font-bold ${isActive ? "text-zinc-300" : "text-zinc-400"}`}>{step.helper}</span>
                    </button>
                  )
                })}
              </div>
            </GlassCard>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="space-y-5"
              >
            {activeStep === "item" && (
              <>
            <SectionCard title="Item Information">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 space-y-1.5">
                  <FieldLabel required>Description of Goods</FieldLabel>
                  <input value={descriptionOfGoods} onChange={(event) => setDescriptionOfGoods(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" placeholder="Enter product or item name" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel required>Item Code</FieldLabel>
                  <div className="flex gap-2">
                    <input value={itemCode} onChange={(event) => setItemCode(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" placeholder="Enter item code or SKU" />
                    <button type="button" onClick={handleGenerateCode} className="h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-800 hover:bg-emerald-100">Generate Code</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel required>Category</FieldLabel>
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500">
                    {itemCategories.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Item Type</FieldLabel>
                  <select value={itemType} onChange={(event) => setItemType(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500">
                    {itemTypes.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <FieldLabel>Description</FieldLabel>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 w-full rounded-xl border border-zinc-200 p-3 text-sm font-semibold outline-none focus:border-emerald-500" placeholder="Optional notes about item grade, source, specification, or handling." />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Packaging Information">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <FieldLabel required>Packaging Unit</FieldLabel>
                  <select value={packagingUnit} onChange={(event) => setPackagingUnit(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500">
                    {packagingUnits.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel required>Quantity Per Pack</FieldLabel>
                  <input type="number" min="0" value={quantityPerPack} onChange={(event) => setQuantityPerPack(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" placeholder="100" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel required>Number of Cartons</FieldLabel>
                  <input type="number" min="0" step="0.01" value={numberOfCartons} onChange={(event) => setNumberOfCartons(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" placeholder="10" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Total Quantity</FieldLabel>
                  <div className="relative">
                    <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-emerald-700" />
                    <input readOnly value={calculatedTotalQuantity.toLocaleString()} className="h-11 w-full rounded-xl border border-emerald-200 bg-emerald-50 pl-9 pr-3 text-sm font-black text-emerald-900" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Minimum Stock Level</FieldLabel>
                  <input type="number" min="0" value={minimumStockLevel} onChange={(event) => setMinimumStockLevel(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Reorder Quantity</FieldLabel>
                  <input type="number" min="0" value={reorderQuantity} onChange={(event) => setReorderQuantity(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" />
                </div>
              </div>
            </SectionCard>
              </>
            )}

            {activeStep === "stock" && (
              <>
            <SectionCard title="Batch and Expiry Information">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <FieldLabel required>Batch Number</FieldLabel>
                  <input value={batchNumber} onChange={(event) => setBatchNumber(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" placeholder="Enter batch number" />
                  {duplicateBatch && <p className="text-[11px] font-bold text-amber-700">This batch already exists for this item and warehouse.</p>}
                </div>
                <div className="space-y-1.5">
                  <FieldLabel required>Manufacturing Date</FieldLabel>
                  <input type="month" value={manufacturingDate} onChange={(event) => setManufacturingDate(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel required>Expiry Date</FieldLabel>
                  <input type="month" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" />
                  {dateInvalid && <p className="text-[11px] font-bold text-rose-700">Expiry date must be later than manufacturing date.</p>}
                  {expiryNear && <p className="text-[11px] font-bold text-amber-700">Expiry date is near for a new registration.</p>}
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[10px] font-black uppercase text-zinc-500">Shelf Life</p>
                  <p className="mt-1 text-sm font-black text-zinc-950">{shelfLifeMonths > 0 ? `${shelfLifeMonths} months` : "Not calculated"}</p>
                </div>
                <ToggleRow label="Notify before expiry" value={expiryAlertEnabled} onChange={setExpiryAlertEnabled} />
                <div className="space-y-1.5">
                  <FieldLabel>Alert Period</FieldLabel>
                  <select value={alertPeriod} onChange={(event) => setAlertPeriod(event.target.value)} disabled={!expiryAlertEnabled} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none disabled:bg-zinc-100 disabled:text-zinc-400 focus:border-emerald-500">
                    {alertPeriods.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Opening Stock">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <FieldLabel required>Warehouse</FieldLabel>
                  <select value={warehouse} onChange={(event) => setWarehouse(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500">
                    {warehouses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Opening Total Quantity</FieldLabel>
                  <input type="number" min="0" value={openingTotalOverride} onChange={(event) => setOpeningTotalOverride(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" placeholder={String(calculatedTotalQuantity || 0)} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Quantity Sold</FieldLabel>
                  <input type="number" min="0" value={quantitySold} onChange={(event) => setQuantitySold(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" />
                  <p className="text-[10px] font-semibold text-zinc-500">Use this only when importing existing historical stock.</p>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Opening Balance</FieldLabel>
                  <input readOnly value={openingBalance.toLocaleString()} className={`h-11 w-full rounded-xl border px-3 text-sm font-black ${openingBalance < 0 ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`} />
                  {openingBalance < 0 && <p className="text-[11px] font-bold text-rose-700">Opening balance cannot be negative.</p>}
                </div>
                <div className="space-y-1.5">
                  <FieldLabel required>Unit Cost</FieldLabel>
                  <input type="number" min="0" step="0.01" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500" placeholder="0.00" />
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[10px] font-black uppercase text-zinc-500">Total Stock Value</p>
                  <p className="mt-1 text-sm font-black text-zinc-950">{formatMoney(totalStockValue)}</p>
                </div>
              </div>
            </SectionCard>
              </>
            )}

            {activeStep === "accounts" && (
            <SectionCard title="Accounting Information">
              <div className="grid gap-4 md:grid-cols-2">
                <select value={inventoryAssetAccount} onChange={(event) => setInventoryAssetAccount(event.target.value)} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500">
                  <option value="">Inventory Asset Account</option>
                  {inventoryAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}
                </select>
                <select value={cogsAccount} onChange={(event) => setCogsAccount(event.target.value)} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500">
                  <option value="">Cost of Goods Sold Account</option>
                  {expenseAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}
                </select>
                <select value={revenueAccount} onChange={(event) => setRevenueAccount(event.target.value)} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500">
                  <option value="">Sales Revenue Account</option>
                  {revenueAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}
                </select>
                <select value={damageExpenseAccount} onChange={(event) => setDamageExpenseAccount(event.target.value)} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500">
                  <option value="">Inventory Damage Expense Account</option>
                  {expenseAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}
                </select>
                <select value={taxCategory} onChange={(event) => setTaxCategory(event.target.value)} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500">
                  {taxCategories.map((item) => <option key={item}>{item}</option>)}
                </select>
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
                  <AlertTriangle className="size-4 shrink-0" />
                  Accounting mappings will be used when stock is purchased, sold, returned, damaged, or adjusted.
                </div>
              </div>
            </SectionCard>
            )}

            {activeStep === "settings" && (
            <SectionCard title="Additional Settings">
              <div className="grid gap-3 md:grid-cols-3">
                <ToggleRow label="Track Batch Number" value={trackBatchNumber} onChange={setTrackBatchNumber} />
                <ToggleRow label="Track Manufacturing Date" value={trackManufacturingDate} onChange={setTrackManufacturingDate} />
                <ToggleRow label="Track Expiry Date" value={trackExpiryDate} onChange={setTrackExpiryDate} />
                <ToggleRow label="Track Serial Number" value={trackSerialNumber} onChange={setTrackSerialNumber} />
                <ToggleRow label="Allow Decimal Cartons" value={allowDecimalCartons} onChange={setAllowDecimalCartons} />
                <ToggleRow label="Prevent Negative Stock" value={preventNegativeStock} onChange={setPreventNegativeStock} />
                <ToggleRow label="Require Approval Before Stock Activation" value={requireApproval} onChange={setRequireApproval} />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-xs font-bold text-zinc-600">
                  <Upload className="mb-2 size-4 text-zinc-500" /> Upload Product Image
                  <input type="file" className="mt-2 block text-[11px]" onChange={(event) => setProductImageName(event.target.files?.[0]?.name || "")} />
                </label>
                <label className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-xs font-bold text-zinc-600">
                  <Upload className="mb-2 size-4 text-zinc-500" /> Upload Supporting Document
                  <input type="file" className="mt-2 block text-[11px]" onChange={(event) => setSupportingDocumentName(event.target.files?.[0]?.name || "")} />
                </label>
                <textarea value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} className="md:col-span-2 min-h-24 rounded-xl border border-zinc-200 p-3 text-sm font-semibold outline-none focus:border-emerald-500" placeholder="Internal notes" />
              </div>
            </SectionCard>
            )}
              </motion.div>
            </AnimatePresence>
          </form>

          <aside className="space-y-4 xl:sticky xl:top-24 self-start">
            <GlassCard className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-md">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
                  <PackagePlus className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-zinc-950">Item Summary</h2>
                  <p className="text-[10px] font-bold text-zinc-500">Created by Current User today</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  ["Item Name", descriptionOfGoods || "Not entered"],
                  ["Item Code", itemCode || "Not entered"],
                  ["Category", category],
                  ["Packaging Unit", packagingUnit],
                  ["Batch Number", batchNumber || "Not entered"],
                  ["Manufacturing Date", formatMonth(manufacturingDate)],
                  ["Expiry Date", formatMonth(expiryDate)],
                  ["Quantity Per Pack", quantityPerPack || "0"],
                  ["Number of Cartons", numberOfCartons || "0"],
                  ["Total Quantity", openingTotalQuantity.toLocaleString()],
                  ["Quantity Sold", soldQuantity.toLocaleString()],
                  ["Opening Balance", openingBalance.toLocaleString()],
                  ["Warehouse", warehouses.find((item) => item.id === warehouse)?.label || warehouse],
                  ["Unit Cost", unitCost ? formatMoney(Number(unitCost)) : "ETB 0"],
                  ["Total Stock Value", formatMoney(totalStockValue)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2">
                    <span className="font-bold text-zinc-500">{label}</span>
                    <span className="text-right font-black text-zinc-900">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${badgeClass("Draft")}`}>Draft</span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${badgeClass(stockStatus)}`}>{stockStatus}</span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${badgeClass(glMapped ? "Mapped" : "Not Mapped")}`}>{glMapped ? "Mapped" : "Not Mapped"}</span>
                <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[10px] font-black uppercase text-zinc-700">Not Submitted</span>
              </div>
            </GlassCard>

            <GlassCard className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-md">
              <h2 className="text-sm font-black text-zinc-950">Calculation Preview</h2>
              <div className="mt-3 space-y-3 text-xs font-bold text-zinc-700">
                <p>{Number(quantityPerPack || 0).toLocaleString()} x {Number(numberOfCartons || 0).toLocaleString()} = <span className="font-black text-emerald-800">{calculatedTotalQuantity.toLocaleString()}</span></p>
                <p>{openingTotalQuantity.toLocaleString()} - {soldQuantity.toLocaleString()} = <span className="font-black text-emerald-800">{openingBalance.toLocaleString()}</span></p>
                <p>{openingBalance.toLocaleString()} x {formatMoney(Number(unitCost || 0))} = <span className="font-black text-emerald-800">{formatMoney(totalStockValue)}</span></p>
              </div>
            </GlassCard>
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-5 py-3 shadow-2xl backdrop-blur">
        <div className="mx-auto flex max-w-[98%] flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            <button onClick={cancel} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-black text-zinc-700 hover:bg-zinc-50">
              <X className="size-4" /> Cancel
            </button>
            <button onClick={() => void saveItem("draft")} disabled={!canSave || isSaving} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-black text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50">
              <Save className="size-4" /> {isSaving ? "Saving..." : "Save as Draft"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void saveItem("another")} disabled={!canSave || isSaving} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-black text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50">
              <PackagePlus className="size-4" /> Save and Add Another
            </button>
            <button onClick={() => void saveItem("save")} disabled={!canSave || isSaving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-xs font-black text-white shadow-md hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
              <CheckCircle2 className="size-4" /> {isSaving ? "Saving..." : "Save Item"}
            </button>
            <button onClick={() => void saveItem("submit")} disabled={!canSave || isSaving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-950 px-5 text-xs font-black text-white shadow-md hover:bg-black disabled:cursor-not-allowed disabled:opacity-50">
              <Send className="size-4" /> Submit for Approval
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showImport && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowImport(false)} />
            <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} className="relative max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-zinc-950">Import from Excel</h2>
                  <p className="mt-1 text-xs font-semibold text-zinc-500">Upload the stock registration sheet and review mappings before import.</p>
                </div>
                <button onClick={() => setShowImport(false)} className="rounded-xl border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50"><X className="size-4" /></button>
              </div>
              <div className="mt-5 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-8 text-center">
                <Upload className="mx-auto size-8 text-emerald-700" />
                <p className="mt-2 text-sm font-black text-emerald-950">Drag and drop Excel file here</p>
                <p className="mt-1 text-xs font-semibold text-emerald-800">Accepted: .xlsx, .xls, .csv</p>
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div>
                  <h3 className="text-xs font-black uppercase text-zinc-500">Expected column mapping</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {excelColumns.map((column) => <div key={column} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-bold text-zinc-700">{column}</div>)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-zinc-500">Preview imported rows</h3>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-800">2 invalid rows</span>
                  </div>
                  <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200">
                    {previewRows.map((row) => (
                      <div key={`${row.description}-${row.batch}`} className="grid grid-cols-[1fr_110px_90px] gap-2 border-b border-zinc-100 px-3 py-2 last:border-0">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-black text-zinc-900">{row.description}</p>
                          <p className="text-[10px] font-bold text-zinc-500">{row.batch || "No batch"}</p>
                        </div>
                        <p className="text-right text-[11px] font-black text-zinc-800">{row.balance.toLocaleString()}</p>
                        <p className={`text-right text-[10px] font-black ${row.status === "Ready" ? "text-emerald-700" : "text-amber-700"}`}>{row.status}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">Duplicate batch warnings will block import until corrected.</div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <button onClick={() => setShowImport(false)} className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-black text-zinc-700 hover:bg-zinc-50">Cancel</button>
                <button onClick={() => showToast("Excel import preview", "info", "Upload parsing is ready for backend import wiring.")} className="h-10 rounded-xl bg-emerald-700 px-5 text-xs font-black text-white hover:bg-emerald-800">Import</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
