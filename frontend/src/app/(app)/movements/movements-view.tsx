"use client"

import { addDays, parseISO, startOfDay } from "date-fns"
import { X } from "lucide-react"

import { MovementTypeBadge } from "@/components/data/badges"
import { DataTable, type Column } from "@/components/data/data-table"
import { DateRangeFilter } from "@/components/data/date-range-filter"
import { PaginationBar } from "@/components/data/pagination-bar"
import { SearchInput } from "@/components/data/search-input"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useMovements } from "@/features/inventory/queries"
import { ProductCombobox } from "@/features/stock/product-combobox"
import { ALL, WarehouseSelect } from "@/features/stock/warehouse-select"
import { useUrlState } from "@/hooks/use-url-state"
import {
  formatDateTime,
  formatQty,
  formatSignedQty,
  humanize,
  isNegative,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import { MOVEMENT_TYPES, type MovementType, type StockMovement } from "@/types/api"

const LIMIT = 25

/** Converts the inclusive yyyy-MM-dd filter dates to the API's [from, to) instants. */
function toRange(from?: string, to?: string) {
  if (!from) return {}
  const start = startOfDay(parseISO(from))
  const end = addDays(startOfDay(parseISO(to ?? from)), 1)
  return { from: start.toISOString(), to: end.toISOString() }
}

export function MovementsView() {
  const { get, set, page } = useUrlState()
  const productId = get("productId") ?? ""
  const warehouseId = get("warehouseId") ?? ""
  const movementType = get("movementType") as MovementType | undefined
  const referenceType = get("referenceType")
  const from = get("from")
  const to = get("to")

  const query = useMovements({
    page,
    limit: LIMIT,
    productId: productId || undefined,
    warehouseId: warehouseId || undefined,
    movementType,
    referenceType,
    ...toRange(from, to),
  })

  const columns: Column<StockMovement>[] = [
    {
      key: "date",
      header: "Date",
      cell: (m) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {formatDateTime(m.createdAt)}
        </span>
      ),
    },
    { key: "type", header: "Type", cell: (m) => <MovementTypeBadge type={m.movementType} /> },
    {
      key: "product",
      header: "Product",
      cell: (m) => (
        <div className="min-w-36">
          <div className="font-medium">{m.product?.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{m.product?.sku}</div>
        </div>
      ),
    },
    {
      key: "warehouse",
      header: "Warehouse",
      cell: (m) => <span className="font-mono text-xs font-semibold">{m.warehouse?.code}</span>,
    },
    {
      key: "quantity",
      header: "Change",
      className: "text-right",
      cell: (m) => (
        <span
          className={cn(
            "font-mono font-semibold tabular",
            isNegative(m.quantity) ? "text-destructive" : "text-success"
          )}
        >
          {formatSignedQty(m.quantity)}
        </span>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      className: "text-right hidden md:table-cell",
      cell: (m) => (
        <span className="tabular text-xs text-muted-foreground">
          {formatQty(m.beforeQuantity)} → <span className="font-medium text-foreground">{formatQty(m.afterQuantity)}</span>
        </span>
      ),
    },
    {
      key: "reference",
      header: "Reference",
      className: "hidden lg:table-cell",
      cell: (m) =>
        m.referenceType ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default font-mono text-xs">{m.referenceType}</span>
            </TooltipTrigger>
            {m.referenceId && <TooltipContent>{m.referenceId}</TooltipContent>}
          </Tooltip>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "remark",
      header: "Remark",
      className: "hidden xl:table-cell max-w-56",
      cell: (m) => (
        <span className="line-clamp-2 text-xs text-muted-foreground">{m.remark ?? "—"}</span>
      ),
    },
  ]

  const hasFilters = !!(productId || warehouseId || movementType || referenceType || from)

  return (
    <>
      <PageHeader
        title="Movement ledger"
        description="Every change to stock, newest first. The ledger is append-only."
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center">
        <ProductCombobox
          value={productId}
          onChange={(id) => set({ productId: id })}
          activeOnly={false}
          placeholder="All products"
          className="xl:w-72"
        />
        <WarehouseSelect
          value={warehouseId}
          onChange={(id) => set({ warehouseId: id })}
          allowAll
          activeOnly={false}
          className="xl:w-56"
        />
        <Select
          value={movementType ?? ALL}
          onValueChange={(v) => set({ movementType: v === ALL ? null : v })}
        >
          <SelectTrigger className="w-full bg-card xl:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {MOVEMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {humanize(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SearchInput
          value={referenceType}
          onChange={(v) => set({ referenceType: v.toUpperCase() })}
          placeholder="Reference type"
          maxLength={50}
          className="sm:w-full xl:w-44"
        />
        <DateRangeFilter from={from} to={to} onChange={(r) => set(r)} />
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() =>
              set({
                productId: null,
                warehouseId: null,
                movementType: null,
                referenceType: null,
                from: null,
                to: null,
              })
            }
          >
            <X /> Clear filters
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(m) => m.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle={hasFilters ? "No movements match these filters" : "No movements yet"}
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
