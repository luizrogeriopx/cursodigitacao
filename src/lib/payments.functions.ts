import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY não configurada no servidor");
    }

    // Importa o Stripe dinamicamente apenas no servidor para evitar quebrar o cliente
    const StripeModule = await import("stripe");
    const Stripe = StripeModule.default;
    const stripe = new Stripe(stripeSecretKey);

    const appUrl = process.env.APP_URL || "http://localhost:8080";

    try {
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: "Curso de Digitação Completo",
                description: "Acesso completo e vitalício ao curso de digitação, lições estruturadas e histórico de progresso.",
              },
              unit_amount: 4700, // R$ 47,00 em centavos (4700)
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${appUrl}/dashboard?payment_success=true`,
        cancel_url: `${appUrl}/`,
        metadata: {
          userId: context.userId,
        },
      });

      if (!session.url) {
        throw new Error("URL de checkout não gerada pelo Stripe");
      }

      return { url: session.url };
    } catch (error: any) {
      console.error("Erro ao criar sessão de checkout do Stripe:", error);
      throw new Error(`Erro ao gerar link de pagamento: ${error.message}`);
    }
  });
