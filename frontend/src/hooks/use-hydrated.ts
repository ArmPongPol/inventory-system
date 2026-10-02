"use client"

import { useSyncExternalStore } from "react"

const noopSubscribe = () => () => {}

/**
 * False on the server and while hydrating, true afterwards. Use it to render
 * client-only state (the signed-in user, the theme) without hydration mismatches.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}
