import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/admin/lessons")({
  component: AdminLessons,
});

function AdminLessons() {
  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .order("order_index");
      return data ?? [];
    },
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lições do curso</h1>
          <p className="mt-1 text-muted-foreground">
            {lessons.length} lições configuradas. Para editar conteúdo, use o backend.
          </p>
        </div>
        <div className="space-y-2">
          {lessons.map((l) => (
            <div key={l.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{l.title}</h3>
                <span className="text-xs text-muted-foreground">
                  Meta: {l.target_wpm} PPM
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{l.description}</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground line-clamp-2">
                {l.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
