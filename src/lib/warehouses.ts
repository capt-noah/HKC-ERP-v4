import type { Warehouse } from "./erpStore"

export const OPERATING_WAREHOUSES: Warehouse[] = [
  {
    id: "WH1",
    code: "WH1-AGRI-EXP",
    name: "WH1 - Ethiopia Agricultural Export Hub",
    type: "Export Hub",
    status: "Active",
    manager: "Abebe Kasahun",
    location: "Modjo Export Terminal, Ethiopia",
    targetMarkets: "Europe, Asia, USA",
    specialization: "Agricultural Commodities",
  },
  {
    id: "WH2",
    code: "WH2-VET-CENTRAL",
    name: "WH2 - Central Veterinary Hub",
    type: "Central Warehouse",
    status: "Active",
    manager: "Dr. Alemayehu Worku",
    location: "Addis Ababa Central, Ethiopia",
    targetMarkets: "Domestic & Regional Dist.",
    specialization: "Veterinary Drugs & Biologicals",
  },
  {
    id: "WH3",
    code: "WH3-VET-REGIONAL",
    name: "WH3 - Regional Veterinary Depot",
    type: "Regional Depot",
    status: "Active",
    manager: "Tigist Haile",
    location: "Bishoftu Regional Hub, Ethiopia",
    targetMarkets: "Oromia & Southern Regions",
    specialization: "Veterinary Supplies & Consumables",
  },
]

export function withOperatingWarehouses(warehouses: Warehouse[] = []): Warehouse[] {
  const byKey = new Map<string, Warehouse>()

  // Always seed with standard baseline operating warehouses
  for (const defaultWh of OPERATING_WAREHOUSES) {
    byKey.set(defaultWh.id, defaultWh)
  }

  // Merge any dynamic or custom warehouses from server/store
  for (const warehouse of warehouses || []) {
    if (!warehouse) continue
    const key = warehouse.id || warehouse.code
    if (key) {
      const existing = byKey.get(key) || byKey.get(warehouse.id) || byKey.get(warehouse.code)
      byKey.set(warehouse.id || key, { ...existing, ...warehouse })
    }
  }

  return Array.from(byKey.values())
}

export const isWH1 = (w?: string): boolean => {
  if (!w) return false
  const upper = String(w).toUpperCase()
  return upper.includes("WH1") || upper.includes("WH-01") || upper.includes("WH 1") || upper.includes("AGRI")
}


