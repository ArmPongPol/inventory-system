"use client"

import { createResource } from "@/lib/resource"
import type { Role, User, UserStatus } from "@/types/api"

export interface UserInput {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
  role?: Role
  status?: UserStatus
}

export const users = createResource<User, UserInput>("users")
