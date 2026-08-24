import React from "react"

export const AppBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
    >
      {/* Clean Solid Base Canvas */}
      <div className="absolute inset-0 bg-[#f8faf9] dark:bg-[#09090b] transition-colors duration-500" />

      {/* Primary Subtle Luminous Green Sphere (Top-Left / Header & KPI Area) */}
      <div
        className="absolute -top-[160px] -left-[120px] w-[800px] md:w-[1000px] h-[800px] md:h-[1000px] rounded-full blur-[80px] md:blur-[100px] opacity-80 dark:opacity-35 transition-all duration-700"
        style={{
          background:
            "radial-gradient(circle at 40% 40%, rgba(34, 197, 94, 0.18) 0%, rgba(16, 185, 129, 0.08) 35%, rgba(22, 163, 74, 0.02) 58%, transparent 76%)",
        }}
      />

      {/* Secondary Soft Ambient Green Sphere (Mid-Right / Lower Area) */}
      <div
        className="absolute top-[38%] -right-[140px] w-[600px] md:w-[750px] h-[600px] md:h-[750px] rounded-full blur-[90px] md:blur-[110px] opacity-60 dark:opacity-25 transition-all duration-700"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.10) 0%, rgba(16, 185, 129, 0.04) 38%, transparent 70%)",
        }}
      />
    </div>
  )
}

export default AppBackground


