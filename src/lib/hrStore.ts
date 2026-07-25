import { useState, useEffect } from "react"
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
const initialDepartments: Department[] = [
  { id: "DEP-TECH", name: "Tech", code: "TECH", headOfDepartment: "Yulia Pavlova", employeeCount: 2 },
  { id: "DEP-[#242427]", name: "Product", code: "PROD", headOfDepartment: "Bogdan Novak", employeeCount: 1 },
  { id: "DEP-HR", name: "HR", code: "HR", headOfDepartment: "Sophia Chen", employeeCount: 2 },
  { id: "DEP-SALES", name: "Sales", code: "SALES", headOfDepartment: "Marcus Vance", employeeCount: 1 },
  { id: "DEP-FIN", name: "Finance", code: "FIN", headOfDepartment: "Amanda Smith", employeeCount: 1 },
  { id: "DEP-DES", name: "Design", code: "DES", headOfDepartment: "Charles Dubois", employeeCount: 1 },
]

const initialDesignations: Designation[] = [
  { id: "DESG-01", title: "Senior Frontend Engineer", department: "Tech", salaryGrade: "G-08", minSalary: 70000, maxSalary: 110000 },
  { id: "DESG-02", title: "Technical Product Manager", department: "Product", salaryGrade: "G-09", minSalary: 80000, maxSalary: 130000 },
  { id: "DESG-03", title: "Chief People Officer", department: "HR", salaryGrade: "G-10", minSalary: 100000, maxSalary: 160000 },
  { id: "DESG-04", title: "DevOps Architect", department: "Tech", salaryGrade: "G-09", minSalary: 85000, maxSalary: 140000 },
  { id: "DESG-05", title: "Sales Director", department: "Sales", salaryGrade: "G-08", minSalary: 65000, maxSalary: 110000 },
  { id: "DESG-06", title: "Financial Controller", department: "Finance", salaryGrade: "G-08", minSalary: 75000, maxSalary: 120000 },
  { id: "DESG-07", title: "Senior UX Designer", department: "Design", salaryGrade: "G-07", minSalary: 60000, maxSalary: 95000 },
  { id: "DESG-08", title: "HR Specialist", department: "HR", salaryGrade: "G-05", minSalary: 45000, maxSalary: 70000 },
]

