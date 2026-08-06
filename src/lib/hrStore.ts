import { useState, useEffect } from "react"
import { loadResource, persistResources } from "./apiPersistence"
import { financeStore } from "./financeStore"

export interface Employee {
  id: string
  name: string
  role: string // Designation
  department: string
  reportsTo?: string
  email: string
  phone?: string
  status: "Active" | "On Leave" | "Probation" | "Suspended" | "Separated"
  statusColor: string
  joinDate: string
  employmentType: "Full-Time" | "Part-Time" | "Contract" | "Intern"
  salary: number // Monthly base
  paymentStatus: "Paid" | "Pending" | "Processing"
  paymentStatusColor: string
  presentToday: boolean
  avatarBg: string
  initials: string
  bankAccount?: string
  bankName?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
}

export interface Department {
  id: string
  name: string
  code: string
  headOfDepartment: string
  employeeCount: number
}

export interface Designation {
  id: string
  title: string
  department: string
  salaryGrade: string
  minSalary: number
  maxSalary: number
}

export interface JobOpening {
  id: string
  title: string
  department: string
  designation: string
  vacancies: number
  location: string
  status: "Open" | "In Review" | "Closed"
  postedDate: string
  description: string
  type: "Full-Time" | "Part-Time" | "Contract"
}

export interface JobApplicant {
  id: string
  jobOpeningId: string
  jobTitle: string
  applicantName: string
  email: string
  phone: string
  stage: "Applied" | "Screening" | "Interview" | "Offered" | "Rejected" | "Hired"
  appliedDate: string
  interviewDate?: string
  rating: number // 1 to 5
  notes?: string
}

export interface OnboardingTask {
  id: string
  title: string
  category: "IT Setup" | "HR Documentation" | "Workspace & Equipment" | "Orientation"
  completed: boolean
  assignedTo: string
}

export interface OnboardingProcess {
  id: string
  employeeId: string
  employeeName: string
  department: string
  role: string
  startDate: string
  status: "In Progress" | "Completed"
  tasks: OnboardingTask[]
}

export interface SeparationClearance {
  id: string
  department: "IT" | "Finance" | "HR" | "Department Head"
  cleared: boolean
  clearedBy?: string
  notes?: string
}

export interface SeparationProcess {
  id: string
  employeeId: string
  employeeName: string
  department: string
  role: string
  resignationDate: string
  exitDate: string
  reason: string
  status: "Notice Period" | "Clearance Pending" | "Completed"
  clearances: SeparationClearance[]
  finalSettlementAmount: number
  settlementPaid: boolean
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  date: string // YYYY-MM-DD
  status: "Present" | "Absent" | "Half Day" | "On Leave" | "Late"
  checkIn?: string
  checkOut?: string
  overtimeHours?: number
}

export interface LeaveType {
  id: string
  name: string
  maxDaysPerYear: number
  carriesForward: boolean
  isUnpaid: boolean
}

export interface LeaveAllocation {
  id: string
  employeeId: string
  employeeName: string
  leaveTypeId: string
  leaveTypeName: string
  allocatedDays: number
  usedDays: number
  balanceDays: number
}

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  role: string
  avatar: string
  leaveTypeId: string
  type: string
  startDate: string
  endDate: string
  range: string
  totalDays: number
  reason: string
  status: "Pending" | "Approved" | "Rejected"
  appliedOn: string
}

export interface SalaryStructureComponent {
  id: string
  name: string
  type: "Earning" | "Deduction"
  amount: number
  isPercentage: boolean
}

export interface SalaryStructure {
  id: string
  name: string
  employeeId: string
  employeeName: string
  baseSalary: number
  hra: number
  transportAllowance: number
  bonus: number
  taxDeduction: number
  pensionDeduction: number
  netPay: number
}

export interface SalarySlip {
  id: string
  payrollRunId: string
  employeeId: string
  employeeName: string
  role: string
  department: string
  periodLabel: string
  basicSalary: number
  grossPay: number
  deductions: { type: string; amount: number }[]
  totalDeductions: number
  netPay: number
  status: "Draft" | "Submitted" | "Paid"
  paymentDate?: string
}

export interface HRExpenseClaim {
  id: string
  claimNumber: string
  employeeId: string
  employeeName: string
  department: string
  title: string
  category: "Travel & Lodging" | "Meals & Entertaining" | "Office Supplies" | "Training & Education" | "Other"
  claimDate: string
  amount: number
  currency: string
  description: string
  receiptRef?: string
  status: "Draft" | "Pending Approval" | "Approved" | "Rejected" | "Reimbursed"
  financeExpenseId?: string
}

