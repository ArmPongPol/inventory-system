"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, ShieldOff } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { RoleBadge, UserStatusBadge } from "@/components/data/badges"
import { ConfirmDialog } from "@/components/data/confirm-dialog"
import { FormActions, FormDialog, RowActions } from "@/components/data/crud-parts"
import { DataTable, type Column } from "@/components/data/data-table"
import { PaginationBar } from "@/components/data/pagination-bar"
import { SelectField, TextField } from "@/components/form/form-fields"
import { PageHeader } from "@/components/layout/page-header"
import { PageSkeleton } from "@/components/layout/page-skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { FieldGroup } from "@/components/ui/field"
import { users } from "@/features/users/queries"
import { useCrudState } from "@/hooks/use-crud-state"
import { useMe } from "@/hooks/use-me"
import { useUrlState } from "@/hooks/use-url-state"
import { formatDate, initials } from "@/lib/format"
import {
  emailSchema,
  nameSchema,
  passwordSchema,
  usernameSchema,
} from "@/lib/validation"
import type { User } from "@/types/api"

const LIMIT = 20

const baseSchema = {
  firstName: nameSchema("First name"),
  lastName: nameSchema("Last name"),
  username: usernameSchema,
  email: emailSchema,
  role: z.enum(["ADMIN", "USER"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
}
const createSchema = z.object({ ...baseSchema, password: passwordSchema })
// When editing, an empty password means "keep the current one".
const editSchema = z.object({
  ...baseSchema,
  password: z.union([z.literal(""), passwordSchema]),
})

export function UsersView() {
  const { isAdmin, isLoading: meLoading, user: me } = useMe()
  if (meLoading) return <PageSkeleton />
  if (!isAdmin) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldOff />
          </EmptyMedia>
          <EmptyTitle>Administrators only</EmptyTitle>
          <EmptyDescription>You need the admin role to manage user accounts.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return <UsersAdmin currentUserId={me?.id} />
}

function UsersAdmin({ currentUserId }: { currentUserId?: string }) {
  const { set, page } = useUrlState()
  const crud = useCrudState<User>()
  const query = users.useList({ page, limit: LIMIT })
  const update = users.useUpdate()
  const remove = users.useRemove()

  const columns: Column<User>[] = [
    {
      key: "user",
      header: "User",
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
              {initials(u.firstName, u.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium">
              {u.firstName} {u.lastName}
              {u.id === currentUserId && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">@{u.username}</div>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      className: "hidden md:table-cell",
      cell: (u) => <span className="text-sm">{u.email}</span>,
    },
    { key: "role", header: "Role", cell: (u) => <RoleBadge role={u.role} /> },
    { key: "status", header: "Status", cell: (u) => <UserStatusBadge status={u.status} /> },
    {
      key: "created",
      header: "Joined",
      className: "hidden lg:table-cell",
      cell: (u) => <span className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (u) => (
        <RowActions
          active={u.status === "ACTIVE"}
          onEdit={() => crud.openEdit(u)}
          onRemove={() => crud.openRemove(u)}
          onActivate={() =>
            update.mutate(
              { id: u.id, body: { status: "ACTIVE" } },
              { onSuccess: () => toast.success(`@${u.username} activated`) }
            )
          }
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage who can sign in and what they can do."
        actions={
          <Button onClick={crud.openCreate}>
            <Plus /> New user
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(u) => u.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="No users"
      />
      <PaginationBar page={page} limit={LIMIT} total={query.data?.total} onPageChange={(p) => set({ page: p })} />

      <FormDialog
        open={crud.isFormOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        title={crud.record ? "Edit user" : "New user"}
        description={
          crud.record
            ? "Changing the password, role or status signs the user out of every session."
            : undefined
        }
      >
        <UserForm key={crud.record?.id ?? "new"} user={crud.record} onDone={crud.closeForm} />
      </FormDialog>

      <ConfirmDialog
        open={!!crud.removing}
        onOpenChange={(o) => !o && crud.closeRemove()}
        title="Deactivate user?"
        description={
          <>
            <strong>@{crud.removing?.username}</strong> will be signed out everywhere and can&apos;t
            sign in until reactivated.
          </>
        }
        confirmLabel="Deactivate"
        pending={remove.isPending}
        onConfirm={() =>
          crud.removing &&
          remove.mutate(crud.removing.id, {
            onSuccess: () => {
              toast.success("User deactivated")
              crud.closeRemove()
            },
          })
        }
      />
    </>
  )
}

function UserForm({ user, onDone }: { user?: User; onDone: () => void }) {
  const create = users.useCreate()
  const update = users.useUpdate()
  const form = useForm({
    resolver: zodResolver(user ? editSchema : createSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      username: user?.username ?? "",
      email: user?.email ?? "",
      password: "",
      role: user?.role ?? "USER",
      status: user?.status ?? "ACTIVE",
    },
  })

  const onSubmit = form.handleSubmit(({ password, ...values }) => {
    const options = {
      onSuccess: () => {
        toast.success(user ? "User updated" : "User created")
        onDone()
      },
    }
    if (user) {
      update.mutate({ id: user.id, body: password ? { ...values, password } : values }, options)
    } else {
      create.mutate({ ...values, password }, options)
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField control={form.control} name="firstName" label="First name" autoFocus />
          <TextField control={form.control} name="lastName" label="Last name" />
        </div>
        <TextField control={form.control} name="username" label="Username" autoComplete="off" />
        <TextField control={form.control} name="email" label="Email" type="email" autoComplete="off" />
        <TextField
          control={form.control}
          name="password"
          label={user ? "New password" : "Password"}
          type="password"
          autoComplete="new-password"
          description={
            user
              ? "Leave blank to keep the current password."
              : "12+ characters with upper and lower case, a number and a symbol."
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="role"
            label="Role"
            options={[
              { value: "USER", label: "User" },
              { value: "ADMIN", label: "Admin" },
            ]}
          />
          <SelectField
            control={form.control}
            name="status"
            label="Status"
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
          />
        </div>
        <FormActions
          pending={create.isPending || update.isPending}
          submitLabel={user ? "Save changes" : "Create user"}
          onCancel={onDone}
        />
      </FieldGroup>
    </form>
  )
}