const initialEmployees: Employee[] = [
  {
    id: "EMP-001",
    name: "Yulia Pavlova",
    role: "Senior Frontend Engineer",
    department: "Tech",
    reportsTo: "Bogdan Novak",
    email: "yulia@hkctrading.erp",
    phone: "+251 91 123 4567",
    status: "Active",
    statusColor: "bg-green-100 text-green-700 border border-green-200",
    joinDate: "Mar 15, 2024",
    employmentType: "Full-Time",
    salary: 85000,
    paymentStatus: "Paid",
    paymentStatusColor: "bg-black/5 text-gray-600",
    presentToday: true,
    avatarBg: "bg-green-200",
    initials: "YP",
    bankAccount: "CBE-10002938481",
    bankName: "Commercial Bank of Ethiopia",
    emergencyContactName: "Dmitri Pavlov",
    emergencyContactPhone: "+251 92 333 4455",
  },
  {
    id: "EMP-002",
    name: "Bogdan Novak",
    role: "Technical Product Manager",
    department: "Product",
    reportsTo: "Sophia Chen",
    email: "bogdan@hkctrading.erp",
    phone: "+251 91 234 5678",
    status: "Active",
    statusColor: "bg-green-100 text-green-700 border border-green-200",
    joinDate: "Jan 10, 2023",
    employmentType: "Full-Time",
    salary: 95000,
    paymentStatus: "Pending",
    paymentStatusColor: "bg-zinc-100 text-zinc-700 border border-zinc-200",
    presentToday: true,
    avatarBg: "bg-zinc-200",
    initials: "BN",
    bankAccount: "CBE-10008827361",
    bankName: "Commercial Bank of Ethiopia",
  },
  {
    id: "EMP-003",
    name: "Sophia Chen",
    role: "Chief People Officer",
    department: "HR",
    email: "sophia@hkctrading.erp",
    phone: "+251 91 345 6789",
    status: "Active",
    statusColor: "bg-green-100 text-green-700 border border-green-200",
    joinDate: "May 12, 2022",
    employmentType: "Full-Time",
    salary: 120000,
    paymentStatus: "Paid",
    paymentStatusColor: "bg-black/5 text-gray-600",
    presentToday: true,
    avatarBg: "bg-zinc-200",
    initials: "SC",
    bankAccount: "BOA-49281726",
    bankName: "Bank of Abyssinia",
  },
  {
    id: "EMP-004",
    name: "Alex Mercer",
    role: "DevOps Architect",
    department: "Tech",
    reportsTo: "Yulia Pavlova",
    email: "alex@hkctrading.erp",
    phone: "+251 91 456 7890",
    status: "On Leave",
    statusColor: "bg-zinc-100 text-zinc-700 border border-zinc-200",
    joinDate: "Nov 01, 2023",
    employmentType: "Full-Time",
    salary: 105000,
    paymentStatus: "Paid",
    paymentStatusColor: "bg-black/5 text-gray-600",
    presentToday: false,
    avatarBg: "bg-green-200",
    initials: "AM",
    bankAccount: "CBE-10009938271",
    bankName: "Commercial Bank of Ethiopia",
  },
  {
    id: "EMP-005",
    name: "Marcus Vance",
    role: "Sales Director",
    department: "Sales",
    email: "marcus@hkctrading.erp",
    phone: "+251 91 567 8901",
    status: "Active",
    statusColor: "bg-green-100 text-green-700 border border-green-200",
    joinDate: "Jul 24, 2024",
    employmentType: "Full-Time",
    salary: 78000,
    paymentStatus: "Processing",
    paymentStatusColor: "bg-green-100/40 text-green-700 border border-green-200/40",
    presentToday: true,
    avatarBg: "bg-zinc-200",
    initials: "MV",
    bankAccount: "BOA-88371920",
    bankName: "Bank of Abyssinia",
  },
  {
    id: "EMP-006",
    name: "Amanda Smith",
    role: "Financial Controller",
    department: "Finance",
    email: "amanda@hkctrading.erp",
    phone: "+251 91 678 9012",
    status: "Active",
    statusColor: "bg-green-100 text-green-700 border border-green-200",
    joinDate: "Sep 18, 2023",
    employmentType: "Full-Time",
    salary: 90000,
    paymentStatus: "Paid",
    paymentStatusColor: "bg-black/5 text-gray-600",
    presentToday: true,
    avatarBg: "bg-zinc-200",
    initials: "AS",
    bankAccount: "CBE-10005544332",
    bankName: "Commercial Bank of Ethiopia",
  },
  {
    id: "EMP-007",
    name: "Charles Dubois",
    role: "Senior UX Designer",
    department: "Design",
    email: "charles@hkctrading.erp",
    phone: "+251 91 789 0123",
    status: "Active",
    statusColor: "bg-green-100 text-green-700 border border-green-200",
    joinDate: "Feb 20, 2024",
    employmentType: "Full-Time",
    salary: 72000,
    paymentStatus: "Pending",
    paymentStatusColor: "bg-zinc-100 text-zinc-700 border border-zinc-200",
    presentToday: true,
    avatarBg: "bg-zinc-200",
    initials: "CD",
    bankAccount: "BOA-11223344",
    bankName: "Bank of Abyssinia",
  },
  {
    id: "EMP-008",
    name: "Elena Rostova",
    role: "HR Specialist",
    department: "HR",
    reportsTo: "Sophia Chen",
    email: "elena@hkctrading.erp",
    phone: "+251 91 890 1234",
    status: "Probation",
    statusColor: "bg-amber-100 text-amber-800 border border-amber-200",
    joinDate: "May 05, 2026",
    employmentType: "Full-Time",
    salary: 55000,
    paymentStatus: "Paid",
    paymentStatusColor: "bg-black/5 text-gray-600",
    presentToday: true,
    avatarBg: "bg-green-200",
    initials: "ER",
    bankAccount: "CBE-10007788990",
    bankName: "Commercial Bank of Ethiopia",
  },
]

