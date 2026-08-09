export interface ShipmentDocRule {
  id: string
  applies_to: 'purchase_order' | 'sales_order' | 'processing_service'
  origin_country: string | null
  destination_region: string | null
  product_category: string | null
  document_type: string
  is_required: boolean
  description?: string
}

export interface ShipmentDocAttachment {
  id: string
  record_id: string
  record_type: 'purchase_order' | 'sales_order' | 'processing_service'
  document_type: string
  file_name: string
  file_size: number
  file_url: string
  uploaded_at: string
  uploaded_by: string
}

export interface SatisfiedRequirement {
  document_type: string
  file: ShipmentDocAttachment
}

export interface MissingRequirement {
  document_type: string
  reason: string
}

export interface ShipmentDocEvaluation {
  isComplete: boolean
  totalRequired: number
  satisfiedCount: number
  missingCount: number
  satisfied: SatisfiedRequirement[]
  missing: MissingRequirement[]
}

export const DEFAULT_FRONTEND_RULES: ShipmentDocRule[] = [
  {
    id: "RULE-IMP-1",
    applies_to: "purchase_order",
    origin_country: null,
    destination_region: null,
    product_category: null,
    document_type: "Commercial Invoice",
    is_required: true,
    description: "Mandatory for all import shipments",
  },
  {
    id: "RULE-IMP-2",
    applies_to: "purchase_order",
    origin_country: null,
    destination_region: null,
    product_category: null,
    document_type: "Packing List",
    is_required: true,
    description: "Mandatory for all import shipments",
  },
  {
    id: "RULE-IMP-3",
    applies_to: "purchase_order",
    origin_country: null,
    destination_region: null,
    product_category: null,
    document_type: "Bill of Lading / Airway Bill",
    is_required: true,
    description: "Mandatory transport document for all import shipments",
  },
  {
    id: "RULE-IMP-4",
    applies_to: "purchase_order",
    origin_country: "China",
    destination_region: null,
    product_category: null,
    document_type: "Certificate of Origin",
    is_required: true,
    description: "Required for imports originating from China",
  },
  {
    id: "RULE-IMP-5",
    applies_to: "purchase_order",
    origin_country: "India",
    destination_region: null,
    product_category: null,
    document_type: "Certificate of Origin",
    is_required: true,
    description: "Required for imports originating from India",
  },
  {
    id: "RULE-IMP-6",
    applies_to: "purchase_order",
    origin_country: null,
    destination_region: null,
    product_category: "Medicine",
    document_type: "Certificate of Analysis (COA)",
    is_required: true,
    description: "Required for pharmaceutical and medical supplies",
  },

  {
    id: "RULE-SO-1",
    applies_to: "sales_order",
    origin_country: null,
    destination_region: null,
    product_category: null,
    document_type: "Trade License",
    is_required: true,
    description: "Mandatory customer Trade License",
  },
  {
    id: "RULE-SO-2",
    applies_to: "sales_order",
    origin_country: null,
    destination_region: null,
    product_category: null,
    document_type: "Payment Advice",
    is_required: true,
    description: "Mandatory proof of payment receipt / advice at agreed contract price",
  },
]

