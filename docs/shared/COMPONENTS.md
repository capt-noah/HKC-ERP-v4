## Core Shared Components

1. **`FloatingNav` (`/src/components/FloatingNav.tsx`):** Fixed navigation bar with brand, menu navigation, and quick action pills.
2. **`SubPageNav` (`/src/components/SubPageNav.tsx`):** Local page submenu controller fed by `src/lib/nav-config.ts`.
3. **`GlassCard` (`/src/components/GlassCard.tsx`):** Modular glassmorphism card wrapper using Framer Motion.
4. **`HRTable` Utilities (`/src/components/HRTable.tsx`):** Shared tables, search toolbars, and sort hooks for HR pages.
5. **`ResizableTable` (`/src/components/ResizableTable.tsx`):** Shared column resizing and popover sorting hook for Finance tables.
6. **`FinanceTableToolbar` (`/src/components/FinanceTableToolbar.tsx`):** Standardized header toolbar for Finance tables.
7. **`FeedbackContext` (`/src/context/FeedbackContext.tsx`):** Global toast and confirmation dialog provider.

---

## Code Style & Design Guidelines for Developers

1. **Keep Imports Safe:** Always import motion properties from standard `"framer-motion"`.
2. **Never Overpopulate the Screen:** Respect negative space. Each dashboard card should have ample margins (`mb-6`, `gap-5`, `p-6`).
3. **Use the `GlassCard` Component:** Wrap cards in `<GlassCard>` to benefit from entry animations and backdrop filters.
4. **Icons:** Exclusively use the `lucide-react` library.
5. **Subpage Navigation Layout:** Sub-navigation pills must always be placed on the far right using `<SubPageNav />`.
6. **Use `useFeedback()` for toasts:** All user notifications use `FeedbackContext`.
7. **Concise Page Headers:** Keep page descriptions under main titles short and direct (5–10 words max).
