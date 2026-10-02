import type { Metadata } from "next"
import { Suspense } from "react"

import { PageSkeleton } from "@/components/layout/page-skeleton"
import { ProductsView } from "./products-view"

export const metadata: Metadata = { title: "Products" }

export default function ProductsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProductsView />
    </Suspense>
  )
}