export interface PerformanceAppraisal {
  id: string
  cycle: string
  employeeId: string
  employeeName: string
  role: string
  department: string
  reviewerName: string
  reviewDate: string
  selfRating: number // 1 to 5
  managerRating: number // 1 to 5
  finalScore: number // 1 to 5
  status: "Draft" | "Self Submitted" | "Under Manager Review" | "Completed"
  kras: { name: string; target: string; achieveScore: number; comments: string }[]
  overallFeedback: string
}

export interface TrainingProgram {
  id: string
  title: string
  category: "Technical" | "Compliance & Safety" | "Leadership" | "Soft Skills"
  trainer: string
  startDate: string
  endDate: string
  location: string
  maxSeats: number
  enrolledCount: number
  status: "Upcoming" | "In Progress" | "Completed"
  description: string
}

export interface TrainingParticipant {
  id: string
  trainingId: string
  employeeId: string
  employeeName: string
  department: string
  status: "Enrolled" | "Attended" | "Passed" | "Failed"
  feedback?: string
  score?: number
}

// Initial Data Seed
const initialDepartments: Department[] = []
const initialDesignations: Designation[] = []
const initialEmployees: Employee[] = []
const initialJobOpenings: JobOpening[] = []
const initialJobApplicants: JobApplicant[] = []
const initialOnboardings: OnboardingProcess[] = []
const initialSeparations: SeparationProcess[] = []
const initialLeaveTypes: LeaveType[] = []
const initialLeaveRequests: LeaveRequest[] = []
const initialExpenseClaims: HRExpenseClaim[] = []
const initialAppraisals: PerformanceAppraisal[] = []
const initialTrainingPrograms: TrainingProgram[] = []

// HR Store Singleton Class
class HRStore {
  private employees: Employee[] = initialEmployees
  private departments: Department[] = initialDepartments
  private designations: Designation[] = initialDesignations
  private jobOpenings: JobOpening[] = initialJobOpenings
  private jobApplicants: JobApplicant[] = initialJobApplicants
  private onboardings: OnboardingProcess[] = initialOnboardings
  private separations: SeparationProcess[] = initialSeparations
  private leaveTypes: LeaveType[] = initialLeaveTypes
  private leaveRequests: LeaveRequest[] = initialLeaveRequests
  private expenseClaims: HRExpenseClaim[] = initialExpenseClaims
  private appraisals: PerformanceAppraisal[] = initialAppraisals
  private trainingPrograms: TrainingProgram[] = initialTrainingPrograms

  private listeners: Set<() => void> = new Set()

  constructor() {
    this.employees = []
    this.departments = []
    this.designations = []
    this.jobOpenings = []
    this.jobApplicants = []
    this.onboardings = []
    this.separations = []
    this.leaveTypes = []
    this.leaveRequests = []
    this.expenseClaims = []
    this.appraisals = []
    this.trainingPrograms = []
    this.loadFromApi()
  }

  private async loadFromApi() {
    try {
      const [
        employees,
        departments,
        designations,
        jobOpenings,
        jobApplicants,
        onboardings,
        separations,
        leaveTypes,
        leaveRequests,
        expenseClaims,
        appraisals,
        trainingPrograms,
      ] = await Promise.all([
        loadResource<Employee>("employees", this.employees),
        loadResource<Department>("departments", this.departments),
        loadResource<Designation>("designations", this.designations),
        loadResource<JobOpening>("job_openings", this.jobOpenings),
        loadResource<JobApplicant>("job_applicants", this.jobApplicants),
        loadResource<OnboardingProcess>("onboardings", this.onboardings),
        loadResource<SeparationProcess>("separations", this.separations),
        loadResource<LeaveType>("leave_types", this.leaveTypes),
        loadResource<LeaveRequest>("leave_requests", this.leaveRequests),
        loadResource<HRExpenseClaim>("expense_claims", this.expenseClaims),
        loadResource<PerformanceAppraisal>("appraisals", this.appraisals),
        loadResource<TrainingProgram>("training_programs", this.trainingPrograms),
      ])

      this.employees = employees
      this.departments = departments
      this.designations = designations
      this.jobOpenings = jobOpenings
      this.jobApplicants = jobApplicants
      this.onboardings = onboardings
      this.separations = separations
      this.leaveTypes = leaveTypes
      this.leaveRequests = leaveRequests
      this.expenseClaims = expenseClaims
      this.appraisals = appraisals
      this.trainingPrograms = trainingPrograms
      this.listeners.forEach((l) => l())
    } catch (error) {
      console.error("Failed to load HR data from Supabase.", error)
    }
  }

