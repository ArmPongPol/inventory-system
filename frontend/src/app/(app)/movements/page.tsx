import type { Metadata } from "next"
import { Suspense } from "react"

import { PageSkeleton } from "@/components/layout/page-skeleton"
import { MovementsView } from "./movements-view"

export const metadata: Metadata = { title: "Movements" }

export default function MovementsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MovementsView />
    </Suspense>
  )
}
