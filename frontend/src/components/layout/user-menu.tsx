"use client"

import { ChevronsUpDown, LogOut, ShieldCheck } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useLogout, useMe } from "@/hooks/use-me"
import { initials } from "@/lib/format"

export function UserMenu() {
  const { user, isLoading } = useMe()
  const logout = useLogout()
  const { isMobile } = useSidebar()

  if (isLoading || !user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          {/* Not SidebarMenuSkeleton: its random width breaks hydration. */}
          <div className="flex h-12 items-center gap-2 px-2">
            <Skeleton className="size-8 rounded-lg bg-sidebar-accent" />
            <Skeleton className="h-4 flex-1 bg-sidebar-accent" />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const name = `${user.firstName} ${user.lastName}`.trim()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-sand text-maroon font-semibold">
                  {initials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs opacity-70">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="grid gap-0.5">
                <span className="font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">@{user.username}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
                  <ShieldCheck className="size-3.5" />
                  {user.role === "ADMIN" ? "Administrator" : "Staff"}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={logout.isPending}
              onSelect={() => logout.mutate()}
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
