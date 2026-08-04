import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Calculator, PackagePlus, Save, X } from "lucide-react"
import { motion } from "framer-motion"
import { FloatingNav } from "@/components/FloatingNav"
import { GlassCard } from "@/components/GlassCard"
import { SubPageNav } from "@/components/SubPageNav"
import { navSections, getSectionChildren } from "@/lib/nav-config"
import { useErpStore, type Product } from "@/lib/erpStore"
import { withOperatingWarehouses } from "@/lib/warehouses"
import { useFeedback } from "@/context/FeedbackContext"

const packagingUnits = [
  "Boxes",
  "Bottles",
  "Bottle",
  "Vial",
  "Pack",
  "Carton",
  "Pieces",
  "Sachet",
  "Tube",
  "Ampoule",
  "Bag",
  "Strip",
  "Kit",
  "Kilogram (Kg)",
  "Gram (g)",
  "Liter (L)",
  "Milliliter (mL)",
  "Meter",
  "Roll",
  "Pair",
  "Dozen",
  "Other",
]

const fade = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", maximumFractionDigits: 2 }).format(value)
}

function daysBetween(start: string, end: string) {
  if (!start || !end) return null
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null
  return Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000)
}

function daysUntil(end: string) {
  if (!end) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(`${end}T00:00:00`)
  if (Number.isNaN(endDate.getTime())) return null
  return Math.ceil((endDate.getTime() - today.getTime()) / 86_400_000)
}

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-wide text-zinc-700">
      {children} {required && <span className="text-rose-600">*</span>}
    </label>
  )
}

