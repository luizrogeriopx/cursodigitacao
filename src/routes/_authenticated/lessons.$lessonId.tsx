import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { TypingExercise } from "@/components/typing-exercise";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/lessons/$lessonId")({
  component: LessonPage,
});

function LessonPage() {
  const { lessonId } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .order("order_index");
      return data ?? [];
    },
  });

  const lesson = lessons.find((l) => l.id === lessonId);
  const idx = lessons.findIndex((l) => l.id === lessonId);
  const prev = idx > 0 ? lessons[idx - 1] : null;
  const next = idx < lessons.length - 1 ? lessons[idx + 1] : null;

  const { data: existing } = useQuery({
    queryKey: ["progress", user?.id, lessonId],
    enabled: !!user && !!lessonId,
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("user_id", user!.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();
      return data;
    },
  });

  const handleComplete = async ({ wpm, accuracy }: { wpm: number; accuracy: number }) => {
    if (!user || !lesson) return;
    const completed = wpm >= lesson.target_wpm * 0.7 && accuracy >= 90;
    const bestWpm = Math.max(existing?.best_wpm ?? 0, wpm);
    const bestAccuracy = Math.max(Number(existing?.best_accuracy ?? 0), accuracy);
    const attempts = (existing?.attempts ?? 0) + 1;

    const { error } = await supabase.from("lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: lesson.id,
        best_wpm: bestWpm,
        best_accuracy: bestAccuracy,
        completed: completed || existing?.completed || false,
        attempts,
        last_attempt_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" },
    );

    if (error) {
      toast.error("Erro ao salvar progresso");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["progress"] });
    if (completed) {
      toast.success("Lição concluída! 🎉");
    } else {
      toast.info(`Continue praticando para atingir ${lesson.target_wpm} PPM com 90%+ de precisão.`);
    }
  };

  if (lessonsLoading) {
    return (
      <AppShell>
        <div className="p-10 text-center text-muted-foreground">Carregando lição...</div>
      </AppShell>
    );
  }

  if (!lesson || !lesson.content) {
    return (
      <AppShell>
        <div className="p-10 text-center text-muted-foreground">Lição não encontrada</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao painel
        </Link>

        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-primary">
            Lição {lesson.order_index} de {lessons.length}
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{lesson.title}</h1>
          <p className="mt-2 text-muted-foreground">{lesson.description}</p>
        </div>

        <TypingExercise
          text={lesson.content}
          targetWpm={lesson.target_wpm}
          onComplete={handleComplete}
        />

        <div className="flex justify-between border-t pt-4">
          {prev ? (
            <button
              onClick={() => navigate({ to: "/lessons/$lessonId", params: { lessonId: prev.id } })}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Lição anterior
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button
              onClick={() => navigate({ to: "/lessons/$lessonId", params: { lessonId: next.id } })}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Próxima lição
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
