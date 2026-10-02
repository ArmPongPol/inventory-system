import type { Metadata } from "next"
import { Suspense } from "react"

import { PageSkeleton } from "@/components/layout/page-skeleton"
import { StockView } from "./stock-view"

export const metadata: Metadata = { title: "Stock operations" }

export default function StockPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StockView />
    </Suspense>
  )
}