export default function AddStockItem() {
  const navigate = useNavigate()
  const erp = useErpStore()
  const { showToast } = useFeedback()
  const products = erp.getProducts()
  const warehouses = withOperatingWarehouses(erp.getWarehouses())

  const [descriptionOfGoods, setDescriptionOfGoods] = useState("")
  const [packagingUnit, setPackagingUnit] = useState("")
  const [batchNumber, setBatchNumber] = useState("")
  const [manufacturingDate, setManufacturingDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [quantityPerPack, setQuantityPerPack] = useState("")
  const [numberOfCartons, setNumberOfCartons] = useState("")
  const [unitPrice, setUnitPrice] = useState("")
  const [warehouse, setWarehouse] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const totalQuantity = useMemo(() => Number(quantityPerPack || 0) * Number(numberOfCartons || 0), [quantityPerPack, numberOfCartons])
  const totalStockValue = totalQuantity * Number(unitPrice || 0)
  const shelfLifeDays = daysBetween(manufacturingDate, expiryDate)
  const shelfLifeMonths = shelfLifeDays === null ? 0 : Math.max(0, Math.round((shelfLifeDays / 30.4375) * 10) / 10)
  const remainingExpiryDays = daysUntil(expiryDate)
  const dateInvalid = Boolean(shelfLifeDays !== null && shelfLifeDays <= 0)
  const normalizedBatch = batchNumber.trim().toLowerCase()
  const duplicateBatch = Boolean(normalizedBatch) && products.some((product) => {
    const batches = [product.batch, ...product.batches.map((batch) => batch.batchNo)]
    return batches.some((batch) => String(batch || "").trim().toLowerCase() === normalizedBatch)
  })
  const canSave = Boolean(
    descriptionOfGoods &&
      packagingUnit &&
      batchNumber &&
      manufacturingDate &&
      expiryDate &&
      quantityPerPack &&
      numberOfCartons &&
      unitPrice &&
      warehouse &&
      totalQuantity > 0 &&
      !dateInvalid &&
      !duplicateBatch,
  )

  const resetForm = () => {
    setDescriptionOfGoods("")
    setPackagingUnit("")
    setBatchNumber("")
    setManufacturingDate("")
    setExpiryDate("")
    setQuantityPerPack("")
    setNumberOfCartons("")
    setUnitPrice("")
    setWarehouse("")
  }

  const saveItem = async (addAnother = false) => {
    if (!canSave) {
      showToast("Cannot save item", "warning", "Complete the required stock fields and resolve validation warnings first.")
      return
    }

    const now = new Date().toISOString()
    const selectedWarehouse = warehouses.find((item) => (item.code || item.id) === warehouse || item.id === warehouse)
    const productId = `P-${Date.now()}`
    const product: Product = {
      id: productId,
      name: descriptionOfGoods,
      sku: `${descriptionOfGoods.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "STK")}-${batchNumber}`,
      category: "",
      itemType: "",
      description: descriptionOfGoods,
      warehouse,
      warehouseName: selectedWarehouse?.name,
      quantity: totalQuantity,
      quantityPerPack: Number(quantityPerPack),
      numberOfCartons: Number(numberOfCartons),
      totalQuantity,
      quantitySold: 0,
      openingBalance: totalQuantity,
      unit: packagingUnit,
      unitCost: Number(unitPrice),
      sellingPrice: Number(unitPrice),
      totalStockValue,
      batch: batchNumber,
      manufacturingDate,
      expiry: expiryDate,
      shelfLifeMonths,
      status: totalQuantity > 0 ? "In Stock" : "Out of Stock",
      stockBreakdown: [{ warehouse, qty: totalQuantity }],
      batches: [{ batchNo: batchNumber, qty: totalQuantity, expiry: expiryDate, status: "Released" }],
      origin: "",
      supplierName: "",
      itemRegistrationStatus: "Active",
      approvalStatus: "Approved",
      createdDate: now,
      createdAt: now,
      updatedAt: now,
    }

    setIsSaving(true)
    try {
      await erp.addProduct(product)
      showToast("Stock item saved", "success", `${descriptionOfGoods} was saved to inventory.`)
      if (addAnother) resetForm()
      else navigate("/inventory/stock")
    } catch (error) {
      showToast("Save failed", "warning", error instanceof Error ? error.message : "The stock item could not be saved.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen page-gradient">
      <FloatingNav brand="HKC Trading ERP" sections={navSections} />
      <main className="mx-auto max-w-[98%] px-4 pb-12 pt-24 md:px-6 lg:px-8">
        <motion.div variants={fade} initial="hidden" animate="visible" className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-black">Add Stock Item</h1>
            <p className="mt-1 max-w-xl text-xs font-semibold leading-relaxed text-zinc-500">
              Register inventory stock from real warehouse and batch data.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 self-end md:self-start">
            <SubPageNav items={getSectionChildren("/inventory")} />
            <button
              type="button"
              onClick={() => navigate("/inventory/stock")}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-4 text-xs font-black uppercase tracking-wide text-zinc-700"
            >
              <X className="size-4" /> Cancel
            </button>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <GlassCard className="border border-white/80 bg-white/92 p-5 shadow-md">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 md:col-span-2">
                <FieldLabel required>Item Name / Description of Goods</FieldLabel>
                <input value={descriptionOfGoods} onChange={(event) => setDescriptionOfGoods(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500" />
              </label>

              <label className="space-y-1.5">
                <FieldLabel required>Packaging Unit</FieldLabel>
                <input list="packaging-unit-options" value={packagingUnit} onChange={(event) => setPackagingUnit(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500" />
                <datalist id="packaging-unit-options">
                  {packagingUnits.map((unit) => <option key={unit} value={unit} />)}
                </datalist>
              </label>

              <label className="space-y-1.5">
                <FieldLabel required>Warehouse</FieldLabel>
                <select value={warehouse} onChange={(event) => setWarehouse(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500">
                  <option value="">Select warehouse</option>
                  {warehouses.map((item) => {
                    const value = item.code || item.id
                    return <option key={item.id} value={value}>{item.name || value}</option>
                  })}
                </select>
              </label>

              <label className="space-y-1.5">
                <FieldLabel required>Batch Number</FieldLabel>
                <input value={batchNumber} onChange={(event) => setBatchNumber(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500" />
              </label>

              <label className="space-y-1.5">
                <FieldLabel required>Unit Price</FieldLabel>
                <input type="number" min="0" step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500" />
              </label>

              <label className="space-y-1.5">
                <FieldLabel required>Manufacturing Date</FieldLabel>
                <input type="date" value={manufacturingDate} onChange={(event) => setManufacturingDate(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500" />
              </label>

              <label className="space-y-1.5">
                <FieldLabel required>Expiry Date</FieldLabel>
                <input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500" />
              </label>

              <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:col-span-2 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Shelf Life</p>
                  <p className="mt-1 text-sm font-black text-zinc-900">
                    {shelfLifeDays === null ? "Select MFG and EXP dates" : `${shelfLifeDays.toLocaleString()} days (${shelfLifeMonths.toLocaleString()} months)`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Expiry Remaining</p>
                  <p className={`mt-1 text-sm font-black ${remainingExpiryDays !== null && remainingExpiryDays < 0 ? "text-rose-700" : "text-zinc-900"}`}>
                    {remainingExpiryDays === null ? "Select expiry date" : remainingExpiryDays < 0 ? `Expired ${Math.abs(remainingExpiryDays).toLocaleString()} days ago` : `${remainingExpiryDays.toLocaleString()} days remaining`}
                  </p>
                </div>
              </div>

              <label className="space-y-1.5">
                <FieldLabel required>Quantity Per Pack</FieldLabel>
                <input type="number" min="0" value={quantityPerPack} onChange={(event) => setQuantityPerPack(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500" />
              </label>

              <label className="space-y-1.5">
                <FieldLabel required>Number of Cartons</FieldLabel>
                <input type="number" min="0" value={numberOfCartons} onChange={(event) => setNumberOfCartons(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500" />
              </label>

              <label className="space-y-1.5 md:col-span-2">
                <FieldLabel>Total Quantity</FieldLabel>
                <input readOnly value={totalQuantity.toLocaleString()} className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-right font-mono text-sm font-black text-zinc-900" />
              </label>
            </div>

            {dateInvalid && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">Expiry date must be after the manufacturing date.</p>}
            {duplicateBatch && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">Batch number already exists in inventory.</p>}

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
              <button type="button" onClick={() => navigate("/inventory/stock")} className="h-10 rounded-xl border border-zinc-200 px-4 text-xs font-black">Cancel</button>
              <button type="button" disabled={!canSave || isSaving} onClick={() => void saveItem(true)} className="h-10 rounded-xl border border-emerald-200 bg-white px-4 text-xs font-black text-emerald-800 disabled:cursor-not-allowed disabled:opacity-45">Save and Add Another</button>
              <button type="button" disabled={!canSave || isSaving} onClick={() => void saveItem(false)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45">
                <Save className="size-4" /> Save Item
              </button>
            </div>
          </GlassCard>

          <aside className="space-y-4">
            <GlassCard className="border border-emerald-100 bg-white/92 p-5 shadow-md">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Calculator className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-zinc-950">Stock Value</h2>
                  <p className="text-[11px] font-bold text-zinc-500">Live from quantity and price</p>
                </div>
              </div>
              <div className="space-y-3 rounded-2xl bg-zinc-50 p-4">
                <div className="flex justify-between text-xs font-bold text-zinc-600"><span>Total Quantity</span><span>{totalQuantity.toLocaleString()}</span></div>
                <div className="flex justify-between text-xs font-bold text-zinc-600"><span>Unit Price</span><span>{formatMoney(Number(unitPrice || 0))}</span></div>
                <div className="border-t border-zinc-200 pt-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-zinc-400">Total Stock Value</p>
                  <p className="mt-1 text-2xl font-black text-zinc-950">{formatMoney(totalStockValue)}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="border border-white/80 bg-white/92 p-5 shadow-md">
              <div className="flex items-center gap-2">
                <PackagePlus className="size-5 text-zinc-500" />
                <h2 className="text-sm font-black text-zinc-950">Saved Fields</h2>
              </div>
              <p className="mt-3 text-xs font-semibold leading-relaxed text-zinc-500">
                Item, package, batch, manufacturing and expiry dates, carton math, unit price, stock value, warehouse, and timestamps are saved to inventory.
              </p>
            </GlassCard>
          </aside>
        </div>
      </main>
    </div>
  )
}
