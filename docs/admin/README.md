### ⚙️ Admin Section

#### 1. Admin Control Center (`/admin`)
- **Functional Purpose:** The primary administrative control deck tracking general revenue, system audit logs, and quick user accesses.

#### 2. User Management (`/admin/users`)
- **Functional Purpose:** Administers internal accounts, edits security privileges, and invites new users.

#### 3. System Settings (`/admin/settings`)
- **Functional Purpose:** Controls enterprise configurations, currency preferences, backup policies, and API keys.

---

## 🧱 Core Shared Components

1. **`FloatingNav` (`/src/components/FloatingNav.tsx`):** Fixed navigation bar with brand, menu navigation, and quick action pills.
2. **`SubPageNav` (`/src/components/SubPageNav.tsx`):** Local page submenu controller fed by `src/lib/nav-config.ts`.
3. **`GlassCard` (`/src/components/GlassCard.tsx`):** Modular glassmorphism card wrapper using Framer Motion.
4. **`HRTable` Utilities (`/src/components/HRTable.tsx`):** Shared tables, search toolbars, and sort hooks for HR pages.
5. **`ResizableTable` (`/src/components/ResizableTable.tsx`):** Shared column resizing and popover sorting hook for Finance tables.

## Store and Context Dependencies
The admin modules heavily rely on:
- `useAuthStore` (`src/lib/authStore.ts`): Provides session data and checks role capabilities.
- `useErpStore` (`src/lib/erpStore.ts`): Sources the general system state for metrics.
- `useFeedbackContext` (`src/context/FeedbackContext.tsx`): Displays notifications, alerts, and confirmation dialogs upon system configuration changes.
