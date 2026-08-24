import React from "react"

export const AppBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
    >
      {/* Clean Solid Base Canvas */}
      <div className="absolute inset-0 bg-[#f6f8f7] dark:bg-[#09090b] transition-colors duration-500" />

      {/* Primary Luminous Green Sphere (Top-Left / Header, Logo, Title & KPI Area) */}
      <div
        className="absolute -top-[150px] -left-[100px] w-[800px] md:w-[1050px] h-[800px] md:h-[1050px] rounded-full blur-[65px] md:blur-[80px] opacity-95 dark:opacity-45 transition-all duration-700"
        style={{
          background:
            "radial-gradient(circle at 45% 45%, rgba(34, 197, 94, 0.48) 0%, rgba(16, 185, 129, 0.32) 26%, rgba(22, 163, 74, 0.15) 50%, rgba(34, 197, 94, 0.04) 70%, transparent 82%)",
        }}
      />

      {/* Secondary Soft Ambient Green Sphere (Mid-Right / Lower Area) */}
      <div
        className="absolute top-[35%] -right-[120px] w-[600px] md:w-[800px] h-[600px] md:h-[800px] rounded-full blur-[75px] md:blur-[95px] opacity-75 dark:opacity-35 transition-all duration-700"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.28) 0%, rgba(16, 185, 129, 0.14) 36%, rgba(34, 197, 94, 0.03) 60%, transparent 75%)",
        }}
      />
    </div>
  )
}

export default AppBackground


