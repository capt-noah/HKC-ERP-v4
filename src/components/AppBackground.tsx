import React from "react"

export const AppBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
    >
      {/* Clean Solid Base Canvas */}
      <div className="absolute inset-0 bg-[#f8faf9] dark:bg-[#09090b] transition-colors duration-500" />

      {/* Primary Luminous Green Sphere (Top-Left / Header & KPI Area) */}
      <div
        className="absolute -top-[140px] -left-[100px] w-[750px] md:w-[900px] h-[750px] md:h-[900px] rounded-full blur-[70px] md:blur-[90px] opacity-85 dark:opacity-40 transition-all duration-700"
        style={{
          background:
            "radial-gradient(circle, rgba(34, 197, 94, 0.20) 0%, rgba(22, 163, 74, 0.11) 32%, rgba(16, 185, 129, 0.04) 58%, transparent 75%)",
        }}
      />

      {/* Secondary Soft Ambient Green Sphere (Mid-Right / Lower-Right) */}
      <div
        className="absolute top-[38%] -right-[150px] w-[600px] md:w-[750px] h-[600px] md:h-[750px] rounded-full blur-[80px] md:blur-[100px] opacity-60 dark:opacity-30 transition-all duration-700"
        style={{
          background:
            "radial-gradient(circle, rgba(34, 197, 94, 0.13) 0%, rgba(16, 185, 129, 0.05) 40%, transparent 70%)",
        }}
      />
    </div>
  )
}

export default AppBackground

