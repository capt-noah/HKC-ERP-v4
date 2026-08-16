
---

### 👥 Human Resources Section

#### 1. HR Dashboard (`/hr`)
- **Functional Purpose:** Visualizes personnel metrics, interviews, weekly calendar schedules, and staff rosters.

#### 2. Employees Staff Roster (`/hr/employees`)
- **Functional Purpose:** Houses the official personnel directory, staff department assignments, and salary records.

#### 3. Payroll Disbursement (`/hr/payroll`)
- **Functional Purpose:** Manages monthly salary dispersals, tax withholdings, allowances, and payment states.

#### 4. Attendance & Leave Matrix (`/hr/attendance-leave`)
- **Functional Purpose:** Logs employee day-to-day attendance and vacation/sick leave approvals.

---


## Store and Context Dependencies
The HR dashboard and modules are deeply integrated with:
- `hrApi.ts` (`src/lib/hrApi.ts`): All HTTP data requests (e.g., `loadHRData()`) for loading personnel, attendance matrices, and payroll periods are executed through this wrapper.
- `useAuthStore` (`src/lib/authStore.ts`): Restricts view and edit abilities specifically to `hr_manager` and `superadmin`.
