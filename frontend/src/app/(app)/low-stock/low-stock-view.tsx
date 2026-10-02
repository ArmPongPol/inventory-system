"use client"

import Link from "next/link"
import { ArrowDownToLine } from "lucide-react"
import { motion } from "framer-motion"

import { DataTable, type Column } from "@/components/data/data-table"
import { PaginationBar } from "@/components/data/pagination-bar"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLowStock } from "@/features/inventory/queries"
import { WarehouseSelect } from "@/features/stock/warehouse-select"
import { useUrlState } from "@/hooks/use-url-state"
import { formatQty } from "@/lib/format"
import type { LowStockRow } from "@/types/api"

const LIMIT = 20

export function LowStockView() {
  const { get, set, page } = useUrlState()
  const warehouseId = get("warehouseId") ?? ""

  const query = useLowStock({ page, limit: LIMIT, warehouseId: warehouseId || undefined })

  const columns: Column<LowStockRow>[] = [
    {
      key: "product",
      header: "Product",
      cell: (r) => (
        <div className="min-w-40">
          <div className="font-medium">{r.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.sku}</div>
        </div>
      ),
    },
    {
      key: "level",
      header: "Stock level",
      className: "w-56 hidden sm:table-cell",
      cell: (r) => {
        const min = Number(r.minimumStock)
        const pct = min > 0 ? Math.min(100, (Number(r.quantity) / min) * 100) : 0
        return (
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-crimson to-maroon"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        )
      },
    },
    {
      key: "quantity",
      header: "On hand",
      className: "text-right",
      cell: (r) => <span className="tabular font-medium">{formatQty(r.quantity)}</span>,
    },
    {
      key: "minimum",
      header: "Minimum",
      className: "text-right",
      cell: (r) => <span className="tabular text-muted-foreground">{formatQty(r.minimumStock)}</span>,
    },
    {
      key: "shortage",
      header: "Shortage",
      className: "text-right",
      cell: (r) => (
        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 font-semibold text-destructive tabular">
          −{formatQty(r.shortage)}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (r) => (
        <Button asChild variant="outline" size="sm">
          <Link
            href={`/stock?op=receive&productId=${r.productId}${warehouseId ? `&warehouseId=${warehouseId}` : ""}`}
          >
            <ArrowDownToLine /> Restock
          </Link>
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Low stock"
        description={
          warehouseId
            ? "Active products whose quantity in this warehouse is below their minimum."
            : "Active products whose total quantity across warehouses is below their minimum."
        }
      />

      <WarehouseSelect
        value={warehouseId}
        onChange={(id) => set({ warehouseId: id })}
        allowAll
        activeOnly={false}
        className="sm:w-72"
      />

      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(r) => r.productId}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="All stocked up"
        emptyDescription="No active product is below its minimum stock."
      />

      <PaginationBar
        page={page}
        limit={LIMIT}
        total={query.data?.total}
        onPageChange={(p) => set({ page: p })}
      />
    </>
  )
}