  private saveToApi() {
    return persistResources([
      { resource: "employees", items: this.employees },
      { resource: "departments", items: this.departments },
      { resource: "designations", items: this.designations },
      { resource: "job_openings", items: this.jobOpenings },
      { resource: "job_applicants", items: this.jobApplicants },
      { resource: "onboardings", items: this.onboardings },
      { resource: "separations", items: this.separations },
      { resource: "leave_types", items: this.leaveTypes },
      { resource: "leave_requests", items: this.leaveRequests },
      { resource: "expense_claims", items: this.expenseClaims },
      { resource: "appraisals", items: this.appraisals },
      { resource: "training_programs", items: this.trainingPrograms },
    ])
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    void this.saveToApi().catch((error) => {
      console.error("Failed to persist HR data to Supabase.", error)
    })
    this.listeners.forEach((l) => l())
  }

  // --- Getters ---
  public getEmployees(): Employee[] { return [...this.employees] }
  public getDepartments(): Department[] { return [...this.departments] }
  public getDesignations(): Designation[] { return [...this.designations] }
  public getJobOpenings(): JobOpening[] { return [...this.jobOpenings] }
  public getJobApplicants(): JobApplicant[] { return [...this.jobApplicants] }
  public getOnboardings(): OnboardingProcess[] { return [...this.onboardings] }
  public getSeparations(): SeparationProcess[] { return [...this.separations] }
  public getLeaveTypes(): LeaveType[] { return [...this.leaveTypes] }
  public getLeaveRequests(): LeaveRequest[] { return [...this.leaveRequests] }
  public getExpenseClaims(): HRExpenseClaim[] { return [...this.expenseClaims] }
  public getAppraisals(): PerformanceAppraisal[] { return [...this.appraisals] }
  public getTrainingPrograms(): TrainingProgram[] { return [...this.trainingPrograms] }

  // --- Employee Actions ---
  public addEmployee(emp: Omit<Employee, "id" | "initials" | "avatarBg" | "paymentStatus" | "paymentStatusColor">): Employee {
    const id = `EMP-${String(this.employees.length + 1).padStart(3, "0")}`
    const initials = emp.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    const avatarBgs = ["bg-green-200", "bg-zinc-200", "bg-sky-200", "bg-indigo-200", "bg-amber-200"]
    const avatarBg = avatarBgs[this.employees.length % avatarBgs.length]

    const newEmp: Employee = {
      ...emp,
      id,
      initials,
      avatarBg,
      paymentStatus: "Pending",
      paymentStatusColor: "bg-zinc-100 text-zinc-700 border border-zinc-200",
    }
    this.employees = [newEmp, ...this.employees]
    this.notify()
    return newEmp
  }

  public updateEmployeeStatus(id: string, status: Employee["status"]) {
    let color = "bg-green-100 text-green-700 border border-green-200"
    if (status === "On Leave") color = "bg-zinc-100 text-zinc-700 border border-zinc-200"
    if (status === "Probation") color = "bg-amber-100 text-amber-800 border border-amber-200"
    if (status === "Suspended") color = "bg-red-100 text-red-700 border border-red-200"
    if (status === "Separated") color = "bg-gray-200 text-gray-700 border border-gray-300"

    this.employees = this.employees.map((e) => (e.id === id ? { ...e, status, statusColor: color } : e))
    this.notify()
  }

  public deleteEmployee(id: string) {
    this.employees = this.employees.filter((e) => e.id !== id)
    this.notify()
  }

  // --- Recruitment Actions ---
  public addJobOpening(job: Omit<JobOpening, "id" | "postedDate" | "status">): JobOpening {
    const id = `JOB-2026-${String(this.jobOpenings.length + 1).padStart(2, "0")}`
    const newJob: JobOpening = {
      ...job,
      id,
      postedDate: new Date().toISOString().split("T")[0],
      status: "Open",
    }
    this.jobOpenings = [newJob, ...this.jobOpenings]
    this.notify()
    return newJob
  }

