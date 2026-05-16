import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Megaphone, Trash2, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  listStudentsForRecipients,
} from "@/lib/announcements.functions";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  component: AnnouncementsAdmin,
});

function AnnouncementsAdmin() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchList = useServerFn(listAnnouncements);
  const fetchStudents = useServerFn(listStudentsForRecipients);
  const createFn = useServerFn(createAnnouncement);
  const deleteFn = useServerFn(deleteAnnouncement);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sendToAll, setSendToAll] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const { data: list, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: () => fetchList(),
  });

  const { data: studentsData } = useQuery({
    queryKey: ["admin-recipient-students"],
    queryFn: () => fetchStudents(),
    enabled: open && !sendToAll,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          title: title.trim(),
          body: body.trim(),
          image_url: imageUrl || "",
          link_url: linkUrl.trim() || "",
          send_to_all: sendToAll,
          recipient_ids: sendToAll ? [] : Array.from(selected),
        },
      }),
    onSuccess: () => {
      toast.success("Recado enviado");
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
      setOpen(false);
      setTitle("");
      setBody("");
      setLinkUrl("");
      setImageUrl("");
      setSendToAll(true);
      setSelected(new Set());
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Recado removido");
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleImageUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("announcements")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("announcements").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Imagem enviada");
    } catch (err) {
      const e = err as Error;
      toast.error("Erro no upload: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const filteredStudents = (studentsData?.students ?? []).filter((s) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recados</h1>
            <p className="mt-1 text-muted-foreground">
              Envie avisos para todos ou apenas alunos selecionados. Eles veem o
              recado uma vez ao abrir o sistema.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Megaphone className="mr-2 h-4 w-4" /> Novo recado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo recado</DialogTitle>
                <DialogDescription>
                  Texto, imagem (1080x1080) e link opcionais.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={160}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Mensagem</Label>
                  <Textarea
                    id="body"
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={4000}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link">Link (opcional)</Label>
                  <Input
                    id="link"
                    type="url"
                    placeholder="https://"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imagem 1080x1080 (opcional)</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="img"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(f);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("img")?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="mr-2 h-4 w-4" />
                      )}
                      {imageUrl ? "Trocar imagem" : "Escolher imagem"}
                    </Button>
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt="Prévia"
                        className="h-16 w-16 rounded object-cover"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="all"
                      checked={sendToAll}
                      onCheckedChange={(c) => setSendToAll(!!c)}
                    />
                    <Label htmlFor="all" className="cursor-pointer">
                      Enviar para todos os alunos
                    </Label>
                  </div>
                  {!sendToAll && (
                    <div className="space-y-2 pt-2">
                      <Input
                        placeholder="Filtrar por nome ou email"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <div className="max-h-56 overflow-y-auto rounded border">
                        {filteredStudents.length === 0 && (
                          <div className="p-3 text-sm text-muted-foreground">
                            Nenhum aluno
                          </div>
                        )}
                        {filteredStudents.map((s) => (
                          <label
                            key={s.id}
                            className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/40"
                          >
                            <Checkbox
                              checked={selected.has(s.id)}
                              onCheckedChange={() => toggle(s.id)}
                            />
                            <div className="flex-1">
                              <div>{s.full_name || "(sem nome)"}</div>
                              <div className="text-xs text-muted-foreground">
                                {s.email}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selected.size} selecionado(s)
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={createMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (!title.trim()) {
                      toast.error("Informe um título");
                      return;
                    }
                    if (!sendToAll && selected.size === 0) {
                      toast.error("Selecione ao menos um aluno");
                      return;
                    }
                    createMutation.mutate();
                  }}
                  disabled={createMutation.isPending || uploading}
                >
                  {createMutation.isPending ? "Enviando..." : "Enviar recado"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl border bg-card">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
          ) : (list?.items ?? []).length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Nenhum recado enviado ainda.
            </div>
          ) : (
            <ul className="divide-y">
              {list!.items.map((a) => (
                <li key={a.id} className="flex gap-4 p-4">
                  {a.image_url ? (
                    <img
                      src={a.image_url}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-muted">
                      <Megaphone className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{a.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(a.created_at).toLocaleString("pt-BR")} •{" "}
                          {a.send_to_all ? "Todos" : "Selecionados"} •{" "}
                          {a.reads}/{a.target_count} leram
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover recado?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(a.id)}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    {a.body && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {a.body}
                      </p>
                    )}
                    {a.link_url && (
                      <a
                        href={a.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs text-primary hover:underline"
                      >
                        {a.link_url}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
