import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Keyboard, LayoutDashboard, BookOpen, Users, CreditCard, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const studentNav: NavItem[] = [
    { to: "/dashboard", label: "Meu painel", icon: LayoutDashboard },
    { to: "/lessons", label: "Lições", icon: BookOpen },
  ];

  const adminNav: NavItem[] = [
    { to: "/admin", label: "Visão geral", icon: LayoutDashboard },
    { to: "/admin/students", label: "Alunos", icon: Users },
    { to: "/admin/payments", label: "Mensalidades", icon: CreditCard },
    { to: "/admin/lessons", label: "Lições", icon: BookOpen },
  ];

  const isAdmin = role === "admin";

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-64 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Keyboard className="h-5 w-5 text-primary" />
          <span className="font-semibold">Datilografia</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {role === "admin" && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
              <Shield className="h-3.5 w-3.5" />
              Modo administrador
            </div>
          )}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 px-2 text-xs text-muted-foreground truncate">
            {user?.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-background px-6 md:hidden">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <span className="font-semibold">Datilografia</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
