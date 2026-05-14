import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Lock, BookOpen, Trophy, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: StudentDashboard,
});

interface Lesson {
  id: string;
  order_index: number;
  title: string;
  description: string;
  target_wpm: number;
}
interface ProgressRow {
  lesson_id: string;
  best_wpm: number;
  best_accuracy: number;
  completed: boolean;
  attempts: number;
}

function StudentDashboard() {
  const { user } = useAuth();

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, order_index, title, description, target_wpm")
        .order("order_index");
      if (error) throw error;
      return data as Lesson[];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("lesson_id, best_wpm, best_accuracy, completed, attempts")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as ProgressRow[];
    },
  });

  const progressMap = new Map(progress.map((p) => [p.lesson_id, p]));
  const completedCount = progress.filter((p) => p.completed).length;
  const totalCount = lessons.length;
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const avgWpm = progress.length
    ? Math.round(progress.reduce((s, p) => s + p.best_wpm, 0) / progress.length)
    : 0;
  const avgAcc = progress.length
    ? Math.round(progress.reduce((s, p) => s + Number(p.best_accuracy), 0) / progress.length)
    : 0;

  // Find next lesson (first not completed)
  const nextLesson = lessons.find((l) => !progressMap.get(l.id)?.completed);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu painel</h1>
          <p className="mt-1 text-muted-foreground">
            Continue seu treino e acompanhe seu progresso.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={Trophy}
            label="Lições concluídas"
            value={`${completedCount}/${totalCount}`}
          />
          <StatCard icon={Zap} label="PPM médio" value={avgWpm.toString()} />
          <StatCard icon={Target} label="Precisão média" value={`${avgAcc}%`} />
        </div>

        {/* Progress bar */}
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Progresso geral do curso</h2>
            <span className="text-sm text-muted-foreground">{Math.round(pct)}%</span>
          </div>
          <Progress value={pct} />
        </div>

        {/* Next lesson */}
        {nextLesson && (
          <div className="rounded-xl border bg-primary/5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-primary">
                  Continue de onde parou
                </span>
                <h3 className="mt-2 text-xl font-semibold">{nextLesson.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{nextLesson.description}</p>
              </div>
              <Link
                to="/lessons/$lessonId"
                params={{ lessonId: nextLesson.id }}
                className="shrink-0 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Praticar
              </Link>
            </div>
          </div>
        )}

        {/* Lessons grid */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Todas as lições</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {lessons.map((lesson, i) => {
              const p = progressMap.get(lesson.id);
              const prevCompleted = i === 0 || !!progressMap.get(lessons[i - 1].id)?.completed;
              const locked = !prevCompleted && !p?.attempts;
              return (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  progress={p}
                  locked={locked}
                />
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
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

function LessonCard({
  lesson,
  progress,
  locked,
}: {
  lesson: Lesson;
  progress?: ProgressRow;
  locked: boolean;
}) {
  const completed = progress?.completed;
  const Icon = completed ? CheckCircle2 : locked ? Lock : Circle;

  const inner = (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors",
        locked
          ? "opacity-60"
          : "hover:border-primary/50 hover:bg-accent/40 cursor-pointer",
      )}
    >
      <Icon
        className={cn(
          "h-6 w-6 shrink-0",
          completed ? "text-success" : "text-muted-foreground",
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            #{lesson.order_index}
          </span>
          <h3 className="truncate font-medium">{lesson.title.replace(/^Lição \d+ — /, "")}</h3>
        </div>
        {progress && progress.attempts > 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Melhor: {progress.best_wpm} PPM · {Number(progress.best_accuracy).toFixed(0)}% ·{" "}
            {progress.attempts} tentativa(s)
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Não iniciada</p>
        )}
      </div>
      <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );

  if (locked) return inner;
  return (
    <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }}>
      {inner}
    </Link>
  );
}
