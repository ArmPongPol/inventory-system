"use client"

import { useState } from "react"

/** Dialog state for list pages: which record is being created/edited or removed. */
export function useCrudState<T>() {
  const [editing, setEditing] = useState<T | "new" | null>(null)
  const [removing, setRemoving] = useState<T | null>(null)

  return {
    editing,
    removing,
    isFormOpen: editing !== null,
    record: editing === "new" ? undefined : (editing ?? undefined),
    openCreate: () => setEditing("new"),
    openEdit: (record: T) => setEditing(record),
    closeForm: () => setEditing(null),
    openRemove: (record: T) => setRemoving(record),
    closeRemove: () => setRemoving(null),
  }
}