const initialJobOpenings: JobOpening[] = [
  {
    id: "JOB-2026-01",
    title: "Senior Full-Stack Engineer",
    department: "Tech",
    designation: "Senior Frontend Engineer",
    vacancies: 2,
    location: "Addis Ababa HQ / Hybrid",
    status: "Open",
    postedDate: "2026-07-01",
    description: "Seeking experienced React & Node.js engineers to expand our cloud trade platforms.",
    type: "Full-Time",
  },
  {
    id: "JOB-2026-02",
    title: "Logistics Specialist",
    department: "Operations",
    designation: "Logistics Coordinator",
    vacancies: 1,
    location: "Bole Distribution Center",
    status: "Open",
    postedDate: "2026-07-10",
    description: "Manage customs clearance, freight scheduling, and warehouse inventory dispatch.",
    type: "Full-Time",
  },
  {
    id: "JOB-2026-03",
    title: "Financial Accountant",
    department: "Finance",
    designation: "Financial Controller",
    vacancies: 1,
    location: "Addis Ababa HQ",
    status: "In Review",
    postedDate: "2026-06-15",
    description: "Handle general ledger reconciliation, tax filings, and monthly trial balance closing.",
    type: "Full-Time",
  },
]

const initialJobApplicants: JobApplicant[] = [
  {
    id: "APP-101",
    jobOpeningId: "JOB-2026-01",
    jobTitle: "Senior Full-Stack Engineer",
    applicantName: "Dawit Wolde",
    email: "dawit.wolde@gmail.com",
    phone: "+251 91 112 2334",
    stage: "Interview",
    appliedDate: "2026-07-05",
    interviewDate: "2026-07-26",
    rating: 4,
    notes: "Strong technical background in TypeScript and distributed systems.",
  },
  {
    id: "APP-102",
    jobOpeningId: "JOB-2026-01",
    jobTitle: "Senior Full-Stack Engineer",
    applicantName: "Bethlehem Tadesse",
    email: "bethlehem.t@yahoo.com",
    phone: "+251 92 223 3445",
    stage: "Offered",
    appliedDate: "2026-07-02",
    interviewDate: "2026-07-18",
    rating: 5,
    notes: "Outstanding system design interview performance. Offer letter dispatched.",
  },
  {
    id: "APP-103",
    jobOpeningId: "JOB-2026-02",
    jobTitle: "Logistics Specialist",
    applicantName: "Amanuel Girma",
    email: "amanuel.girma@outlook.com",
    phone: "+251 93 334 4556",
    stage: "Screening",
    appliedDate: "2026-07-12",
    rating: 3,
    notes: "5 years experience in customs freight tracking.",
  },
]

const initialOnboardings: OnboardingProcess[] = [
  {
    id: "ONB-2026-01",
    employeeId: "EMP-008",
    employeeName: "Elena Rostova",
    department: "HR",
    role: "HR Specialist",
    startDate: "2026-05-05",
    status: "In Progress",
    tasks: [
      { id: "T1", title: "Setup Company Email & Slack Credentials", category: "IT Setup", completed: true, assignedTo: "IT Support" },
      { id: "T2", title: "Collect National ID & Tax Identification", category: "HR Documentation", completed: true, assignedTo: "HR Admin" },
      { id: "T3", title: "Assign Laptop & Desk Hardware", category: "Workspace & Equipment", completed: true, assignedTo: "IT Support" },
      { id: "T4", title: "Complete Company Safety & ERP Workflow Orientation", category: "Orientation", completed: false, assignedTo: "Sophia Chen" },
    ],
  },
]

const initialSeparations: SeparationProcess[] = [
  {
    id: "SEP-2026-01",
    employeeId: "EMP-007",
    employeeName: "Charles Dubois",
    department: "Design",
    role: "Senior UX Designer",
    resignationDate: "2026-07-01",
    exitDate: "2026-07-31",
    reason: "Relocating abroad for higher education.",
    status: "Clearance Pending",
    clearances: [
      { id: "C1", department: "IT", cleared: true, clearedBy: "Alex Mercer", notes: "Returned MacBook Pro and security badge." },
      { id: "C2", department: "Finance", cleared: true, clearedBy: "Amanda Smith", notes: "No outstanding travel advances or loans." },
      { id: "C3", department: "HR", cleared: false, notes: "Pending final exit interview sign-off." },
      { id: "C4", department: "Department Head", cleared: true, clearedBy: "Bogdan Novak", notes: "Knowledge transfer completed." },
    ],
    finalSettlementAmount: 118000,
    settlementPaid: false,
  },
]