  public addApplicant(applicant: Omit<JobApplicant, "id" | "appliedDate" | "stage">): JobApplicant {
    const id = `APP-${Math.floor(100 + Math.random() * 900)}`
    const newApp: JobApplicant = {
      ...applicant,
      id,
      appliedDate: new Date().toISOString().split("T")[0],
      stage: "Applied",
    }
    this.jobApplicants = [newApp, ...this.jobApplicants]
    this.notify()
    return newApp
  }

  public updateApplicantStage(id: string, stage: JobApplicant["stage"]) {
    let hiredApplicant: JobApplicant | null = null
    this.jobApplicants = this.jobApplicants.map((app) => {
      if (app.id === id) {
        const updated = { ...app, stage }
        if (stage === "Hired") hiredApplicant = updated
        return updated
      }
      return app
    })

    // Auto-create Onboarding & Employee profile if Hired
    if (hiredApplicant) {
      const app = hiredApplicant as JobApplicant
      const job = this.jobOpenings.find((j) => j.id === app.jobOpeningId)
      const emp = this.addEmployee({
        name: app.applicantName,
        role: app.jobTitle,
        department: job ? job.department : "Tech",
        email: app.email,
        phone: app.phone,
        status: "Probation",
        statusColor: "bg-amber-100 text-amber-800 border border-amber-200",
        joinDate: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
        employmentType: "Full-Time",
        salary: 60000,
        presentToday: true,
      })

      // Add Onboarding process
      this.addOnboardingProcess(emp.id)
    }

    this.notify()
  }

  // --- Onboarding & Separation Actions ---
  public addOnboardingProcess(employeeId: string) {
    const emp = this.employees.find((e) => e.id === employeeId)
    if (!emp) return

    const newOnb: OnboardingProcess = {
      id: `ONB-2026-${String(this.onboardings.length + 1).padStart(2, "0")}`,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      role: emp.role,
      startDate: new Date().toISOString().split("T")[0],
      status: "In Progress",
      tasks: [
        { id: "T1", title: "Setup Corporate Email & Identity Portal", category: "IT Setup", completed: false, assignedTo: "IT Support" },
        { id: "T2", title: "Sign Employment Contract & Tax Forms", category: "HR Documentation", completed: false, assignedTo: "HR Specialist" },
        { id: "T3", title: "Provision Work Laptop & Accessories", category: "Workspace & Equipment", completed: false, assignedTo: "IT Admin" },
        { id: "T4", title: "Team Orientation & ERP System Walkthrough", category: "Orientation", completed: false, assignedTo: "HR Manager" },
      ],
    }
    this.onboardings = [newOnb, ...this.onboardings]
    this.notify()
  }

  public toggleOnboardingTask(onboardingId: string, taskId: string) {
    this.onboardings = this.onboardings.map((onb) => {
      if (onb.id === onboardingId) {
        const nextTasks = onb.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
        const allDone = nextTasks.every((t) => t.completed)
        return {
          ...onb,
          tasks: nextTasks,
          status: allDone ? "Completed" : "In Progress",
        }
      }
      return onb
    })
    this.notify()
  }

  public initiateSeparation(data: { employeeId: string; resignationDate: string; exitDate: string; reason: string }): SeparationProcess {
    const emp = this.employees.find((e) => e.id === data.employeeId)
    const empName = emp ? emp.name : "Employee"
    const dept = emp ? emp.department : "General"
    const role = emp ? emp.role : "Staff"

    const newSep: SeparationProcess = {
      id: `SEP-2026-${String(this.separations.length + 1).padStart(2, "0")}`,
      employeeId: data.employeeId,
      employeeName: empName,
      department: dept,
      role: role,
      resignationDate: data.resignationDate,
      exitDate: data.exitDate,
      reason: data.reason,
      status: "Clearance Pending",
      clearances: [
        { id: "C1", department: "IT", cleared: false },
        { id: "C2", department: "Finance", cleared: false },
        { id: "C3", department: "HR", cleared: false },
        { id: "C4", department: "Department Head", cleared: false },
      ],
      finalSettlementAmount: emp ? emp.salary * 1.5 : 50000,
      settlementPaid: false,
    }

    this.separations = [newSep, ...this.separations]
    this.notify()
    return newSep
  }

  public toggleSeparationClearance(separationId: string, clearanceId: string, clearedBy: string) {
    this.separations = this.separations.map((sep) => {
      if (sep.id === separationId) {
        const nextClearances = sep.clearances.map((c) =>
          c.id === clearanceId ? { ...c, cleared: !c.cleared, clearedBy: !c.cleared ? clearedBy : undefined } : c
        )
        const allCleared = nextClearances.every((c) => c.cleared)
        if (allCleared) {
          // Update employee status to Separated
          this.updateEmployeeStatus(sep.employeeId, "Separated")
        }
        return {
          ...sep,
          clearances: nextClearances,
          status: allCleared ? "Completed" : "Clearance Pending",
        }
      }
      return sep
    })
    this.notify()
  }

