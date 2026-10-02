import { cookies } from "next/headers"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { Topbar } from "@/components/layout/topbar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Restore the collapsed/expanded state saved by the sidebar component.
  const sidebarState = (await cookies()).get("sidebar_state")?.value

  return (
    <SidebarProvider defaultOpen={sidebarState !== "false"}>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <Topbar />
        <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
