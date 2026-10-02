"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { ConfirmDialog } from "@/components/data/confirm-dialog"
import { FormActions, FormDialog, RowActions } from "@/components/data/crud-parts"
import { DataTable, type Column } from "@/components/data/data-table"
import { PaginationBar } from "@/components/data/pagination-bar"
import { SearchInput } from "@/components/data/search-input"
import { TextField } from "@/components/form/form-fields"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { units } from "@/features/master-data/queries"
import { useCrudState } from "@/hooks/use-crud-state"
import { useMe } from "@/hooks/use-me"
import { useUrlState } from "@/hooks/use-url-state"
import { formatDate } from "@/lib/format"
import type { Unit } from "@/types/api"

const LIMIT = 20

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  symbol: z.string().trim().min(1, "Symbol is required").max(20),
})

export function UnitsView() {
  const { get, set, page } = useUrlState()
  const { isAdmin } = useMe()
  const crud = useCrudState<Unit>()
  const search = get("search")

  const query = units.useList({ page, limit: LIMIT, search })
  const remove = units.useRemove()

  const columns: Column<Unit>[] = [
    { key: "name", header: "Name", cell: (u) => <span className="font-medium">{u.name}</span> },
    {
      key: "symbol",
      header: "Symbol",
      cell: (u) => (
        <Badge variant="secondary" className="font-mono">
          {u.symbol}
        </Badge>
      ),
    },
    {
      key: "created",
      header: "Created",
      className: "hidden md:table-cell",
      cell: (u) => <span className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</span>,
    },
  ]
  if (isAdmin) {
    columns.push({
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (u) => (
        <RowActions
          removeKind="delete"
          onEdit={() => crud.openEdit(u)}
          onRemove={() => crud.openRemove(u)}
        />
      ),
    })
  }

  return (
    <>
      <PageHeader
        title="Units of measure"
        description="How product quantities are counted: pieces, boxes, kilograms…"
        actions={
          isAdmin && (
            <Button onClick={crud.openCreate}>
              <Plus /> New unit
            </Button>
          )
        }
      />

      <SearchInput
        value={search}
        onChange={(v) => set({ search: v })}
        placeholder="Search name or symbol…"
        maxLength={50}
      />

      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(u) => u.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle={search ? "No units match your search" : "No units yet"}
      />
      <PaginationBar page={page} limit={LIMIT} total={query.data?.total} onPageChange={(p) => set({ page: p })} />

      <FormDialog
        open={crud.isFormOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        title={crud.record ? "Edit unit" : "New unit"}
      >
        <UnitForm key={crud.record?.id ?? "new"} unit={crud.record} onDone={crud.closeForm} />
      </FormDialog>

      <ConfirmDialog
        open={!!crud.removing}
        onOpenChange={(o) => !o && crud.closeRemove()}
        title="Delete unit?"
        description={
          <>
            <strong>{crud.removing?.name}</strong> will be permanently deleted. This fails while
            any product still uses it.
          </>
        }
        confirmLabel="Delete"
        pending={remove.isPending}
        onConfirm={() =>
          crud.removing &&
          remove.mutate(crud.removing.id, {
            onSuccess: () => {
              toast.success("Unit deleted")
              crud.closeRemove()
            },
          })
        }
      />
    </>
  )
}

function UnitForm({ unit, onDone }: { unit?: Unit; onDone: () => void }) {
  const create = units.useCreate()
  const update = units.useUpdate()
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: unit?.name ?? "", symbol: unit?.symbol ?? "" },
  })

  const onSubmit = form.handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        toast.success(unit ? "Unit updated" : "Unit created")
        onDone()
      },
    }
    if (unit) update.mutate({ id: unit.id, body: values }, options)
    else create.mutate(values, options)
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup className="gap-4">
        <TextField control={form.control} name="name" label="Name" placeholder="Piece" maxLength={50} autoFocus />
        <TextField control={form.control} name="symbol" label="Symbol" placeholder="pcs" maxLength={20} />
        <FormActions
          pending={create.isPending || update.isPending}
          submitLabel={unit ? "Save changes" : "Create unit"}
          onCancel={onDone}
        />
      </FieldGroup>
    </form>
  )
}