  // --- Leave Actions ---
  public addLeaveRequest(data: Omit<LeaveRequest, "id" | "status" | "appliedOn" | "range">): LeaveRequest {
    const emp = this.employees.find((e) => e.id === data.employeeId)
    const newReq: LeaveRequest = {
      ...data,
      id: `LR-${Math.floor(100 + Math.random() * 900)}`,
      range: `${data.startDate} - ${data.endDate}`,
      avatar: emp ? emp.initials : "EMP",
      status: "Pending",
      appliedOn: new Date().toISOString().split("T")[0],
    }
    this.leaveRequests = [newReq, ...this.leaveRequests]
    this.notify()
    return newReq
  }

  public updateLeaveRequestStatus(id: string, status: "Approved" | "Rejected") {
    this.leaveRequests = this.leaveRequests.map((req) => {
      if (req.id === id) {
        if (status === "Approved") {
          // Mark employee as On Leave
          this.updateEmployeeStatus(req.employeeId, "On Leave")
        }
        return { ...req, status }
      }
      return req
    })
    this.notify()
  }

  // --- Expense Claims Actions (Integrated with Finance) ---
  public addExpenseClaim(claim: Omit<HRExpenseClaim, "id" | "claimNumber" | "status">): HRExpenseClaim {
    const num = Math.floor(8000 + Math.random() * 1000)
    const id = `HRC-${num}`
    const claimNumber = `EXP-${num}`

    const newClaim: HRExpenseClaim = {
      ...claim,
      id,
      claimNumber,
      status: "Pending Approval",
    }
    this.expenseClaims = [newClaim, ...this.expenseClaims]
    this.notify()
    return newClaim
  }

  public approveExpenseClaim(id: string) {
    this.expenseClaims = this.expenseClaims.map((claim) => {
      if (claim.id === id) {
        // Post directly to Finance Store!
        const finExpense = financeStore.addOneOffExpense({
          merchant: `${claim.title} (${claim.employeeName})`,
          category: claim.category,
          date: claim.claimDate,
          employee: claim.employeeName,
          amount: claim.amount,
          currency: claim.currency,
          status: "PENDING",
        })

        // Approve in Finance Store to trigger General Ledger Journal Entry
        financeStore.approveOneOffExpense(finExpense.id)

        return {
          ...claim,
          status: "Approved" as const,
          financeExpenseId: finExpense.id,
        }
      }
      return claim
    })
    this.notify()
  }

  public rejectExpenseClaim(id: string) {
    this.expenseClaims = this.expenseClaims.map((claim) => (claim.id === id ? { ...claim, status: "Rejected" as const } : claim))
    this.notify()
  }

  // --- Performance & Training Actions ---
  public addAppraisal(appraisal: Omit<PerformanceAppraisal, "id" | "status" | "finalScore">): PerformanceAppraisal {
    const id = `APP-${Math.floor(100 + Math.random() * 900)}`
    const finalScore = Math.round(((appraisal.selfRating + appraisal.managerRating) / 2) * 100) / 100
    const newApp: PerformanceAppraisal = {
      ...appraisal,
      id,
      finalScore,
      status: "Completed",
    }
    this.appraisals = [newApp, ...this.appraisals]
    this.notify()
    return newApp
  }

  public addTrainingProgram(program: Omit<TrainingProgram, "id" | "enrolledCount" | "status">): TrainingProgram {
    const id = `TRN-${Math.floor(100 + Math.random() * 900)}`
    const newProg: TrainingProgram = {
      ...program,
      id,
      enrolledCount: 0,
      status: "Upcoming",
    }
    this.trainingPrograms = [newProg, ...this.trainingPrograms]
    this.notify()
    return newProg
  }

  public enrollInTraining(trainingId: string) {
    this.trainingPrograms = this.trainingPrograms.map((p) =>
      p.id === trainingId ? { ...p, enrolledCount: p.enrolledCount + 1 } : p
    )
    this.notify()
  }
}

export const hrStore = new HRStore()

// React Hook for HR Store
export function useHRStore() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const unsubscribe = hrStore.subscribe(() => {
      setTick((t) => t + 1)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  return hrStore
}
