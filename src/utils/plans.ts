import type { FulfillmentMethod, Plan } from "@/types/api";

/** Brand names, so not translated. Stripe is how card payments are taken. */
export const CHANNEL_LABELS: Record<FulfillmentMethod, string> = {
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
  STRIPE: "Stripe",
  MERCADOPAGO: "MercadoPago",
  ZELLE: "Zelle",
};

/**
 * Plan.features is free-form marketing copy, and the limits and channels it
 * used to spell out drifted from what the plan actually enforces (a plan
 * including Zelle never mentioned it). The pricing cards now build those lines
 * from the real fields, so any copy that talks about them is dropped and only
 * the rest ("Priority support") is kept.
 */
const COVERED_BY_REAL_FIELDS =
  /\b(stores?|tiendas?|products?|productos?|checkout|payments?|pagos?)\b|whatsapp|telegram|stripe|mercado\s?pago|zelle/i;

export function extraPlanFeatures(plan: Pick<Plan, "features">): string[] {
  return plan.features.filter(
    (feature) => !COVERED_BY_REAL_FIELDS.test(feature),
  );
}
