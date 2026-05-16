import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  getUnreadAnnouncements,
  markAnnouncementRead,
} from "@/lib/announcements.functions";
import { ExternalLink } from "lucide-react";

export function AnnouncementPopup() {
  const { user, role, loading } = useAuth();
  const fetchUnread = useServerFn(getUnreadAnnouncements);
  const markRead = useServerFn(markAnnouncementRead);
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);

  const { data } = useQuery({
    queryKey: ["unread-announcements", user?.id],
    queryFn: () => fetchUnread(),
    enabled: !!user && !loading,
    refetchOnWindowFocus: false,
  });

  const items = data?.items ?? [];
  const current = items[index];

  const mutation = useMutation({
    mutationFn: (id: string) => markRead({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unread-announcements", user?.id] });
    },
  });

  useEffect(() => {
    setIndex(0);
  }, [data?.items?.length]);

  if (!current || role === null) return null;

  const handleClose = async () => {
    const id = current.id;
    await mutation.mutateAsync(id);
    if (index + 1 < items.length) {
      setIndex(index + 1);
    } else {
      setIndex(0);
    }
  };

  return (
    <Dialog open={!!current} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {current.image_url && (
          <img
            src={current.image_url}
            alt={current.title}
            className="aspect-square w-full object-cover"
          />
        )}
        <div className="space-y-3 p-6">
          <DialogTitle className="text-xl font-bold">{current.title}</DialogTitle>
          {current.body && (
            <DialogDescription className="whitespace-pre-wrap text-sm text-foreground">
              {current.body}
            </DialogDescription>
          )}
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
            {current.link_url && (
              <Button asChild variant="outline">
                <a href={current.link_url} target="_blank" rel="noopener noreferrer">
                  Abrir link <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            <Button onClick={handleClose} disabled={mutation.isPending}>
              {index + 1 < items.length ? "Próximo" : "Entendi"}
            </Button>
          </div>
          {items.length > 1 && (
            <div className="text-center text-xs text-muted-foreground">
              {index + 1} de {items.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
