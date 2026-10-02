"use client"

import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { Boxes, Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { ActiveBadge } from "@/components/data/badges"
import { ConfirmDialog } from "@/components/data/confirm-dialog"
import { FormActions, FormDialog, RowActions, StatusFilter } from "@/components/data/crud-parts"
import { DataTable, type Column } from "@/components/data/data-table"
import { PaginationBar } from "@/components/data/pagination-bar"
import { SearchInput } from "@/components/data/search-input"
import { SwitchField, TextField } from "@/components/form/form-fields"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { warehouses } from "@/features/master-data/queries"
import { useCrudState } from "@/hooks/use-crud-state"
import { useMe } from "@/hooks/use-me"
import { useUrlState } from "@/hooks/use-url-state"
import { formatDate } from "@/lib/format"
import type { Warehouse } from "@/types/api"

const LIMIT = 20

const schema = z.object({
  code: z.string().trim().toUpperCase().min(1, "Code is required").max(50),
  name: z.string().trim().min(1, "Name is required").max(150),
  isActive: z.boolean(),
})

export function WarehousesView() {
  const { get, set, page } = useUrlState()
  const { isAdmin } = useMe()
  const crud = useCrudState<Warehouse>()
  const search = get("search")
  const isActive = get("isActive")

  const query = warehouses.useList({ page, limit: LIMIT, search, isActive })
  const update = warehouses.useUpdate()
  const remove = warehouses.useRemove()

  const columns: Column<Warehouse>[] = [
    {
      key: "code",
      header: "Code",
      cell: (w) => <span className="font-mono text-sm font-semibold">{w.code}</span>,
    },
    { key: "name", header: "Name", cell: (w) => <span className="font-medium">{w.name}</span> },
    { key: "status", header: "Status", cell: (w) => <ActiveBadge active={w.isActive} /> },
    {
      key: "created",
      header: "Created",
      className: "hidden md:table-cell",
      cell: (w) => <span className="text-xs text-muted-foreground">{formatDate(w.createdAt)}</span>,
    },
    {
      key: "stock",
      header: <span className="sr-only">Stock</span>,
      className: "text-right",
      cell: (w) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/inventory?warehouseId=${w.id}`}>
            <Boxes /> Stock
          </Link>
        </Button>
      ),
    },
  ]
  if (isAdmin) {
    columns.push({
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (w) => (
        <RowActions
          active={w.isActive}
          onEdit={() => crud.openEdit(w)}
          onRemove={() => crud.openRemove(w)}
          onActivate={() =>
            update.mutate(
              { id: w.id, body: { isActive: true } },
              { onSuccess: () => toast.success(`${w.code} activated`) }
            )
          }
        />
      ),
    })
  }

  return (
    <>
      <PageHeader
        title="Warehouses"
        description="Locations that hold stock."
        actions={
          isAdmin && (
            <Button onClick={crud.openCreate}>
              <Plus /> New warehouse
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={search} onChange={(v) => set({ search: v })} placeholder="Search code or name…" />
        <StatusFilter value={isActive} onChange={(v) => set({ isActive: v })} />
      </div>

      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(w) => w.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle={search ? "No warehouses match your search" : "No warehouses yet"}
      />
      <PaginationBar page={page} limit={LIMIT} total={query.data?.total} onPageChange={(p) => set({ page: p })} />

      <FormDialog
        open={crud.isFormOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        title={crud.record ? "Edit warehouse" : "New warehouse"}
      >
        <WarehouseForm key={crud.record?.id ?? "new"} warehouse={crud.record} onDone={crud.closeForm} />
      </FormDialog>

      <ConfirmDialog
        open={!!crud.removing}
        onOpenChange={(o) => !o && crud.closeRemove()}
        title="Deactivate warehouse?"
        description={
          <>
            <strong>{crud.removing?.code}</strong> will accept no new stock movements. Its history
            is kept, and existing reservations can still be released.
          </>
        }
        confirmLabel="Deactivate"
        pending={remove.isPending}
        onConfirm={() =>
          crud.removing &&
          remove.mutate(crud.removing.id, {
            onSuccess: () => {
              toast.success("Warehouse deactivated")
              crud.closeRemove()
            },
          })
        }
      />
    </>
  )
}

function WarehouseForm({ warehouse, onDone }: { warehouse?: Warehouse; onDone: () => void }) {
  const create = warehouses.useCreate()
  const update = warehouses.useUpdate()
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      code: warehouse?.code ?? "",
      name: warehouse?.name ?? "",
      isActive: warehouse?.isActive ?? true,
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        toast.success(warehouse ? "Warehouse updated" : "Warehouse created")
        onDone()
      },
    }
    if (warehouse) update.mutate({ id: warehouse.id, body: values }, options)
    else create.mutate(values, options)
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup className="gap-4">
        <TextField
          control={form.control}
          name="code"
          label="Code"
          placeholder="WH-BKK"
          maxLength={50}
          className="font-mono uppercase placeholder:normal-case"
          description="Stored in upper case and must be unique."
          autoFocus
        />
        <TextField control={form.control} name="name" label="Name" placeholder="Bangkok main warehouse" maxLength={150} />
        <SwitchField
          control={form.control}
          name="isActive"
          label="Active"
          description="Inactive warehouses accept no new stock movements."
        />
        <FormActions
          pending={create.isPending || update.isPending}
          submitLabel={warehouse ? "Save changes" : "Create warehouse"}
          onCancel={onDone}
        />
      </FieldGroup>
    </form>
  )
}
