"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

interface PaginationBarProps {
  page: number
  limit: number
  total: number | undefined
  onPageChange: (page: number) => void
}

export function PaginationBar({ page, limit, total, onPageChange }: PaginationBarProps) {
  if (!total) return null
  const pages = Math.max(1, Math.ceil(total / limit))
  const from = (page - 1) * limit + 1
  const to = Math.min(total, page * limit)

  return (
    <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
      <p className="tabular">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{" "}
        <span className="font-medium text-foreground">{total.toLocaleString("en-US")}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft /> Previous
        </Button>
        <span className="tabular px-1">
          Page {page} / {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
