"use client"

import { useEffect, useRef } from "react"
import { animate, useReducedMotion } from "framer-motion"

const formatter = new Intl.NumberFormat("en-US")

/** Animates an integer from its previous value to `value`. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const previous = useRef(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (reduceMotion) {
      node.textContent = formatter.format(value)
      previous.current = value
      return
    }
    const controls = animate(previous.current, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        node.textContent = formatter.format(Math.round(latest))
      },
    })
    previous.current = value
    return () => controls.stop()
  }, [value, reduceMotion])

  return (
    <span ref={ref} className={className}>
      0
    </span>
  )
}
