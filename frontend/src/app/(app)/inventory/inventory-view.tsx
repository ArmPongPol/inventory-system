"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeftRight, MoreHorizontal, X } from "lucide-react"

import { DataTable, type Column } from "@/components/data/data-table"
import { PaginationBar } from "@/components/data/pagination-bar"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useInventory, type StockOperation } from "@/features/inventory/queries"
import { OPERATIONS, OPERATION_ORDER } from "@/features/stock/operations"
import { ProductCombobox } from "@/features/stock/product-combobox"
import { StockOperationDialog } from "@/features/stock/stock-operation-dialog"
import { WarehouseSelect } from "@/features/stock/warehouse-select"
import { useMe } from "@/hooks/use-me"
import { useUrlState } from "@/hooks/use-url-state"
import { formatDateTime, formatQty } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { InventoryRow } from "@/types/api"

const LIMIT = 20

export function InventoryView() {
  const { get, set, page } = useUrlState()
  const { isAdmin } = useMe()
  const productId = get("productId") ?? ""
  const warehouseId = get("warehouseId") ?? ""

  const query = useInventory({
    page,
    limit: LIMIT,
    productId: productId || undefined,
    warehouseId: warehouseId || undefined,
  })

  const [action, setAction] = useState<{ op: StockOperation; row: InventoryRow } | null>(null)

  const columns: Column<InventoryRow>[] = [
    {
      key: "product",
      header: "Product",
      cell: (r) => (
        <div className="min-w-40">
          <div className="font-medium">{r.product?.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.product?.sku}</div>
        </div>
      ),
    },
    {
      key: "warehouse",
      header: "Warehouse",
      cell: (r) => (
        <div>
          <div className="font-mono text-xs font-semibold">{r.warehouse?.code}</div>
          <div className="text-xs text-muted-foreground">{r.warehouse?.name}</div>
        </div>
      ),
    },
    {
      key: "quantity",
      header: "On hand",
      className: "text-right",
      cell: (r) => <span className="tabular font-medium">{formatQty(r.quantity)}</span>,
    },
    {
      key: "reserved",
      header: "Reserved",
      className: "text-right",
      cell: (r) => (
        <span className="tabular text-muted-foreground">{formatQty(r.reservedQuantity)}</span>
      ),
    },
    {
      key: "available",
      header: "Available",
      className: "text-right",
      cell: (r) => {
        const below =
          r.product && Number(r.availableQuantity) < Number(r.product.minimumStock)
        return (
          <span
            className={cn(
              "tabular inline-flex rounded-md px-2 py-0.5 font-semibold",
              below ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
            )}
          >
            {formatQty(r.availableQuantity)}
          </span>
        )
      },
    },
    {
      key: "updated",
      header: "Updated",
      className: "hidden lg:table-cell",
      cell: (r) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(r.updatedAt)}</span>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Stock actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Stock actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {OPERATION_ORDER.filter((op) => !OPERATIONS[op].adminOnly || isAdmin).map((op) => {
              const meta = OPERATIONS[op]
              return (
                <DropdownMenuItem key={op} onSelect={() => setAction({ op, row: r })}>
                  <meta.icon />
                  {meta.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const hasFilters = !!productId || !!warehouseId

  return (
    <>
      <PageHeader
        title="Stock levels"
        description="On-hand, reserved and available quantities per product and warehouse."
        actions={
          <Button asChild>
            <Link href="/stock">
              <ArrowLeftRight /> New operation
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <ProductCombobox
          value={productId}
          onChange={(id) => set({ productId: id })}
          activeOnly={false}
          placeholder="All products"
          className="sm:w-80"
        />
        <WarehouseSelect
          value={warehouseId}
          onChange={(id) => set({ warehouseId: id })}
          allowAll
          activeOnly={false}
          className="sm:w-64"
        />
        {hasFilters && (
          <Button variant="ghost" onClick={() => set({ productId: null, warehouseId: null })}>
            <X /> Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(r) => r.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle={hasFilters ? "No stock matches these filters" : "No stock yet"}
        emptyDescription={
          hasFilters ? undefined : "Receive stock into a warehouse to see it here."
        }
        emptyAction={
          !hasFilters && (
            <Button asChild size="sm">
              <Link href="/stock?op=receive">Receive stock</Link>
            </Button>
          )
        }
      />

      <PaginationBar
        page={page}
        limit={LIMIT}
        total={query.data?.total}
        onPageChange={(p) => set({ page: p })}
      />

      <StockOperationDialog
        operation={action?.op ?? null}
        defaults={
          action ? { productId: action.row.productId, warehouseId: action.row.warehouseId } : undefined
        }
        onOpenChange={(open) => !open && setAction(null)}
      />
    </>
  )
}