const initialLeaveTypes: LeaveType[] = [
  { id: "LT-ANNUAL", name: "Annual Paid Leave", maxDaysPerYear: 24, carriesForward: true, isUnpaid: false },
  { id: "LT-SICK", name: "Medical / Sick Leave", maxDaysPerYear: 12, carriesForward: false, isUnpaid: false },
  { id: "LT-MATERNITY", name: "Maternity / Paternity Leave", maxDaysPerYear: 90, carriesForward: false, isUnpaid: false },
  { id: "LT-UNPAID", name: "Unpaid Special Leave", maxDaysPerYear: 30, carriesForward: false, isUnpaid: true },
  { id: "LT-COMPASSIONATE", name: "Compassionate Leave", maxDaysPerYear: 5, carriesForward: false, isUnpaid: false },
]

const initialLeaveRequests: LeaveRequest[] = [
  {
    id: "LR-101",
    employeeId: "EMP-003",
    employeeName: "Sophia Chen",
    role: "Chief People Officer",
    avatar: "SC",
    leaveTypeId: "LT-ANNUAL",
    type: "Annual Paid Leave",
    startDate: "2026-07-10",
    endDate: "2026-07-12",
    range: "Jul 10 - Jul 12, 2026",
    totalDays: 3,
    reason: "Family engagement travel & personal restructuring.",
    status: "Pending",
    appliedOn: "2026-07-01",
  },
  {
    id: "LR-102",
    employeeId: "EMP-004",
    employeeName: "Alex Mercer",
    role: "DevOps Architect",
    avatar: "AM",
    leaveTypeId: "LT-SICK",
    type: "Medical / Sick Leave",
    startDate: "2026-07-14",
    endDate: "2026-07-15",
    range: "Jul 14 - Jul 15, 2026",
    totalDays: 2,
    reason: "Routine outpatient health assessment & calibration.",
    status: "Approved",
    appliedOn: "2026-07-08",
  },
  {
    id: "LR-103",
    employeeId: "EMP-005",
    employeeName: "Marcus Vance",
    role: "Sales Director",
    avatar: "MV",
    leaveTypeId: "LT-ANNUAL",
    type: "Annual Paid Leave",
    startDate: "2026-07-22",
    endDate: "2026-07-26",
    range: "Jul 22 - Jul 26, 2026",
    totalDays: 5,
    reason: "Annual vacation renewal with family.",
    status: "Pending",
    appliedOn: "2026-07-15",
  },
]

const initialExpenseClaims: HRExpenseClaim[] = [
  {
    id: "HRC-8012",
    claimNumber: "EXP-8012",
    employeeId: "EMP-004",
    employeeName: "Alex Mercer",
    department: "Tech",
    title: "AWS Cloud Server Subscription",
    category: "Office Supplies",
    claimDate: "2026-07-05",
    amount: 12450.00,
    currency: "ETB",
    description: "Cloud server renewal for July staging environment.",
    status: "Approved",
    financeExpenseId: "EXP-8012",
  },
  {
    id: "HRC-8011",
    claimNumber: "EXP-8011",
    employeeId: "EMP-005",
    employeeName: "Marcus Vance",
    department: "Sales",
    title: "Delta Air Lines Client Visit",
    category: "Travel & Lodging",
    claimDate: "2026-07-04",
    amount: 1850.50,
    currency: "ETB",
    description: "Flight tickets for regional trading partner meeting.",
    status: "Pending Approval",
  },
  {
    id: "HRC-8010",
    claimNumber: "EXP-8010",
    employeeId: "EMP-003",
    employeeName: "Sophia Chen",
    department: "HR",
    title: "Salesforce CRM Team License",
    category: "Office Supplies",
    claimDate: "2026-06-30",
    amount: 4200.00,
    currency: "ETB",
    description: "Monthly subscription for HR applicant tracking integration.",
    status: "Approved",
    financeExpenseId: "EXP-8010",
  },
]

