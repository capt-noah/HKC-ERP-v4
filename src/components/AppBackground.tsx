import React from "react"

export const AppBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
    >
      {/* Base Canvas Clean Background */}
      <div className="absolute inset-0 bg-[#fafafa] dark:bg-[#09090b] transition-colors duration-500" />

      {/* Top-Left Subtle Emerald/Green Sphere */}
      <div
        className="absolute -top-[12%] -left-[10%] w-[45vw] min-w-[550px] max-w-[850px] h-[45vw] min-h-[550px] max-h-[850px] rounded-full blur-[80px] md:blur-[100px] opacity-75 dark:opacity-40 transition-all duration-700"
        style={{
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.14) 0%, rgba(5, 150, 105, 0.06) 45%, rgba(16, 185, 129, 0) 70%)",
        }}
      />

      {/* Mid-Right Accent Green Sphere */}
      <div
        className="absolute top-[32%] -right-[10%] w-[40vw] min-w-[500px] max-w-[750px] h-[40vw] min-h-[500px] max-h-[750px] rounded-full blur-[90px] md:blur-[110px] opacity-70 dark:opacity-35 transition-all duration-700"
        style={{
          background: "radial-gradient(circle, rgba(34, 197, 94, 0.11) 0%, rgba(16, 185, 129, 0.04) 45%, rgba(34, 197, 94, 0) 70%)",
        }}
      />

      {/* Bottom-Left Ambient Soft Sphere */}
      <div
        className="absolute -bottom-[15%] left-[18%] w-[35vw] min-w-[450px] max-w-[650px] h-[35vw] min-h-[450px] max-h-[650px] rounded-full blur-[100px] opacity-55 dark:opacity-25 transition-all duration-700"
        style={{
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.02) 50%, transparent 75%)",
        }}
      />

      {/* Very subtle organic geometric accent circle */}
      <div
        className="absolute top-[18%] right-[8%] w-[420px] h-[420px] rounded-full border border-emerald-500/[0.04] dark:border-emerald-400/[0.03] animate-spin-slow pointer-events-none"
        style={{ animationDuration: "140s" }}
      />
    </div>
  )
}

export default AppBackground
