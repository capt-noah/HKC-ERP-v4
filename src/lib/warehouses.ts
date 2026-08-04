import type { Warehouse } from "./erpStore"

export const operatingWarehouses: Warehouse[] = [
  {
    id: "WH1",
    code: "WH1",
    name: "Warehouse 1 (Export)",
    location: "Export",
    type: "Export",
    specialization: "Export",
    targetMarkets: "Export",
    manager: "",
    status: "Active",
  },
  {
    id: "WH2",
    code: "WH2",
    name: "Warehouse 2 (Import India)",
    location: "India Imports",
    type: "Import",
    specialization: "Import India",
    targetMarkets: "India",
    manager: "",
    status: "Active",
  },
  {
    id: "WH3",
    code: "WH3",
    name: "Warehouse 3 (Import China)",
    location: "China Imports",
    type: "Import",
    specialization: "Import China",
    targetMarkets: "China",
    manager: "",
    status: "Active",
  },
]

export function withOperatingWarehouses(warehouses: Warehouse[]) {
  const byKey = new Map<string, Warehouse>()
  for (const warehouse of operatingWarehouses) byKey.set(warehouse.id, warehouse)
  for (const warehouse of warehouses) {
    const base = operatingWarehouses.find((item) => item.id === warehouse.id || item.code === warehouse.id || item.id === warehouse.code)
    if (base) {
      byKey.set(base.id, {
        ...warehouse,
        id: base.id,
        code: base.code,
        name: base.name,
        location: base.location,
        type: base.type,
        specialization: base.specialization,
        targetMarkets: base.targetMarkets,
        status: warehouse.status || base.status,
      })
    } else {
      byKey.set(warehouse.id || warehouse.code, warehouse)
    }
  }
  return Array.from(byKey.values())
}
