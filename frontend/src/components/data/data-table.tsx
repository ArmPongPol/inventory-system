"use client"

import { motion } from "framer-motion"
import { Inbox, RotateCw, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { errorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string
  isLoading?: boolean
  isFetching?: boolean
  error?: unknown
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  skeletonRows?: number
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  isFetching,
  error,
  onRetry,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  skeletonRows = 6,
}: DataTableProps<T>) {
  const colSpan = columns.length

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-xs transition-opacity",
        isFetching && !isLoading && "opacity-70"
      )}
    >
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "h-10 px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase",
                  col.className
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {columns.map((col) => (
                  <TableCell key={col.key} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-36" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : error ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colSpan}>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
                      <TriangleAlert />
                    </EmptyMedia>
                    <EmptyTitle>Couldn&apos;t load data</EmptyTitle>
                    <EmptyDescription>{errorMessage(error)}</EmptyDescription>
                  </EmptyHeader>
                  {onRetry && (
                    <EmptyContent>
                      <Button variant="outline" size="sm" onClick={onRetry}>
                        <RotateCw /> Try again
                      </Button>
                    </EmptyContent>
                  )}
                </Empty>
              </TableCell>
            </TableRow>
          ) : !rows || rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colSpan}>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Inbox />
                    </EmptyMedia>
                    <EmptyTitle>{emptyTitle}</EmptyTitle>
                    {emptyDescription && (
                      <EmptyDescription>{emptyDescription}</EmptyDescription>
                    )}
                  </EmptyHeader>
                  {emptyAction && <EmptyContent>{emptyAction}</EmptyContent>}
                </Empty>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, i) => (
              <motion.tr
                key={rowKey(row)}
                data-slot="table-row"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i, 12) * 0.025 }}
                className="border-b transition-colors last:border-0 hover:bg-muted/40"
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={cn("px-4 py-3", col.className)}>
                    {col.cell(row)}
                  </TableCell>
                ))}
              </motion.tr>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