const initialAppraisals: PerformanceAppraisal[] = [
  {
    id: "APP-Q2-001",
    cycle: "Q2 2026 Performance Review",
    employeeId: "EMP-001",
    employeeName: "Yulia Pavlova",
    role: "Senior Frontend Engineer",
    department: "Tech",
    reviewerName: "Bogdan Novak",
    reviewDate: "2026-06-30",
    selfRating: 4.8,
    managerRating: 4.7,
    finalScore: 4.75,
    status: "Completed",
    kras: [
      { name: "Code Quality & Architecture", target: "95% lint clean & reusable components", achieveScore: 4.8, comments: "Exceeded expectations in frontend performance refactoring." },
      { name: "Project Delivery On-Time", target: "100% on-time sprint milestones", achieveScore: 4.7, comments: "Delivered inventory stock grid 2 days ahead of schedule." },
    ],
    overallFeedback: "Yulia is an exceptional technical leader. Highly recommended for senior architect promotion.",
  },
  {
    id: "APP-Q2-002",
    cycle: "Q2 2026 Performance Review",
    employeeId: "EMP-002",
    employeeName: "Bogdan Novak",
    role: "Technical Product Manager",
    department: "Product",
    reviewerName: "Sophia Chen",
    reviewDate: "2026-06-28",
    selfRating: 4.5,
    managerRating: 4.5,
    finalScore: 4.5,
    status: "Completed",
    kras: [
      { name: "Product Roadmap Planning", target: "Complete Q3 module specs", achieveScore: 4.6, comments: "Comprehensive documentation produced." },
      { name: "Cross-Functional Sync", target: "Weekly alignment meetings", achieveScore: 4.4, comments: "Great collaboration across Sales and HR." },
    ],
    overallFeedback: "Consistent performance in product execution.",
  },
]

const initialTrainingPrograms: TrainingProgram[] = [
  {
    id: "TRN-101",
    title: "Advanced React 19 & TypeScript State Patterns",
    category: "Technical",
    trainer: "External Tech Academy",
    startDate: "2026-08-01",
    endDate: "2026-08-03",
    location: "HQ Training Room A / Online",
    maxSeats: 15,
    enrolledCount: 8,
    status: "Upcoming",
    description: "Deep dive into performance optimization, state stores, and enterprise architecture.",
  },
  {
    id: "TRN-102",
    title: "International Trade & Customs Compliance 2026",
    category: "Compliance & Safety",
    trainer: "Customs Authority Advisor",
    startDate: "2026-07-15",
    endDate: "2026-07-16",
    location: "Conference Hall B",
    maxSeats: 25,
    enrolledCount: 20,
    status: "In Progress",
    description: "Updated tariffs, export documentation standards, and tax audit compliance.",
  },
]

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
    this.loadFromLocalStorage()
  }

  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem("hkc_hr_store_v1")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.employees) this.employees = parsed.employees
        if (parsed.departments) this.departments = parsed.departments
        if (parsed.designations) this.designations = parsed.designations
        if (parsed.jobOpenings) this.jobOpenings = parsed.jobOpenings
        if (parsed.jobApplicants) this.jobApplicants = parsed.jobApplicants
        if (parsed.onboardings) this.onboardings = parsed.onboardings
        if (parsed.separations) this.separations = parsed.separations
        if (parsed.leaveTypes) this.leaveTypes = parsed.leaveTypes
        if (parsed.leaveRequests) this.leaveRequests = parsed.leaveRequests
        if (parsed.expenseClaims) this.expenseClaims = parsed.expenseClaims
        if (parsed.appraisals) this.appraisals = parsed.appraisals
        if (parsed.trainingPrograms) this.trainingPrograms = parsed.trainingPrograms
      }
    } catch {
      // Use initial defaults if parse fails
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(
        "hkc_hr_store_v1",
        JSON.stringify({
          employees: this.employees,
          departments: this.departments,
          designations: this.designations,
          jobOpenings: this.jobOpenings,
          jobApplicants: this.jobApplicants,
          onboardings: this.onboardings,
          separations: this.separations,
          leaveTypes: this.leaveTypes,
          leaveRequests: this.leaveRequests,
          expenseClaims: this.expenseClaims,
          appraisals: this.appraisals,
          trainingPrograms: this.trainingPrograms,
        })
      )
    } catch {
      // Ignore
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.saveToLocalStorage()
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
        { id: "T4", title: "Team Orientation & ERP System Walkthrough", category: "Orientation", completed: false, assignedTo: "Sophia Chen" },
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
