import { Boxes } from "lucide-react"
import { cn } from "@/lib/utils"

export function Logo({
  className,
  showText = true,
}: {
  className?: string
  showText?: boolean
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-crimson to-maroon text-cream shadow-sm ring-1 ring-sand/30">
        <Boxes className="size-5" />
      </div>
      {showText && (
        <div className="grid leading-tight">
          <span className="font-heading text-sm font-semibold tracking-tight">
            Stockroom
          </span>
          <span className="text-xs opacity-70">Inventory Management</span>
        </div>
      )}
    </div>
  )
}
