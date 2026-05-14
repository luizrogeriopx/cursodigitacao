import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Users, CreditCard, BookOpen, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [students, lessons, paymentsThisMonth, totalProgress] = await Promise.all([
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("lessons").select("id", { count: "exact", head: true }),
        supabase
          .from("payments")
          .select("amount")
          .gte("paid_at", monthStart.toISOString()),
        supabase.from("lesson_progress").select("id", { count: "exact", head: true }).eq("completed", true),
      ]);

      const totalRevenue = (paymentsThisMonth.data ?? []).reduce(
        (s, p) => s + Number(p.amount),
        0,
      );

      return {
        students: students.count ?? 0,
        lessons: lessons.count ?? 0,
        revenue: totalRevenue,
        completions: totalProgress.count ?? 0,
      };
    },
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão geral</h1>
          <p className="mt-1 text-muted-foreground">
            Resumo da operação do curso.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card icon={Users} label="Alunos ativos" value={stats?.students ?? 0} />
          <Card icon={BookOpen} label="Lições no curso" value={stats?.lessons ?? 0} />
          <Card
            icon={CreditCard}
            label="Receita do mês"
            value={`R$ ${(stats?.revenue ?? 0).toFixed(2)}`}
          />
          <Card
            icon={TrendingUp}
            label="Lições concluídas (total)"
            value={stats?.completions ?? 0}
          />
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Atalhos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use o menu à esquerda para gerenciar alunos, mensalidades e lições.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function Card({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
