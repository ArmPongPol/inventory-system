"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { Logo } from "@/components/layout/logo"
import { NAV_GROUPS } from "@/components/layout/nav"
import { UserMenu } from "@/components/layout/user-menu"
import { useMe } from "@/hooks/use-me"

export function AppSidebar() {
  const pathname = usePathname()
  const { isAdmin } = useMe()
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <Link
          href="/dashboard"
          className="rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Logo className="group-data-[collapsible=icon]:[&>div:last-child]:hidden" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => !item.adminOnly || isAdmin)
          if (items.length === 0) return null
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-sidebar-foreground/60">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.title}
                          className="relative data-active:bg-transparent data-active:text-sidebar-primary-foreground hover:data-active:bg-transparent"
                        >
                          <Link href={item.href} onClick={() => setOpenMobile(false)}>
                            {active && (
                              <motion.span
                                layoutId="sidebar-active"
                                className="absolute inset-0 -z-0 rounded-md bg-sidebar-primary shadow-sm"
                                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                              />
                            )}
                            <item.icon className="relative z-10" />
                            <span className="relative z-10">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
