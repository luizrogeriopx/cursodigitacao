import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, type FormEvent } from "react";
import { Keyboard, Loader2 } from "lucide-react";
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
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  
  // Status states
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "first-admin">("signin");
  const [hasAnyAdmin, setHasAnyAdmin] = useState<boolean | null>(null);
  const checkHasAnyAdmin = useServerFn(hasAnyAdminFn);

  // Detect if there's no admin yet — allow first-admin signup
  useEffect(() => {
    checkHasAnyAdmin()
      .then((data) => {
        setHasAnyAdmin(data.hasAnyAdmin);
        if (data.hasAnyAdmin === false) {
          setMode("first-admin");
        }
      })
      .catch(() => setHasAnyAdmin(true));
  }, [checkHasAnyAdmin]);

  useEffect(() => {
    if (!loading && session && role) {
      navigate({ to: role === "admin" ? "/admin" : "/dashboard" });
    }
  }, [loading, session, role, navigate]);

  // Input Formatting Helpers
  const handleCpfChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    const formatted = clean
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
    setCpf(formatted);
  };

  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    let formatted = clean;
    if (clean.length <= 10) {
      formatted = clean
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    } else {
      formatted = clean
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
    // Limit to max formatted phone length
    if (formatted.length > 15) {
      formatted = formatted.substring(0, 15);
    }
    setPhone(formatted);
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      toast.success("Bem-vindo de volta!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            cpf: cpf,
            birth_date: birthDate,
            phone: phone,
          },
        },
      });
      if (error) throw error;

      // Upsert profile in the public schema
      if (data?.user) {
        const { error: profileErr } = await supabase
          .from("profiles")
          .upsert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            phone: phone,
          });
        if (profileErr) {
          console.error("Erro ao sincronizar perfil:", profileErr);
        }
      }

      toast.success("Cadastro realizado com sucesso! Acesse sua conta.");
      setMode("signin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar");
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

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Erro no login social");
    }
  };

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-primary/30 selection:text-white flex flex-col items-center justify-center px-4 relative overflow-hidden py-12">
      {/* Background Image with Dark Overlays */}
      <div className="absolute inset-0 z-0">
        <img
          src="/keyboard_background.png"
          alt="Teclado"
          className="h-full w-full object-cover opacity-20 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-primary/10 rounded-full blur-[110px] pointer-events-none" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5 group">
          <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-all duration-300">
            <Keyboard className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Datilografia Online
          </span>
        </Link>

        <div className="rounded-2xl border border-slate-900 bg-slate-950/80 backdrop-blur-xl p-8 shadow-2xl">
          {mode !== "first-admin" && (
            <div className="flex border-b border-slate-900 mb-6 justify-center">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`pb-3 px-6 text-sm font-semibold transition-all duration-200 border-b-2 cursor-pointer ${
                  mode === "signin"
                    ? "border-primary text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`pb-3 px-6 text-sm font-semibold transition-all duration-200 border-b-2 cursor-pointer ${
                  mode === "signup"
                    ? "border-primary text-white"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Cadastrar-se
              </button>
            </div>
          )}

          {mode === "signin" && (
            <>
              <h1 className="text-xl font-bold tracking-tight text-white text-center">Entrar no painel</h1>
              <p className="mt-1.5 text-xs text-slate-400 text-center">
                Acesse sua conta para continuar suas lições.
              </p>

              <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-900/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary/50 h-10 rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">Senha</Label>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-900/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary/50 h-10 rounded-lg"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 rounded-lg shadow-md shadow-primary/10 active:scale-[0.98] transition-all cursor-pointer"
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </>
          )}

          {mode === "signup" && (
            <>
              <h1 className="text-xl font-bold tracking-tight text-white text-center">Criar nova conta</h1>
              <p className="mt-1.5 text-xs text-slate-400 text-center">
                Preencha os dados abaixo para se cadastrar no curso.
              </p>

              <form onSubmit={handleSignUp} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name">Nome Completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome completo"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-slate-900/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary/50 h-10 rounded-lg"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-cpf">CPF</Label>
                    <Input
                      id="signup-cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      required
                      value={cpf}
                      onChange={(e) => handleCpfChange(e.target.value)}
                      className="bg-slate-900/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary/50 h-10 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-birth">Nascimento</Label>
                    <Input
                      id="signup-birth"
                      type="date"
                      required
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="bg-slate-900/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary/50 h-10 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-phone">Telefone</Label>
                  <Input
                    id="signup-phone"
                    type="text"
                    placeholder="(00) 00000-0000"
                    required
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="bg-slate-900/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary/50 h-10 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="exemplo@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-900/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary/50 h-10 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-900/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary/50 h-10 rounded-lg"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 rounded-lg shadow-md shadow-primary/10 active:scale-[0.98] transition-all cursor-pointer mt-2"
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Cadastrando...
                    </>
                  ) : (
                    "Cadastrar Conta"
                  )}
                </Button>
              </form>
            </>
          )}

          {mode === "first-admin" && (
            <>
              <h1 className="text-xl font-bold tracking-tight text-white text-center">
                Criar administrador inicial
              </h1>
              <p className="mt-1.5 text-xs text-slate-400 text-center">
                Esta é a primeira conta do sistema. Você terá acesso total.
              </p>

              <form onSubmit={handleFirstAdmin} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fname">Nome completo</Label>
                  <Input
                    id="fname"
                    placeholder="Administrador"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-slate-900/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary/50 h-10 rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-admin">Email</Label>
                  <Input
                    id="email-admin"
                    type="email"
                    placeholder="admin@exemplo.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-900/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary/50 h-10 rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-admin">Senha</Label>
                  <Input
                    id="pw-admin"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-900/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary/50 h-10 rounded-lg"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 rounded-lg shadow-md shadow-primary/10 active:scale-[0.98] transition-all cursor-pointer mt-2"
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Criando...
                    </>
                  ) : (
                    "Criar administrador"
                  )}
                </Button>
                {hasAnyAdmin && (
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="w-full text-center text-xs text-slate-400 hover:text-white mt-2 transition-colors cursor-pointer"
                  >
                    Voltar para entrar
                  </button>
                )}
              </form>
            </>
          )}

          {/* Social Sign In (Only for non-first-admin setups) */}
          {mode !== "first-admin" && (
            <div className="mt-6">
              <div className="relative flex items-center justify-center my-4">
                <div className="absolute border-t border-slate-900 w-full" />
                <span className="relative bg-slate-950 px-3 text-[10px] text-slate-500 uppercase tracking-wider">
                  Ou continue com
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full border border-slate-800 bg-slate-900/30 hover:bg-slate-900 text-slate-200 hover:text-white font-medium py-2 rounded-xl transition-all duration-200 flex items-center justify-center text-sm cursor-pointer"
              >
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Google
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
