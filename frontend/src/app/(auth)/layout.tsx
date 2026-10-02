import { AuthShell } from "./auth-shell"

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <AuthShell>{children}</AuthShell>
}
