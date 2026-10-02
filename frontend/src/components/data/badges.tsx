import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Scale,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { humanize } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { MovementType, Role, UserStatus } from "@/types/api"

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        active
          ? "border-success/30 bg-success/10 text-success"
          : "border-border bg-muted text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          active ? "bg-success" : "bg-muted-foreground/60"
        )}
      />
      {active ? "Active" : "Inactive"}
    </Badge>
  )
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <ActiveBadge active={status === "ACTIVE"} />
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge
      variant={role === "ADMIN" ? "default" : "secondary"}
      className="font-semibold tracking-wide"
    >
      {role === "ADMIN" ? "Admin" : "User"}
    </Badge>
  )
}

const MOVEMENT_STYLE: Record<MovementType, { className: string; icon: typeof ArrowUpRight }> = {
  IN: { className: "border-success/30 bg-success/10 text-success", icon: ArrowDownLeft },
  OUT: { className: "border-destructive/30 bg-destructive/10 text-destructive", icon: ArrowUpRight },
  ADJUSTMENT: { className: "border-warning/30 bg-warning/10 text-warning", icon: Scale },
  TRANSFER_IN: { className: "border-primary/25 bg-primary/5 text-primary", icon: ArrowLeftRight },
  TRANSFER_OUT: { className: "border-primary/25 bg-primary/5 text-primary", icon: ArrowLeftRight },
}

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const style = MOVEMENT_STYLE[type]
  const Icon = style.icon
  return (
    <Badge variant="outline" className={cn("gap-1", style.className)}>
      <Icon />
      {humanize(type)}
    </Badge>
  )
}
