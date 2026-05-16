import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const hasAnyAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if (error) throw new Error("Não foi possível verificar o administrador inicial");

  return { hasAnyAdmin: (count ?? 0) > 0 };
});

export const getCurrentUserRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw new Error("Não foi possível carregar seu tipo de conta");

    return {
      userId: context.userId,
      role: data?.role === "admin" ? "admin" : "student",
    };
  });