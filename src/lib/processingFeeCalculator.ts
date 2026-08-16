export interface ProcessingFeeRates {
  processingRatePerQuintal: number // default 150
  baseStorageRatePerQuintalDay: number // default 1.25
  storageIncrementPerMonth: number // default 0.25
  maxStorageMonthCap: number // default 4
}

export interface ProcessingFeeCalculation {
  quantityQuintals: number
  daysInStorage: number
  processingFee: number
  storageFee: number
  storageFeeBreakdown: {
    monthLabel: string
    daysInMonth: number
    ratePerQuintalDay: number
    monthTotal: number
  }[]
  totalFee: number
}

export function calculateProcessingServiceFee(
  quantityQuintals: number,
  entryDateStr: string,
  endDateStr?: string | null,
  isProcessed: boolean = false,
  rates: Partial<ProcessingFeeRates> = {}
): ProcessingFeeCalculation {
  const procRate = rates.processingRatePerQuintal ?? 150
  const baseStorage = rates.baseStorageRatePerQuintalDay ?? 1.25
  const increment = rates.storageIncrementPerMonth ?? 0.25
  const maxMonth = rates.maxStorageMonthCap ?? 4

  const qty = Math.max(0, Number(quantityQuintals) || 0)

  // 1. Processing Fee (locked / applied when processed is checked or completed)
  const processingFee = isProcessed ? qty * procRate : 0

  // 2. Full Calendar Days in Storage
  let daysInStorage = 0
  if (entryDateStr) {
    const start = new Date(entryDateStr)
    const end = endDateStr ? new Date(endDateStr) : new Date()
    const startTime = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
    const endTime = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
    daysInStorage = Math.max(0, Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)))
  }

  // 3. Month-by-month Tiered Storage Calculation
  // Month 1 (Days 1–30): FREE
  // Month 2 (Days 31–60): baseStorage (1.25)
  // Month 3 (Days 61–90): baseStorage + increment (1.50)
  // Month 4+ (Days 91+): Capped at maxMonth (e.g. Month 4 rate: 1.75)

  let remainingDays = daysInStorage
  let currentDay = 0
  let storageFee = 0
  const breakdown: ProcessingFeeCalculation["storageFeeBreakdown"] = []

  let monthIndex = 1
  while (remainingDays > 0) {
    const daysInThisMonth = Math.min(30, remainingDays)
    let rateForThisMonth = 0

    if (monthIndex === 1) {
      rateForThisMonth = 0
    } else {
      const effectiveMonth = Math.min(monthIndex, maxMonth)
      const tierIncrementCount = Math.max(0, effectiveMonth - 2)
      rateForThisMonth = baseStorage + tierIncrementCount * increment
    }

    const monthTotal = qty * daysInThisMonth * rateForThisMonth
    storageFee += monthTotal

    breakdown.push({
      monthLabel: `Month ${monthIndex} (Days ${currentDay + 1}–${currentDay + daysInThisMonth})`,
      daysInMonth: daysInThisMonth,
      ratePerQuintalDay: rateForThisMonth,
      monthTotal,
    })

    remainingDays -= daysInThisMonth
    currentDay += daysInThisMonth
    monthIndex++
  }

  return {
    quantityQuintals: qty,
    daysInStorage,
    processingFee,
    storageFee,
    storageFeeBreakdown: breakdown,
    totalFee: processingFee + storageFee,
  }
}
