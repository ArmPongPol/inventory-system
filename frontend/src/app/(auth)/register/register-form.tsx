"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import { CircleAlert, UserPlus } from "lucide-react"
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
import { useRegister } from "@/hooks/use-me"
import { errorMessage } from "@/lib/api-client"
import {
  emailSchema,
  nameSchema,
  passwordSchema,
  usernameSchema,
} from "@/lib/validation"

const schema = z
  .object({
    firstName: nameSchema("First name"),
    lastName: nameSchema("Last name"),
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

export function RegisterForm() {
  const register = useRegister()
  const router = useRouter()
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = form.handleSubmit((v) =>
    register.mutate(
      {
        firstName: v.firstName,
        lastName: v.lastName,
        username: v.username,
        email: v.email,
        password: v.password,
      },
      { onSuccess: () => router.replace("/dashboard") }
    )
  )

  return (
    <Card className="border-0 shadow-xl shadow-maroon/10 ring-1 ring-border">
      <CardHeader className="space-y-1">
        <CardTitle className="font-heading text-2xl">Create your account</CardTitle>
        <CardDescription>New accounts start with the staff role.</CardDescription>
      </CardHeader>
      <form method="post" onSubmit={onSubmit} noValidate>
        <CardContent>
          <FieldGroup className="gap-4">
            <AnimatePresence>
              {register.isError && (
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
                    {errorMessage(register.error)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="firstName" label="First name" autoComplete="given-name" />
              <TextField control={form.control} name="lastName" label="Last name" autoComplete="family-name" />
            </div>
            <TextField
              control={form.control}
              name="username"
              label="Username"
              autoComplete="username"
              description='Letters, digits, ".", "_" and "-".'
            />
            <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
            <TextField
              control={form.control}
              name="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              description="12+ characters with upper and lower case, a number and a symbol."
            />
            <TextField
              control={form.control}
              name="confirmPassword"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-4 border-t bg-muted/40 py-4">
          <Button type="submit" size="lg" className="w-full" disabled={register.isPending}>
            {register.isPending ? <Spinner /> : <UserPlus />}
            Create account
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
