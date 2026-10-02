"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { api, type QueryParams } from "@/lib/api-client"
import type { Paginated } from "@/types/api"

/**
 * Query and mutation hooks for a paginated REST resource
 * (`GET /x`, `GET /x/:id`, `POST /x`, `PATCH /x/:id`, `DELETE /x/:id`).
 *
 * Mutations invalidate every query: names, SKUs and active flags show up in
 * inventory, movements and dashboards too, and the app is small enough that
 * refetching the visible queries is cheap.
 */
export function createResource<T extends { id: string }, TCreate, TUpdate = Partial<TCreate>>(
  path: string
) {
  const keys = {
    all: [path] as const,
    list: (params?: QueryParams) => [path, "list", params ?? {}] as const,
    detail: (id: string) => [path, "detail", id] as const,
  }

  return {
    keys,

    useList(params?: QueryParams, options?: { enabled?: boolean }) {
      return useQuery({
        queryKey: keys.list(params),
        queryFn: () => api.get<Paginated<T>>(`/${path}`, params),
        placeholderData: keepPreviousData,
        ...options,
      })
    },

    useDetail(id: string | undefined) {
      return useQuery({
        queryKey: keys.detail(id ?? ""),
        queryFn: () => api.get<T>(`/${path}/${id}`),
        enabled: !!id,
      })
    },

    useCreate() {
      const qc = useQueryClient()
      return useMutation({
        mutationFn: (body: TCreate) => api.post<T>(`/${path}`, body),
        onSuccess: () => qc.invalidateQueries(),
      })
    },

    useUpdate() {
      const qc = useQueryClient()
      return useMutation({
        mutationFn: ({ id, body }: { id: string; body: TUpdate }) =>
          api.patch<T>(`/${path}/${id}`, body),
        onSuccess: () => qc.invalidateQueries(),
      })
    },

    useRemove() {
      const qc = useQueryClient()
      return useMutation({
        mutationFn: (id: string) => api.delete(`/${path}/${id}`),
        onSuccess: () => qc.invalidateQueries(),
      })
    },
  }
}
