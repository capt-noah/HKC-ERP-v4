import type { Warehouse } from "./erpStore"

export function withOperatingWarehouses(warehouses: Warehouse[]) {
  const byKey = new Map<string, Warehouse>()
  for (const warehouse of warehouses) {
    byKey.set(warehouse.id || warehouse.code, warehouse)
  }
  return Array.from(byKey.values())
}
