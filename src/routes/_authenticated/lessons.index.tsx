import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lessons/")({
  component: LessonsListPage,
});

function LessonsListPage() {
  const { user } = useAuth();
  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, order_index, title, description, target_wpm")
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });
  const { data: progress = [] } = useQuery({
    queryKey: ["progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed, best_wpm, best_accuracy")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });
  const map = new Map(progress.map((p) => [p.lesson_id, p]));

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lições</h1>
          <p className="mt-1 text-muted-foreground">
            Avance pelas etapas em sequência para construir sua fluidez.
          </p>
        </div>
        <div className="space-y-2">
          {lessons.map((lesson) => {
            const p = map.get(lesson.id);
            return (
              <Link
                key={lesson.id}
                to="/lessons/$lessonId"
                params={{ lessonId: lesson.id }}
                className="flex items-center gap-4 rounded-lg border bg-card p-4 hover:border-primary/50 hover:bg-accent/30 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {p?.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    lesson.order_index
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{lesson.title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                    {lesson.description}
                  </p>
                </div>
                <div className="hidden md:block text-right text-xs text-muted-foreground">
                  <div>Meta: {lesson.target_wpm} PPM</div>
                  {p && p.best_wpm > 0 && (
                    <div className="text-success">
                      Melhor: {p.best_wpm} PPM
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
