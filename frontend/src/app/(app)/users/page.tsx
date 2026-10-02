import type { Metadata } from "next"
import { Suspense } from "react"

import { PageSkeleton } from "@/components/layout/page-skeleton"
import { UsersView } from "./users-view"

export const metadata: Metadata = { title: "Users" }

export default function UsersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UsersView />
    </Suspense>
  )
}
