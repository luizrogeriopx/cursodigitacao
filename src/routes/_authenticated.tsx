import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AnnouncementPopup } from "@/components/announcement-popup";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createCheckoutSession } from "@/lib/payments.functions";
import { ShieldAlert, CreditCard, LogOut, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/login" });
    }
  }, [session, loading, navigate]);

  // Consulta para verificar pagamentos do usuário logado
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["user-payments", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id")
        .eq("user_id", session!.user.id);
      if (error) throw error;
      return data;
    },
  });

  const hasPaid = payments.length > 0 || role === "admin";

  const handlePayment = async () => {
    try {
      setIsRedirecting(true);
      const result = await createCheckoutSession();
      if (result?.url) {
        window.location.href = result.url;
      } else {
        alert("Não foi possível gerar a página de pagamento. Tente novamente.");
      }
    } catch (err: any) {
      console.error("Erro ao iniciar pagamento:", err);
      alert(err.message || "Ocorreu um erro ao processar o pagamento.");
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  if (loading || (session && paymentsLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-slate-400">Verificando dados de acesso...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Se o aluno não pagou e não é administrador, bloqueia e exibe tela de pagamento
  if (!hasPaid) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100 overflow-hidden">
        {/* Efeitos de Luz no Fundo */}
        <div className="absolute top-1/4 left-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 rounded-full bg-purple-500/10 blur-[100px]" />

        <div className="w-full max-w-md rounded-2xl border border-slate-900 bg-slate-900/40 p-8 text-center backdrop-blur-xl shadow-2xl space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Matrícula Pendente</h1>
            <p className="text-sm text-slate-400">
              Olá, <span className="font-semibold text-slate-200">{session.user.email}</span>. 
              Para desbloquear seu acesso à plataforma, lições e estatísticas, conclua o pagamento da taxa de matrícula.
            </p>
          </div>

          {/* Card com Detalhes do Produto */}
          <div className="rounded-xl bg-slate-950/60 border border-slate-900 p-5 text-left space-y-3">
            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span className="text-xs text-slate-500">Curso</span>
              <span className="text-sm font-medium text-slate-200">Digitação Completo</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
              <span className="text-xs text-slate-500">Tipo de Acesso</span>
              <span className="text-sm font-medium text-green-400">Vitalício</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-slate-400 font-semibold">Valor Total</span>
              <span className="text-lg font-bold text-slate-100">R$ 47,00</span>
            </div>
          </div>

          {/* Botão de Pagamento */}
          <button
            onClick={handlePayment}
            disabled={isRedirecting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 px-4 font-semibold text-primary-foreground transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Redirecionando...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                PAGAR COM STRIPE (R$ 47)
              </>
            )}
          </button>

          {/* Link para Deslogar */}
          <div className="pt-2 border-t border-slate-900/60">
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair desta conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Outlet />
      <AnnouncementPopup />
    </>
  );
}
