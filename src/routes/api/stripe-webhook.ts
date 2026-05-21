import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!stripeSecretKey || !webhookSecret) {
          console.error("Configurações do Stripe ausentes no servidor.");
          return new Response("Server configuration error", { status: 500 });
        }

        const stripe = new Stripe(stripeSecretKey);
        const signature = request.headers.get("stripe-signature");

        if (!signature) {
          return new Response("Missing signature", { status: 400 });
        }

        let event: Stripe.Event;

        try {
          const rawBody = await request.text();
          event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        } catch (err: any) {
          console.error(`Erro ao validar assinatura do Webhook: ${err.message}`);
          return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        console.log(`Evento do Stripe recebido: ${event.type}`);

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const amount = session.amount_total ? session.amount_total / 100 : 47.0;

          if (!userId) {
            console.error("Nenhum userId encontrado nos metadados da sessão de checkout.");
            return new Response("No user metadata found", { status: 400 });
          }

          try {
            // 1. Registrar o pagamento no banco de dados
            const { error: paymentError } = await supabaseAdmin.from("payments").insert({
              user_id: userId,
              amount: amount,
              payment_method: "stripe",
              reference_month: new Date().toISOString().slice(0, 7), // Formato YYYY-MM
              notes: `Pago via Stripe (Session: ${session.id})`,
              paid_at: new Date().toISOString(),
            });

            if (paymentError) {
              console.error("Erro ao inserir pagamento no banco:", paymentError);
              return new Response("Database error inserting payment", { status: 500 });
            }

            console.log(`Pagamento registrado no banco para o usuário: ${userId}`);

            // 2. Conceder permissão de estudante ao usuário
            const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
              user_id: userId,
              role: "student",
            });

            if (roleError) {
              // Ignorar se a role de student já estiver registrada
              if (!roleError.message.includes("duplicate key")) {
                console.error("Erro ao atribuir permissão de aluno:", roleError);
                return new Response("Database error setting role", { status: 500 });
              }
            }

            console.log(`Permissão 'student' garantida para o usuário: ${userId}`);
          } catch (dbErr: any) {
            console.error("Erro de processamento no banco de dados:", dbErr);
            return new Response(`Database Exception: ${dbErr.message}`, { status: 500 });
          }
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
