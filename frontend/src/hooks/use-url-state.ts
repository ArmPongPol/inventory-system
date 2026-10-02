"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

type Value = string | number | boolean | null | undefined

/**
 * Keeps list state (page, search, filters) in the URL so it survives reloads
 * and can be shared. Callers must sit inside a <Suspense> boundary.
 */
export function useUrlState() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const get = useCallback(
    (key: string) => searchParams.get(key) ?? undefined,
    [searchParams]
  )

  const set = useCallback(
    (updates: Record<string, Value>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null || value === "") next.delete(key)
        else next.set(key, String(value))
      }
      // Any filter change goes back to the first page.
      if (!("page" in updates)) next.delete("page")
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const page = Math.max(1, Number(searchParams.get("page")) || 1)

  return { get, set, page }
}
