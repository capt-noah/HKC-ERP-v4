import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface GlassCardProps extends React.ComponentPropsWithoutRef<typeof motion.div> {
  variant?: "light" | "dark"
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "light", initial, animate, transition, whileHover, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        "rounded-[1.75rem] p-6",
        variant === "dark" ? "glass-card-dark" : "glass-card",
        className
      )}
      initial={initial !== undefined ? initial : { opacity: 0, scale: 0.95 }}
      animate={animate !== undefined ? animate : { opacity: 1, scale: 1 }}
      transition={transition !== undefined ? transition : { duration: 0.4, ease: "easeOut" }}
      whileHover={whileHover !== undefined ? whileHover : { y: -2 }}
      {...props}
    />
  )
)
GlassCard.displayName = "GlassCard"
