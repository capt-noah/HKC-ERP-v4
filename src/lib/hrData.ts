export interface Employee {
  id: string
  name: string
  role: string
  department: string
  email: string
  status: "Active" | "On Leave" | "Suspended"
  statusColor: string
  joinDate: string
  salary: number
  paymentStatus: "Paid" | "Pending" | "Processing"
  paymentStatusColor: string
  presentToday: boolean
  avatarBg: string
  initials: string
}

export const hrStats = {
  employeeCount: "1,248",
  hiringsCount: "12",
  leaveCount: "5",
  interviewProgress: "70%",
  hiredProgress: "10%",
}

export const initialEmployees: Employee[] = [
  {
    id: "EMP-001",
    name: "Yulia Pavlova",
    role: "Senior Frontend Engineer",
    department: "Tech",
    email: "yulia@hkctrading.erp",
    status: "Active",
    statusColor: "bg-green-100 text-green-700 border border-green-200",
    joinDate: "Mar 15, 2024",
    salary: 85000,
    paymentStatus: "Paid",
    paymentStatusColor: "bg-black/5 text-gray-600",
    presentToday: true,
    avatarBg: "bg-green-200",
    initials: "YP",
  },
  {
    id: "EMP-002",
    name: "Bogdan Novak",
    role: "Technical Product Manager",
    department: "Product",
    email: "bogdan@hkctrading.erp",
    status: "Active",
    statusColor: "bg-green-100 text-green-700 border border-green-200",
    joinDate: "Jan 10, 2023",
    salary: 95000,
    paymentStatus: "Pending",
    paymentStatusColor: "bg-zinc-100 text-zinc-700 border border-zinc-200",
    presentToday: true,
    avatarBg: "bg-zinc-200",
    initials: "BN",
  },
  {
    id: "EMP-003",
    name: "Sophia Chen",
    role: "Chief People Officer",
    department: "HR",
    email: "sophia@hkctrading.erp",
    status: "Active",
    statusColor: "bg-green-100 text-green-700 border border-green-200",
    joinDate: "May 12, 2022",
    salary: 120000,
    paymentStatus: "Paid",
    paymentStatusColor: "bg-black/5 text-gray-600",
    presentToday: true,
    avatarBg: "bg-zinc-200",
    initials: "SC",
  },
  {
    id: "EMP-004",
    name: "Alex Mercer",
    role: "DevOps Architect",
    department: "Tech",
    email: "alex@hkctrading.erp",
    status: "On Leave",
    statusColor: "bg-zinc-100 text-zinc-700 border border-zinc-200",
    joinDate: "Nov 01, 2023",
    salary: 105000,
    paymentStatus: "Paid",
    paymentStatusColor: "bg-black/5 text-gray-600",
    presentToday: false,
    avatarBg: "bg-green-200",
    initials: "AM",
  },
  {
    id: "EMP-005",
    name: "Marcus Vance",
    role: "Sales Director",
    department: "Sales",
    email: "marcus@hkctrading.erp",
    status: "Active",
    statusColor: "bg-green-100 text-green-700 border border-green-200",
    joinDate: "Jul 24, 2024",
    salary: 78000,
    paymentStatus: "Processing",
    paymentStatusColor: "bg-green-100/40 text-green-700 border border-green-200/40",
    presentToday: true,
    avatarBg: "bg-zinc-200",
    initials: "MV",
  },
  {
    id: "EMP-006",
    name: "Amanda Smith",
    role: "Financial Controller",
    department: "Finance",
    email: "amanda@hkctrading.erp",
    status: "Active",
    statusColor: "bg-green-100 text-green-700 border border-green-200",
    joinDate: "Sep 18, 2023",
    salary: 90000,
    paymentStatus: "Paid",
    paymentStatusColor: "bg-black/5 text-gray-600",
    presentToday: true,
    avatarBg: "bg-zinc-200",
    initials: "AS",
  },
  {
    id: "EMP-007",
    name: "Charles Dubois",
    role: "Senior UX Designer",
    department: "Design",
    email: "charles@hkctrading.erp",
    status: "Active",
    statusColor: "bg-green-100 text-green-700 border border-green-200",
    joinDate: "Feb 20, 2024",
    salary: 72000,
    paymentStatus: "Pending",
    paymentStatusColor: "bg-zinc-100 text-zinc-700 border border-zinc-200",
    presentToday: true,
    avatarBg: "bg-zinc-200",
    initials: "CD",
  },
  {
    id: "EMP-008",
    name: "Elena Rostova",
    role: "HR Specialist",
    department: "HR",
    email: "elena@hkctrading.erp",
    status: "Active",
    statusColor: "bg-green-100 text-green-700 border border-green-200",
    joinDate: "May 05, 2025",
    salary: 55000,
    paymentStatus: "Paid",
    paymentStatusColor: "bg-black/5 text-gray-600",
    presentToday: true,
    avatarBg: "bg-green-200",
    initials: "ER",
  }
]
