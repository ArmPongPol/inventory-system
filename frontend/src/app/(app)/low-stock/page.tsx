import type { Metadata } from "next"
import { Suspense } from "react"

import { PageSkeleton } from "@/components/layout/page-skeleton"
import { LowStockView } from "./low-stock-view"

export const metadata: Metadata = { title: "Low stock" }

export default function LowStockPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LowStockView />
    </Suspense>
  )
}
