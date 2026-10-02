"use client"

import { motion, type HTMLMotionProps } from "framer-motion"

interface FadeInProps extends HTMLMotionProps<"div"> {
  delay?: number
  /** Vertical offset to slide in from, in px. */
  y?: number
}

export function FadeIn({ delay = 0, y = 8, children, ...props }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
