import { z } from "zod";
export const itemSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  price: z.number(),
  allergens: z.array(z.string()),
  spice: z.number(),
  image: z.string(),
  available: z.boolean(),
});
export type MenuItem = z.infer<typeof itemSchema>;
const orderItem = z.object({
  id: z.number(),
  name: z.string(),
  size: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
});
export const orderSchema = z.object({
  id: z.number(),
  table_session_id: z.string(),
  status: z.enum(["new", "preparing", "ready", "served"]),
  total: z.number(),
  subtotal: z.number(),
  tax: z.number(),
  notes: z.string().nullable(),
  created_at: z.string(),
  table: z.string().optional(),
  items: z.array(orderItem),
});
export type Order = z.infer<typeof orderSchema>;
export const billSchema = z.object({
  total: z.number(),
  paid: z.number(),
  pending: z.number(),
  remaining: z.number(),
});
export const callSchema = z.object({
  id: z.number(),
  table_session_id: z.string(),
  kind: z.string(),
  created_at: z.string(),
});
export const paymentSchema = z.object({
  id: z.number(),
  table_session_id: z.string(),
  amount: z.number(),
  tip: z.number(),
  method: z.string(),
  status: z.string(),
});
export const reviewSchema = z.object({
  id: z.number(),
  rating: z.number(),
  comment: z.string().nullable(),
});
export const tableSchema = z.object({
  id: z.number(),
  name: z.string(),
  zone: z.string(),
  seats: z.number(),
  qr_token: z.string(),
  session_id: z.string().nullable(),
  bill: billSchema.nullable(),
  calls: z.array(callSchema),
  orders: z.array(orderSchema.omit({ table: true })),
});
export type DiningTable = z.infer<typeof tableSchema>;
export const staffSchema = z.object({
  restaurant: z.string(),
  currency: z.string(),
  tables: z.array(tableSchema),
  orders: z.array(orderSchema),
  calls: z.array(callSchema),
  payments: z.array(paymentSchema),
  menu: z.array(itemSchema),
  reviews: z.array(reviewSchema),
  stats: z.object({
    revenue: z.number(),
    tips: z.number(),
    orders: z.number(),
    rating: z.number(),
  }),
});
export type StaffState = z.infer<typeof staffSchema>;
export const menuSchema = z.object({
  restaurant: z.string(),
  currency: z.string(),
  tax_percent: z.number(),
  table: z.object({
    id: z.number(),
    name: z.string(),
    zone: z.string(),
    seats: z.number(),
  }),
  items: z.array(itemSchema),
});
export const guestSchema = z.object({
  orders: z.array(orderSchema),
  bill: billSchema,
  payments: z.array(paymentSchema),
  calls: z.array(callSchema),
  review: reviewSchema.nullable(),
  wifi: z.object({ name: z.string(), password: z.string() }),
  bank_instructions: z.string(),
});
export type GuestState = z.infer<typeof guestSchema>;
export const credentialSchema = z.object({
  session_id: z.string(),
  token: z.string(),
});
export type Credential = z.infer<typeof credentialSchema>;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export type ApiOptions = {
  method?: string;
  body?: unknown;
  staff?: string;
  guest?: string;
  signal?: AbortSignal;
};
export async function api(
  path: string,
  options: ApiOptions = {},
): Promise<unknown> {
  const response = await fetch(`/api${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.staff ? { Authorization: `Bearer ${options.staff}` } : {}),
      ...(options.guest ? { "X-Guest-Token": options.guest } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    cache: "no-store",
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = z.object({ message: z.string().optional() }).safeParse(data);
    throw new ApiError(
      parsed.success
        ? parsed.data.message || "Request failed."
        : "The server could not respond. Please try again.",
      response.status,
    );
  }
  return data;
}
export const money = (cents: number, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(
    cents / 100,
  );
export function age(date: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(date)) / 60000),
  );
  return minutes < 1 ? "Just now" : `${minutes} min ago`;
}
