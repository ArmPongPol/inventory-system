"use client"

import { useState } from "react"
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { MotionConfig } from "framer-motion"
import { ThemeProvider } from "next-themes"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ApiError, errorMessage } from "@/lib/api-client"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: false,
        retry: (count, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
          count < 2,
      },
    },
    mutationCache: new MutationCache({
      // Every failed mutation surfaces the backend's message as a toast,
      // unless the mutation handles errors itself (meta.silent).
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.silent) return
        if (error instanceof ApiError && error.status === 401) return
        toast.error(errorMessage(error))
      },
    }),
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient)

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster richColors position="top-right" closeButton />
          </TooltipProvider>
        </MotionConfig>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
