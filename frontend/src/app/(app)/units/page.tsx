import type { Metadata } from "next"
import { Suspense } from "react"

import { PageSkeleton } from "@/components/layout/page-skeleton"
import { UnitsView } from "./units-view"

export const metadata: Metadata = { title: "Units" }

export default function UnitsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UnitsView />
    </Suspense>
  )
}
