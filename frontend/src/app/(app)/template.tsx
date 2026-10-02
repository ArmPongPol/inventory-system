"use client"

import { motion } from "framer-motion"

// A template re-mounts on every navigation, so each page fades in.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6"
    >
      {children}
    </motion.div>
  )
}
