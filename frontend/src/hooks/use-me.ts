"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useHydrated } from "@/hooks/use-hydrated"
import { api } from "@/lib/api-client"
import type { User } from "@/types/api"

export const ME_KEY = ["auth", "me"] as const

export function useMe() {
  const query = useQuery({
    queryKey: ME_KEY,
    queryFn: () => api.get<User>("/auth/me"),
    staleTime: 5 * 60 * 1000,
  })
  // The server renders without a user. Suspense boundaries hydrate later, by
  // which time the query may have resolved, so report "no user" until
  // hydration is done to keep the first client render identical to the HTML.
  const hydrated = useHydrated()
  const user = hydrated ? query.data : undefined
  return {
    ...query,
    isLoading: query.isLoading || !hydrated,
    user,
    isAdmin: user?.role === "ADMIN",
  }
}

export interface LoginInput {
  identifier: string
  password: string
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LoginInput) =>
      api.post<User>("/auth/login", body, { redirectOnUnauthorized: false }),
    onSuccess: (user) => qc.setQueryData(ME_KEY, user),
  })
}

export interface RegisterInput {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
}

export function useRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RegisterInput) =>
      api.post<User>("/auth/register", body, { redirectOnUnauthorized: false }),
    onSuccess: (user) => qc.setQueryData(ME_KEY, user),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: () => api.post<null>("/auth/logout"),
    onSettled: () => {
      router.replace("/login")
      qc.clear()
    },
  })
}
