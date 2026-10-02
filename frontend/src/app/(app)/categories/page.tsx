import type { Metadata } from "next"
import { Suspense } from "react"

import { PageSkeleton } from "@/components/layout/page-skeleton"
import { CategoriesView } from "./categories-view"

export const metadata: Metadata = { title: "Categories" }

export default function CategoriesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CategoriesView />
    </Suspense>
  )
}
