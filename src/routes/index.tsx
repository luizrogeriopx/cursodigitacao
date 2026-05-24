import { createFileRoute, Link } from "@tanstack/react-router";
import { Keyboard, Trophy, BarChart3, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createCheckoutSession } from "@/lib/payments.functions";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, role, loading: authLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Consulta para verificar pagamentos do usuário logado
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["user-payments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
  });

  const hasPaid = payments.length > 0 || role === "admin";

  const handleCheckout = async () => {
    if (!user) {
      // Se não estiver logado, redireciona para a página de login
      window.location.href = "/login";
      return;
    }

    try {
      setIsRedirecting(true);
      const result = await createCheckoutSession();
      if (result?.url) {
        window.location.href = result.url;
      } else {
        alert("Não foi possível gerar a página de pagamento. Tente novamente.");
      }
    } catch (err: any) {
      console.error("Erro no checkout:", err);
      alert(err.message || "Erro ao processar checkout.");
    } finally {
      setIsRedirecting(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-primary/30 selection:text-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-900 bg-slate-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5 group">
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-all duration-300">
              <Keyboard className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent hidden sm:inline">
              Curso de Digitação Online
            </span>
            <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent sm:hidden">
              Digitação
            </span>
          </div>
          <div className="flex items-center gap-3">
            {authLoading || (user && paymentsLoading) ? (
              <Button disabled variant="outline" className="border-slate-800 bg-slate-900/50 text-slate-400 font-bold text-xs tracking-wider uppercase px-4 py-2 h-9 rounded-lg opacity-50">
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Carregando...
              </Button>
            ) : (
              <>
                {/* Botão de Matrícula: Oculto se já pagou */}
                {!hasPaid && (
                  <Button
                    onClick={handleCheckout}
                    disabled={isRedirecting}
                    className="bg-primary hover:bg-primary/90 text-white font-bold text-xs tracking-wider uppercase px-4 py-2 h-9 rounded-lg shadow-md shadow-primary/20 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 hidden sm:inline-flex"
                  >
                    {isRedirecting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Matricule-se"
                    )}
                  </Button>
                )}

                {/* Painel do Aluno: Condicional */}
                {user ? (
                  hasPaid ? (
                    <Link to="/dashboard">
                      <Button variant="outline" className="border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-200 hover:text-white font-bold text-xs tracking-wider uppercase px-4 py-2 h-9 rounded-lg active:scale-95 transition-all duration-200">
                        <span className="hidden sm:inline">Acessar Meu Painel</span>
                        <span className="sm:hidden">Painel</span>
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={handleCheckout}
                      disabled={isRedirecting}
                      variant="outline"
                      className="border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-200 hover:text-white font-bold text-xs tracking-wider uppercase px-4 py-2 h-9 rounded-lg active:scale-95 transition-all duration-200 disabled:opacity-50"
                    >
                      {isRedirecting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : null}
                      <span className="hidden sm:inline">Pagar Matrícula (R$ 47)</span>
                      <span className="sm:hidden">Pagar</span>
                    </Button>
                  )
                ) : (
                  <Link to="/login">
                    <Button variant="outline" className="border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-200 hover:text-white font-bold text-xs tracking-wider uppercase px-4 py-2 h-9 rounded-lg active:scale-95 transition-all duration-200">
                      <span className="hidden sm:inline">Painel do Aluno</span>
                      <span className="sm:hidden">Entrar</span>
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden py-20">
        {/* Background Image with Dark Overlays */}
        <div className="absolute inset-0 z-0">
          <img
            src="/keyboard_background.png"
            alt="Teclado"
            className="h-full w-full object-cover opacity-35 scale-105 animate-pulse"
            style={{ animationDuration: "10s" }}
          />
          {/* Gradients to blend the image seamlessly */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/90" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-transparent to-slate-950/90" />
          {/* Subtle colored glow effects (radial gradients) */}
          <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/3 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Curso completo · 20 lições progressivas
          </span>
          <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl leading-tight">
            {hasPaid ? (
              <>
                Bem-vindo ao seu{" "}
                <span className="bg-gradient-to-r from-primary via-blue-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-sm block sm:inline">
                  Painel de Aluno
                </span>
              </>
            ) : (
              <>
                Aprenda a digitar com{" "}
                <span className="bg-gradient-to-r from-primary via-blue-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-sm block sm:inline">
                  velocidade e precisão
                </span>
              </>
            )}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 md:text-xl leading-relaxed">
            {hasPaid
              ? "Pronto para continuar? Seu painel de lições estruturadas, histórico de tentativas e relatórios de velocidade (PPM) já estão liberados para você."
              : "Curso estruturado em etapas progressivas, da linha guia até textos avançados. Acompanhe sua evolução em tempo real com métricas de PPM e precisão."}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
            {authLoading || (user && paymentsLoading) ? (
              <Button size="lg" disabled variant="outline" className="w-full sm:w-auto border-slate-800 bg-slate-900/40 text-slate-400 font-bold uppercase tracking-wider px-8 py-6 text-sm rounded-xl backdrop-blur-sm opacity-50">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Carregando...
              </Button>
            ) : !hasPaid ? (
              <>
                <Button
                  size="lg"
                  onClick={handleCheckout}
                  disabled={isRedirecting}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider px-8 py-6 text-sm rounded-xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {isRedirecting && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Matricule-se agora
                </Button>

                {user ? (
                  <Button
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isRedirecting}
                    variant="outline"
                    className="w-full sm:w-auto border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-slate-200 hover:text-white font-bold uppercase tracking-wider px-8 py-6 text-sm rounded-xl backdrop-blur-sm active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                  >
                    {isRedirecting && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Pagar Matrícula (R$ 47)
                  </Button>
                ) : (
                  <Link to="/login" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="w-full border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-slate-200 hover:text-white font-bold uppercase tracking-wider px-8 py-6 text-sm rounded-xl backdrop-blur-sm active:scale-[0.98] transition-all duration-200">
                      Painel do Aluno
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <Link to="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider px-8 py-6 text-sm rounded-xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all duration-200 cursor-pointer">
                  Acessar Meu Painel
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24 relative z-10">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              icon: Keyboard,
              title: "20 lições progressivas",
              text: "Da linha guia (asdf jklç) até textos completos com pontuação, números e símbolos.",
              color: "from-blue-500/20 to-cyan-500/20 text-blue-400",
            },
            {
              icon: BarChart3,
              title: "Métricas em tempo real",
              text: "Acompanhe PPM (palavras por minuto), precisão e tentativas em cada exercício.",
              color: "from-purple-500/20 to-pink-500/20 text-purple-400",
            },
            {
              icon: Trophy,
              title: "Progresso registrado",
              text: "Cada lição concluída fica salva no seu painel. Veja sua evolução completa.",
              color: "from-amber-500/20 to-orange-500/20 text-amber-400",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-slate-800 bg-slate-900/40 p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900/60"
            >
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${f.color} mb-6`}>
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors duration-300">
                {f.title}
              </h3>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                {f.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-slate-900 bg-slate-950/80 py-24 relative overflow-hidden">
        {/* Background glow for CTA */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 animate-pulse">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-8 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {hasPaid ? "Bons Treinos!" : "Comece hoje mesmo"}
          </h2>
          <p className="mt-4 max-w-xl text-slate-400 text-base leading-relaxed">
            {hasPaid
              ? "Você já concluiu sua matrícula e tem acesso vitalício a toda a plataforma. Treine diariamente para aperfeiçoar sua digitação!"
              : "Garanta seu acesso vitalício e desenvolva uma habilidade valiosa para a vida toda. Aulas práticas, acompanhamento de progresso e suporte."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {authLoading || (user && paymentsLoading) ? (
              <Button size="lg" disabled variant="outline" className="border-slate-800 bg-slate-900/40 text-slate-400 font-bold uppercase tracking-wider px-8 py-6 text-sm rounded-xl backdrop-blur-sm opacity-50">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Carregando...
              </Button>
            ) : hasPaid ? (
              <Link to="/dashboard">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider px-8 py-6 text-sm rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-all duration-200 cursor-pointer">
                  Acessar Meu Painel
                </Button>
              </Link>
            ) : (
              <Button
                size="lg"
                onClick={handleCheckout}
                disabled={isRedirecting}
                className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider px-8 py-6 text-sm rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {isRedirecting && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Matricule-se agora
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-8 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row gap-4 items-center justify-between px-6 py-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            <span className="font-semibold text-slate-400">Curso de Digitação Online</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              hasPaid ? (
                <Link to="/dashboard" className="hover:text-primary transition-colors font-semibold uppercase text-xs tracking-wider">
                  Meu Painel
                </Link>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={isRedirecting || paymentsLoading}
                  className="hover:text-primary transition-colors font-semibold uppercase text-xs tracking-wider disabled:opacity-50 cursor-pointer"
                >
                  Realizar Pagamento
                </button>
              )
            ) : (
              <>
                <Link to="/login" className="hover:text-primary transition-colors font-semibold uppercase text-xs tracking-wider">
                  Painel do Aluno
                </Link>
                <Link to="/login" className="hover:text-primary transition-colors font-semibold uppercase text-xs tracking-wider">
                  Matricule-se
                </Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

