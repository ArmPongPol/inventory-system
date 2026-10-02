"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import { CircleAlert, LogIn } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { TextField } from "@/components/form/form-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useLogin } from "@/hooks/use-me"
import { errorMessage } from "@/lib/api-client"

const schema = z.object({
  identifier: z.string().trim().min(1, "Enter your username or email").max(320),
  password: z.string().min(1, "Enter your password").max(128),
})

/** Only allow same-site relative paths, so `next` can't redirect off-site. */
function safeNext(next: string | null): string {
  if (!next || !/^\/(?![/\\])/.test(next)) return "/dashboard"
  return next
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const login = useLogin()
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  })

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: () => router.replace(safeNext(searchParams.get("next"))),
    })
  )

  return (
    <Card className="border-0 shadow-xl shadow-maroon/10 ring-1 ring-border">
      <CardHeader className="space-y-1">
        <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in with your username or email.</CardDescription>
      </CardHeader>
      <form method="post" onSubmit={onSubmit} noValidate>
        <CardContent>
          <FieldGroup>
            <AnimatePresence>
              {login.isError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                    {errorMessage(login.error)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <TextField
              control={form.control}
              name="identifier"
              label="Username or email"
              autoComplete="username"
              autoFocus
            />
            <TextField
              control={form.control}
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-4 border-t bg-muted/40 py-4">
          <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
            {login.isPending ? <Spinner /> : <LogIn />}
            Sign in
          </Button>
          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
