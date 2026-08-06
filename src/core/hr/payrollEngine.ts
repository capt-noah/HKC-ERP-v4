export interface PayrollCalculationResult {
  employeeId: string
  employeeName: string
  grossSalary: number
  incomeTax: number
  pensionEmployee: number
  pensionCompany: number
  totalDeductions: number
  netPay: number
}

/**
 * Calculates monthly Ethiopian payroll deductions (Income Tax, Pension).
 */
export function calculatePayrollRecord(
  employeeId: string,
  employeeName: string,
  baseSalary: number,
  allowances = 0
): PayrollCalculationResult {
  const gross = baseSalary + allowances
  let tax = 0

  // Ethiopian Progressive Income Tax Brackets (ETB)
  if (gross <= 600) {
    tax = 0
  } else if (gross <= 1650) {
    tax = gross * 0.1 - 60
  } else if (gross <= 3200) {
    tax = gross * 0.15 - 142.5
  } else if (gross <= 5250) {
    tax = gross * 0.2 - 302.5
  } else if (gross <= 7800) {
    tax = gross * 0.25 - 565
  } else if (gross <= 10900) {
    tax = gross * 0.3 - 955
  } else {
    tax = gross * 0.35 - 1500
  }

  const pensionEmp = baseSalary * 0.07 // 7% Employee Pension
  const pensionComp = baseSalary * 0.11 // 11% Employer Pension
  const deductions = tax + pensionEmp
  const netPay = gross - deductions

  return {
    employeeId,
    employeeName,
    grossSalary: Math.round(gross * 100) / 100,
    incomeTax: Math.max(0, Math.round(tax * 100) / 100),
    pensionEmployee: Math.round(pensionEmp * 100) / 100,
    pensionCompany: Math.round(pensionComp * 100) / 100,
    totalDeductions: Math.round(deductions * 100) / 100,
    netPay: Math.round(netPay * 100) / 100,
  }
}
