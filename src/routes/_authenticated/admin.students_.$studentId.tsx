import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/students_/$studentId")({
  component: StudentProgress,
});

function StudentProgress() {
  const { studentId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-student-progress", studentId],
    queryFn: async () => {
      const [{ data: profile }, { data: lessons }, { data: progress }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, address, created_at")
          .eq("id", studentId)
          .maybeSingle(),
        supabase
          .from("lessons")
          .select("id, title, order_index, target_wpm")
          .order("order_index"),
        supabase
          .from("lesson_progress")
          .select("lesson_id, completed, best_wpm, best_accuracy, attempts, last_attempt_at")
          .eq("user_id", studentId),
      ]);
      return {
        profile,
        lessons: lessons ?? [],
        progress: progress ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return (
      <AppShell>
        <div className="p-10 text-center text-muted-foreground">Carregando...</div>
      </AppShell>
    );
  }

  if (!data.profile) {
    return (
      <AppShell>
        <div className="p-10 text-center text-muted-foreground">Aluno não encontrado.</div>
      </AppShell>
    );
  }

  const progressByLesson = new Map(data.progress.map((p) => [p.lesson_id, p]));
  const completed = data.progress.filter((p) => p.completed).length;
  const total = data.lessons.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const avgWpm =
    data.progress.length > 0
      ? Math.round(
          data.progress.reduce((s, p) => s + (p.best_wpm || 0), 0) / data.progress.length,
        )
      : 0;
  const avgAcc =
    data.progress.length > 0
      ? data.progress.reduce((s, p) => s + Number(p.best_accuracy || 0), 0) /
        data.progress.length
      : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/admin/students">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para alunos
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {data.profile.full_name || "Aluno"}
          </h1>
          <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
            <div>{data.profile.email}</div>
            {data.profile.phone && <div>Telefone: {data.profile.phone}</div>}
            {data.profile.address && <div>Endereço: {data.profile.address}</div>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Lições concluídas" value={`${completed} / ${total}`} />
          <StatCard label="Melhor WPM (média)" value={String(avgWpm)} />
          <StatCard label="Precisão média" value={`${avgAcc.toFixed(1)}%`} />
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Progresso geral</h2>
            <span className="text-sm text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Lição</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Melhor WPM</th>
                <th className="px-4 py-3 font-medium">Precisão</th>
                <th className="px-4 py-3 font-medium">Tentativas</th>
                <th className="px-4 py-3 font-medium">Última tentativa</th>
              </tr>
            </thead>
            <tbody>
              {data.lessons.map((l) => {
                const p = progressByLesson.get(l.id);
                return (
                  <tr key={l.id} className="border-t">
                    <td className="px-4 py-3 font-medium">
                      {l.order_index}. {l.title}
                    </td>
                    <td className="px-4 py-3">
                      {p?.completed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" /> Concluída
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Circle className="h-4 w-4" />
                          {p ? "Em andamento" : "Não iniciada"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {p?.best_wpm ?? 0}
                      <span className="text-xs text-muted-foreground"> / {l.target_wpm}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {p ? `${Number(p.best_accuracy).toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{p?.attempts ?? 0}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p?.last_attempt_at
                        ? new Date(p.last_attempt_at).toLocaleString("pt-BR")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
