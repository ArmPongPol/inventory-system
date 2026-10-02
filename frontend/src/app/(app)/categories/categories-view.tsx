"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
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
import { categories } from "@/features/master-data/queries"
import { useCrudState } from "@/hooks/use-crud-state"
import { useMe } from "@/hooks/use-me"
import { useUrlState } from "@/hooks/use-url-state"
import { formatDate } from "@/lib/format"
import type { Category } from "@/types/api"

const LIMIT = 20

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  isActive: z.boolean(),
})

export function CategoriesView() {
  const { get, set, page } = useUrlState()
  const { isAdmin } = useMe()
  const crud = useCrudState<Category>()
  const search = get("search")
  const isActive = get("isActive")

  const query = categories.useList({ page, limit: LIMIT, search, isActive })
  const update = categories.useUpdate()
  const remove = categories.useRemove()

  const columns: Column<Category>[] = [
    { key: "name", header: "Name", cell: (c) => <span className="font-medium">{c.name}</span> },
    { key: "status", header: "Status", cell: (c) => <ActiveBadge active={c.isActive} /> },
    {
      key: "created",
      header: "Created",
      className: "hidden md:table-cell",
      cell: (c) => <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>,
    },
  ]
  if (isAdmin) {
    columns.push({
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (c) => (
        <RowActions
          active={c.isActive}
          onEdit={() => crud.openEdit(c)}
          onRemove={() => crud.openRemove(c)}
          onActivate={() =>
            update.mutate(
              { id: c.id, body: { isActive: true } },
              { onSuccess: () => toast.success(`${c.name} activated`) }
            )
          }
        />
      ),
    })
  }

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group products for browsing and reporting."
        actions={
          isAdmin && (
            <Button onClick={crud.openCreate}>
              <Plus /> New category
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={search} onChange={(v) => set({ search: v })} placeholder="Search categories…" />
        <StatusFilter value={isActive} onChange={(v) => set({ isActive: v })} />
      </div>

      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(c) => c.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle={search ? "No categories match your search" : "No categories yet"}
      />
      <PaginationBar page={page} limit={LIMIT} total={query.data?.total} onPageChange={(p) => set({ page: p })} />

      <FormDialog
        open={crud.isFormOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        title={crud.record ? "Edit category" : "New category"}
      >
        <CategoryForm key={crud.record?.id ?? "new"} category={crud.record} onDone={crud.closeForm} />
      </FormDialog>

      <ConfirmDialog
        open={!!crud.removing}
        onOpenChange={(o) => !o && crud.closeRemove()}
        title="Deactivate category?"
        description={
          <>
            <strong>{crud.removing?.name}</strong> will be hidden from new products. Existing
            products keep it, and you can activate it again later.
          </>
        }
        confirmLabel="Deactivate"
        pending={remove.isPending}
        onConfirm={() =>
          crud.removing &&
          remove.mutate(crud.removing.id, {
            onSuccess: () => {
              toast.success("Category deactivated")
              crud.closeRemove()
            },
          })
        }
      />
    </>
  )
}

function CategoryForm({ category, onDone }: { category?: Category; onDone: () => void }) {
  const create = categories.useCreate()
  const update = categories.useUpdate()
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: category?.name ?? "", isActive: category?.isActive ?? true },
  })

  const onSubmit = form.handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        toast.success(category ? "Category updated" : "Category created")
        onDone()
      },
    }
    if (category) update.mutate({ id: category.id, body: values }, options)
    else create.mutate(values, options)
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup className="gap-4">
        <TextField control={form.control} name="name" label="Name" maxLength={100} autoFocus />
        <SwitchField
          control={form.control}
          name="isActive"
          label="Active"
          description="Inactive categories can't be assigned to products."
        />
        <FormActions
          pending={create.isPending || update.isPending}
          submitLabel={category ? "Save changes" : "Create category"}
          onCancel={onDone}
        />
      </FieldGroup>
    </form>
  )
}
