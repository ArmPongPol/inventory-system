import type { Metadata } from "next"
import { Suspense } from "react"

import { PageSkeleton } from "@/components/layout/page-skeleton"
import { InventoryView } from "./inventory-view"

export const metadata: Metadata = { title: "Stock levels" }

export default function InventoryPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InventoryView />
    </Suspense>
  )
}
