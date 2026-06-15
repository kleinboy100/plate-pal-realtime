// Limited-time promo: 10% off selected meals until 18 June 2026
export const PROMO_DISCOUNT = 0.1; // 10%
export const PROMO_END = new Date("2026-06-18T23:59:59+02:00");
export const PROMO_LABEL = "10% OFF";
export const PROMO_DEADLINE_TEXT = "Until 18 June 2026";

// Meals included in the promo (by menu item id)
export const PROMO_MEAL_IDS: string[] = [
  "23a48a68-14b2-47db-9b35-42d18ff4202e", // La Hof
  "0fcd845a-0736-4dca-adfb-84ac24f7de37", // Di_Y_Kota
];

export function isPromoActive(now: Date = new Date()): boolean {
  return now <= PROMO_END;
}

export function isPromoItem(id: string | null | undefined): boolean {
  return !!id && PROMO_MEAL_IDS.includes(id);
}

export function isPromoApplicable(id: string | null | undefined, now: Date = new Date()): boolean {
  return isPromoItem(id) && isPromoActive(now);
}

// Returns the price to charge (discounted when promo applies, otherwise original)
export function getEffectivePrice(id: string | null | undefined, price: number): number {
  if (!isPromoApplicable(id)) return price;
  return Math.round(price * (1 - PROMO_DISCOUNT) * 100) / 100;
}
