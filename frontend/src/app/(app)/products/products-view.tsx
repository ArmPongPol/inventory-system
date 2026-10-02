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
import { SelectField, SwitchField, TextField, type Option } from "@/components/form/form-fields"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { categories, products, units } from "@/features/master-data/queries"
import { useCrudState } from "@/hooks/use-crud-state"
import { useMe } from "@/hooks/use-me"
import { useUrlState } from "@/hooks/use-url-state"
import { formatQty } from "@/lib/format"
import { quantitySchema } from "@/lib/validation"
import type { Product } from "@/types/api"

const LIMIT = 20

const schema = z.object({
  sku: z.string().trim().toUpperCase().min(1, "SKU is required").max(50),
  name: z.string().trim().min(1, "Name is required").max(255),
  categoryId: z.string(),
  unitId: z.string(),
  minimumStock: quantitySchema({ allowZero: true }),
  isActive: z.boolean(),
})

export function ProductsView() {
  const { get, set, page } = useUrlState()
  const { isAdmin } = useMe()
  const crud = useCrudState<Product>()
  const search = get("search")
  const isActive = get("isActive")
  const categoryId = get("categoryId")

  const query = products.useList({ page, limit: LIMIT, search, isActive, categoryId })
  const categoryList = categories.useList({ limit: 100 })
  const update = products.useUpdate()
  const remove = products.useRemove()

  const columns: Column<Product>[] = [
    {
      key: "sku",
      header: "SKU",
      cell: (p) => <span className="font-mono text-sm font-semibold">{p.sku}</span>,
    },
    {
      key: "name",
      header: "Name",
      cell: (p) => (
        <div className="min-w-40">
          <div className="font-medium">{p.name}</div>
          <div className="text-xs text-muted-foreground md:hidden">{p.category?.name}</div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      className: "hidden md:table-cell",
      cell: (p) => p.category?.name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "unit",
      header: "Unit",
      className: "hidden lg:table-cell",
      cell: (p) => p.unit?.symbol ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "minimum",
      header: "Min. stock",
      className: "text-right",
      cell: (p) => <span className="tabular">{formatQty(p.minimumStock)}</span>,
    },
    { key: "status", header: "Status", cell: (p) => <ActiveBadge active={p.isActive} /> },
    {
      key: "stock",
      header: <span className="sr-only">Stock</span>,
      className: "text-right",
      cell: (p) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/inventory?productId=${p.id}`}>
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
      cell: (p) => (
        <RowActions
          active={p.isActive}
          onEdit={() => crud.openEdit(p)}
          onRemove={() => crud.openRemove(p)}
          onActivate={() =>
            update.mutate(
              { id: p.id, body: { isActive: true } },
              { onSuccess: () => toast.success(`${p.sku} activated`) }
            )
          }
        />
      ),
    })
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="The catalog of items you stock."
        actions={
          isAdmin && (
            <Button onClick={crud.openCreate}>
              <Plus /> New product
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <SearchInput value={search} onChange={(v) => set({ search: v })} placeholder="Search SKU or name…" />
        <Select value={categoryId ?? "all"} onValueChange={(v) => set({ categoryId: v === "all" ? null : v })}>
          <SelectTrigger className="w-full bg-card sm:w-52" aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categoryList.data?.items.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <StatusFilter value={isActive} onChange={(v) => set({ isActive: v })} />
      </div>

      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(p) => p.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle={search || categoryId ? "No products match these filters" : "No products yet"}
      />
      <PaginationBar page={page} limit={LIMIT} total={query.data?.total} onPageChange={(p) => set({ page: p })} />

      <FormDialog
        open={crud.isFormOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        title={crud.record ? "Edit product" : "New product"}
      >
        <ProductForm key={crud.record?.id ?? "new"} product={crud.record} onDone={crud.closeForm} />
      </FormDialog>

      <ConfirmDialog
        open={!!crud.removing}
        onOpenChange={(o) => !o && crud.closeRemove()}
        title="Deactivate product?"
        description={
          <>
            <strong>
              {crud.removing?.sku} · {crud.removing?.name}
            </strong>{" "}
            will accept no new stock movements. Its history is kept, and existing reservations can
            still be released.
          </>
        }
        confirmLabel="Deactivate"
        pending={remove.isPending}
        onConfirm={() =>
          crud.removing &&
          remove.mutate(crud.removing.id, {
            onSuccess: () => {
              toast.success("Product deactivated")
              crud.closeRemove()
            },
          })
        }
      />
    </>
  )
}

function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  const create = products.useCreate()
  const update = products.useUpdate()
  const categoryList = categories.useList({ limit: 100, isActive: "true" })
  const unitList = units.useList({ limit: 100 })

  const categoryOptions: Option[] = (categoryList.data?.items ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }))
  // Keep the current category selectable even if it has since been deactivated.
  if (product?.category && !categoryOptions.some((o) => o.value === product.category!.id)) {
    categoryOptions.unshift({ value: product.category.id, label: `${product.category.name} (inactive)` })
  }
  const unitOptions: Option[] = (unitList.data?.items ?? []).map((u) => ({
    value: u.id,
    label: `${u.name} (${u.symbol})`,
  }))

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: product?.sku ?? "",
      name: product?.name ?? "",
      categoryId: product?.categoryId ?? "",
      unitId: product?.unitId ?? "",
      minimumStock: product ? formatQty(product.minimumStock).replace(/,/g, "") : "0",
      isActive: product?.isActive ?? true,
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    const body = {
      ...values,
      categoryId: values.categoryId || null,
      unitId: values.unitId || null,
      minimumStock: Number(values.minimumStock),
    }
    const options = {
      onSuccess: () => {
        toast.success(product ? "Product updated" : "Product created")
        onDone()
      },
    }
    if (product) update.mutate({ id: product.id, body }, options)
    else create.mutate(body, options)
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_1.6fr]">
          <TextField
            control={form.control}
            name="sku"
            label="SKU"
            placeholder="SKU-0001"
            maxLength={50}
            className="font-mono uppercase placeholder:normal-case"
            autoFocus
          />
          <TextField control={form.control} name="name" label="Name" maxLength={255} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="categoryId"
            label="Category"
            options={categoryOptions}
            noneLabel="No category"
          />
          <SelectField
            control={form.control}
            name="unitId"
            label="Unit"
            options={unitOptions}
            noneLabel="No unit"
          />
        </div>
        <TextField
          control={form.control}
          name="minimumStock"
          label="Minimum stock"
          inputMode="decimal"
          description="The product shows up in Low stock when its quantity drops below this."
        />
        <SwitchField
          control={form.control}
          name="isActive"
          label="Active"
          description="Inactive products accept no new stock movements."
        />
        <FormActions
          pending={create.isPending || update.isPending}
          submitLabel={product ? "Save changes" : "Create product"}
          onCancel={onDone}
        />
      </FieldGroup>
    </form>
  )
}
