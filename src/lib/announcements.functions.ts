import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso negado");
}

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().min(1).max(160),
        body: z.string().max(4000).optional().default(""),
        image_url: z.string().url().max(1000).optional().or(z.literal("")),
        link_url: z.string().url().max(1000).optional().or(z.literal("")),
        send_to_all: z.boolean(),
        recipient_ids: z.array(z.string().uuid()).max(2000).optional().default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: ann, error } = await supabaseAdmin
      .from("announcements")
      .insert({
        title: data.title,
        body: data.body ?? "",
        image_url: data.image_url || null,
        link_url: data.link_url || null,
        send_to_all: data.send_to_all,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (!data.send_to_all) {
      if (!data.recipient_ids || data.recipient_ids.length === 0) {
        throw new Error("Selecione ao menos um aluno");
      }
      const rows = data.recipient_ids.map((uid) => ({
        announcement_id: ann.id,
        user_id: uid,
      }));
      const { error: rErr } = await supabaseAdmin
        .from("announcement_recipients")
        .insert(rows);
      if (rErr) throw new Error(rErr.message);
    }

    return { id: ann.id };
  });

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("announcements")
      .select("id, title, body, image_url, link_url, send_to_all, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (data ?? []).map((a) => a.id);
    let readsByAnn: Record<string, number> = {};
    let recipsByAnn: Record<string, number> = {};
    if (ids.length) {
      const [{ data: reads }, { data: recs }] = await Promise.all([
        supabaseAdmin.from("announcement_reads").select("announcement_id").in("announcement_id", ids),
        supabaseAdmin.from("announcement_recipients").select("announcement_id").in("announcement_id", ids),
      ]);
      (reads ?? []).forEach((r) => {
        readsByAnn[r.announcement_id] = (readsByAnn[r.announcement_id] ?? 0) + 1;
      });
      (recs ?? []).forEach((r) => {
        recipsByAnn[r.announcement_id] = (recipsByAnn[r.announcement_id] ?? 0) + 1;
      });
    }

    const { count: totalStudents } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student");

    return {
      items: (data ?? []).map((a) => ({
        ...a,
        reads: readsByAnn[a.id] ?? 0,
        target_count: a.send_to_all ? totalStudents ?? 0 : recipsByAnn[a.id] ?? 0,
      })),
    };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("announcements")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listStudentsForRecipients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) return { students: [] };
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids)
      .order("full_name");
    return { students: profiles ?? [] };
  });

export const getUnreadAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const { data: anns } = await supabaseAdmin
      .from("announcements")
      .select("id, title, body, image_url, link_url, send_to_all, created_at")
      .order("created_at", { ascending: false });

    const list = anns ?? [];
    if (!list.length) return { items: [] };

    const ids = list.map((a) => a.id);
    const [{ data: recs }, { data: reads }] = await Promise.all([
      supabaseAdmin
        .from("announcement_recipients")
        .select("announcement_id")
        .eq("user_id", uid)
        .in("announcement_id", ids),
      supabaseAdmin
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", uid)
        .in("announcement_id", ids),
    ]);
    const targetedSet = new Set((recs ?? []).map((r) => r.announcement_id));
    const readSet = new Set((reads ?? []).map((r) => r.announcement_id));

    const items = list.filter(
      (a) => (a.send_to_all || targetedSet.has(a.id)) && !readSet.has(a.id),
    );
    return { items };
  });

export const markAnnouncementRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("announcement_reads")
      .upsert(
        { announcement_id: data.id, user_id: context.userId },
        { onConflict: "announcement_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
