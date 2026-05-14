import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  component: PaymentsAdmin,
});

interface PaymentRow {
  id: string;
  user_id: string;
  reference_month: string;
  amount: number;
  paid_at: string;
  payment_method: string;
  notes: string | null;
}

function PaymentsAdmin() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [form, setForm] = useState({
    user_id: "",
    reference_month: defaultMonth,
    amount: "",
    payment_method: "pix",
    notes: "",
  });

  const { data: students = [] } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      return data ?? [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .order("paid_at", { ascending: false });
      return (data ?? []) as PaymentRow[];
    },
  });

  const studentMap = new Map(students.map((s) => [s.id, s]));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const refDate = `${form.reference_month}-01`;
      const { error } = await supabase.from("payments").insert({
        user_id: form.user_id,
        reference_month: refDate,
        amount: parseFloat(form.amount),
        payment_method: form.payment_method,
        notes: form.notes || null,
      });
      if (error) throw error;
      toast.success("Pagamento registrado!");
      setOpen(false);
      setForm({ ...form, user_id: "", amount: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    toast.success("Pagamento removido");
    queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const formatMonth = (d: string) => {
    const [y, m] = d.split("-");
    return `${m}/${y}`;
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mensalidades</h1>
            <p className="mt-1 text-muted-foreground">
              Registre os pagamentos recebidos dos alunos.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Registrar pagamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar mensalidade</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Aluno</Label>
                  <Select
                    value={form.user_id}
                    onValueChange={(v) => setForm({ ...form, user_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.full_name || s.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Mês de referência</Label>
                    <Input
                      type="month"
                      required
                      value={form.reference_month}
                      onChange={(e) => setForm({ ...form, reference_month: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Forma de pagamento</Label>
                  <Select
                    value={form.payment_method}
                    onValueChange={(v) => setForm({ ...form, payment_method: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={busy || !form.user_id}>
                    {busy ? "Salvando..." : "Registrar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Aluno</th>
                <th className="px-4 py-3 font-medium">Mês ref.</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Método</th>
                <th className="px-4 py-3 font-medium">Pago em</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhum pagamento registrado.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const s = studentMap.get(p.user_id);
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-3 font-medium">
                        {s?.full_name || s?.email || "Aluno removido"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatMonth(p.reference_month)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        R$ {Number(p.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">
                        {p.payment_method}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(p.paid_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
