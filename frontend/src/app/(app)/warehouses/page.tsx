import type { Metadata } from "next"
import { Suspense } from "react"

import { PageSkeleton } from "@/components/layout/page-skeleton"
import { WarehousesView } from "./warehouses-view"

export const metadata: Metadata = { title: "Warehouses" }

export default function WarehousesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WarehousesView />
    </Suspense>
  )
}
