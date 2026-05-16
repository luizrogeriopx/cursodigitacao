import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, type FormEvent } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { hasAnyAdmin as hasAnyAdminFn } from "@/lib/auth.functions";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, session, role, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "first-admin">("signin");
  const [fullName, setFullName] = useState("");
  const [hasAnyAdmin, setHasAnyAdmin] = useState<boolean | null>(null);
  const checkHasAnyAdmin = useServerFn(hasAnyAdminFn);

  // Detect if there's no admin yet — allow first-admin signup
  useEffect(() => {
    checkHasAnyAdmin()
      .then((data) => setHasAnyAdmin(data.hasAnyAdmin))
      .catch(() => setHasAnyAdmin(true));
  }, [checkHasAnyAdmin]);

  useEffect(() => {
    if (!loading && session && role) {
      navigate({ to: role === "admin" ? "/admin" : "/dashboard" });
    }
  }, [loading, session, role, navigate]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      toast.success("Bem-vindo!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setBusy(false);
    }
  };

  const handleFirstAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
      toast.success("Administrador criado! Entrando...");
      await signIn(email, password);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <Keyboard className="h-6 w-6 text-primary" />
          <span className="font-semibold">Datilografia Online</span>
        </Link>

        <div className="rounded-xl border bg-card p-8 shadow-sm">
          {mode === "signin" ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Acesse sua conta de aluno ou administrador.
              </p>

              <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              {hasAnyAdmin === false && (
                <button
                  onClick={() => setMode("first-admin")}
                  className="mt-4 w-full text-center text-sm text-primary hover:underline"
                >
                  Configurar primeiro administrador
                </button>
              )}
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">
                Criar conta de administrador
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Esta é a primeira conta do sistema. Você terá acesso total.
              </p>

              <form onSubmit={handleFirstAdmin} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fname">Nome completo</Label>
                  <Input
                    id="fname"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">Email</Label>
                  <Input
                    id="email2"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw2">Senha</Label>
                  <Input
                    id="pw2"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Criando..." : "Criar administrador"}
                </Button>
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Voltar para entrar
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Alunos novos? Solicite acesso ao administrador.
        </p>
      </div>
    </div>
  );
}
