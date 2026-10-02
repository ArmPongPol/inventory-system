import {
  ArrowLeftRight,
  Boxes,
  FolderTree,
  History,
  LayoutDashboard,
  Package,
  Ruler,
  TriangleAlert,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  adminOnly?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Inventory",
    items: [
      { title: "Stock levels", href: "/inventory", icon: Boxes },
      { title: "Stock operations", href: "/stock", icon: ArrowLeftRight },
      { title: "Movements", href: "/movements", icon: History },
      { title: "Low stock", href: "/low-stock", icon: TriangleAlert },
    ],
  },
  {
    label: "Catalog",
    items: [
      { title: "Products", href: "/products", icon: Package },
      { title: "Categories", href: "/categories", icon: FolderTree },
      { title: "Units", href: "/units", icon: Ruler },
      { title: "Warehouses", href: "/warehouses", icon: Warehouse },
    ],
  },
  {
    label: "Administration",
    items: [{ title: "Users", href: "/users", icon: Users, adminOnly: true }],
  },
]

export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_GROUPS.flatMap((g) => g.items).find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )
}
