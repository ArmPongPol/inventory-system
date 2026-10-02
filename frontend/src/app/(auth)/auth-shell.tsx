"use client"

import { motion } from "framer-motion"
import { ArrowLeftRight, Boxes, ShieldCheck, TriangleAlert } from "lucide-react"

import { Logo } from "@/components/layout/logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"

const FEATURES = [
  { icon: Boxes, text: "Live stock levels across every warehouse" },
  { icon: ArrowLeftRight, text: "Receive, issue, transfer and reserve in a click" },
  { icon: TriangleAlert, text: "Low-stock alerts before shelves run empty" },
  { icon: ShieldCheck, text: "A complete, append-only movement ledger" },
]

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh flex-1 lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-maroon text-cream lg:flex lg:flex-col lg:justify-between lg:p-12">
        <motion.div
          aria-hidden
          className="absolute -top-32 -right-32 size-[28rem] rounded-full bg-crimson/40 blur-3xl"
          animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0.85, 0.6] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-40 -left-24 size-[30rem] rounded-full bg-sand/15 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <Logo className="relative" />
        <div className="relative space-y-8">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-md font-heading text-4xl leading-tight font-semibold tracking-tight"
          >
            Know exactly what&apos;s on your shelves.
          </motion.h2>
          <ul className="space-y-4">
            {FEATURES.map((f, i) => (
              <motion.li
                key={f.text}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.08, duration: 0.45 }}
                className="flex items-center gap-3 text-cream/85"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-cream/10 ring-1 ring-cream/15">
                  <f.icon className="size-4 text-sand" />
                </span>
                {f.text}
              </motion.li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-cream/50">
          © {new Date().getFullYear()} Stockroom · Inventory Management System
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col bg-brand-glow">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <Logo className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