export function evaluateShipmentDocs({
  record,
  items = [],
  attachments = [],
  rules = DEFAULT_FRONTEND_RULES,
  appliesTo = 'purchase_order',
}: {
  record: any
  items?: any[]
  attachments?: ShipmentDocAttachment[]
  rules?: ShipmentDocRule[]
  appliesTo: 'purchase_order' | 'sales_order'
}): ShipmentDocEvaluation {
  const activeRules = rules.filter((r) => r.applies_to === appliesTo && r.is_required)

  const originCountry = record.originCountry || record.origin_country || record.supplier_country || record.country || ''
  const destinationRegion = record.destinationRegion || record.destination_region || record.region || ''

  const categories = new Set<string>(
    (items || []).map((i) => i.category || i.product_category || i.itemCategory || '').filter(Boolean)
  )

  const applicableRules = activeRules.filter((rule) => {
    if (rule.origin_country && originCountry) {
      if (rule.origin_country.toLowerCase() !== originCountry.toLowerCase()) {
        return false
      }
    }

    if (rule.destination_region && destinationRegion) {
      if (rule.destination_region.toLowerCase() !== destinationRegion.toLowerCase()) {
        return false
      }
    }

    if (rule.product_category) {
      if (categories.size > 0 && !categories.has(rule.product_category)) {
        return false
      }
    }

    return true
  })

  const requiredDocTypesMap = new Map<string, string>()
  applicableRules.forEach((rule) => {
    if (!requiredDocTypesMap.has(rule.document_type)) {
      requiredDocTypesMap.set(rule.document_type, rule.description || `Required for ${appliesTo.replace('_', ' ')}`)
    }
  })

  const attachedTypesMap = new Map<string, ShipmentDocAttachment>()
  ;(attachments || []).forEach((file) => {
    if (file.document_type) {
      const typeLower = file.document_type.toLowerCase().trim()
      attachedTypesMap.set(typeLower, file)
      if (typeLower === "trade paper") {
        attachedTypesMap.set("trade license", file)
      }
      if (typeLower === "trade license") {
        attachedTypesMap.set("trade paper", file)
      }
    }
  })

  const satisfied: SatisfiedRequirement[] = []
  const missing: MissingRequirement[] = []

  for (const [docType, reason] of requiredDocTypesMap.entries()) {
    const matchedFile = attachedTypesMap.get(docType.toLowerCase().trim())
    if (matchedFile) {
      satisfied.push({ document_type: docType, file: matchedFile })
    } else {
      missing.push({ document_type: docType, reason })
    }
  }

  return {
    isComplete: missing.length === 0,
    totalRequired: requiredDocTypesMap.size,
    satisfiedCount: satisfied.length,
    missingCount: missing.length,
    satisfied,
    missing,
  }
}

// ── API Helpers ─────────────────────────────────────────────────────────────

export async function fetchShipmentDocRules(appliesTo?: string): Promise<ShipmentDocRule[]> {
  try {
    const url = new URL('/api/shipment-documents/rules', window.location.origin)
    if (appliesTo) url.searchParams.set('applies_to', appliesTo)
    const res = await fetch(url.toString())
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return data
    }
  } catch (err) {
    console.warn('fetchShipmentDocRules error:', err)
  }
  return DEFAULT_FRONTEND_RULES.filter((r) => !appliesTo || r.applies_to === appliesTo)
}

export async function fetchShipmentDocs(recordId: string, recordType: string): Promise<ShipmentDocAttachment[]> {
  try {
    const url = new URL('/api/shipment-documents', window.location.origin)
    url.searchParams.set('record_id', recordId)
    url.searchParams.set('record_type', recordType)
    const res = await fetch(url.toString())
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data
    }
  } catch (err) {
    console.warn('fetchShipmentDocs error:', err)
  }
  return []
}

export async function uploadShipmentDoc(doc: Partial<ShipmentDocAttachment>): Promise<ShipmentDocAttachment> {
  const res = await fetch('/api/shipment-documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  })
  if (!res.ok) {
    throw new Error('Failed to upload shipment document.')
  }
  return res.json()
}

export interface AssignedOfficerRecord {
  record_id: string
  assigned_employee_id: string | null
  assigned_employee_name: string
  assigned_at?: string
}

export async function fetchAssignedOfficers(): Promise<AssignedOfficerRecord[]> {
  try {
    const res = await fetch('/api/shipment-documents/officers')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data
    }
  } catch (err) {
    console.warn('fetchAssignedOfficers error:', err)
  }
  return []
}

export async function assignShipmentOfficer(recordId: string, employeeId: string | null, employeeName: string): Promise<AssignedOfficerRecord> {
  const res = await fetch('/api/shipment-documents/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record_id: recordId, assigned_employee_id: employeeId, assigned_employee_name: employeeName }),
  })
  if (!res.ok) {
    throw new Error('Failed to assign compliance officer.')
  }
  return res.json()
}

export async function deleteShipmentDoc(id: string): Promise<void> {
  const res = await fetch(`/api/shipment-documents/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error('Failed to delete shipment document.')
  }
}
