// Phase 3 — Domain entities & enums.
// Pure TypeScript: no Supabase import, safe to use from client and server.

export type Id = string;
export type ISO = string; // ISO-8601 timestamp

export type CustomerStatus = "active" | "disabled";
export type ProductCategory = "iptv" | "digital" | "service" | "license" | "subscription";
export type ProductStatus = "active" | "archived";
export type OrderStatus = "pending" | "paid" | "processing" | "completed" | "cancelled" | "refunded";
export type SubscriptionStatus = "pending" | "active" | "suspended" | "expired" | "cancelled";
export type TrialStatus = "active" | "expired" | "converted" | "revoked";
export type NotificationChannel = "email" | "whatsapp" | "telegram" | "sms" | "in_app";
export type NotificationStatus = "queued" | "sent" | "failed";

export const PRODUCT_CATEGORIES: ProductCategory[] = ["iptv", "digital", "service", "license", "subscription"];
export const ORDER_STATUSES: OrderStatus[] = ["pending", "paid", "processing", "completed", "cancelled", "refunded"];
export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ["pending", "active", "suspended", "expired", "cancelled"];
export const TRIAL_STATUSES: TrialStatus[] = ["active", "expired", "converted", "revoked"];
export const NOTIFICATION_CHANNELS: NotificationChannel[] = ["email", "whatsapp", "telegram", "sms", "in_app"];

// Allowed transitions for the order state machine.
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:    ["paid", "cancelled"],
  paid:       ["processing", "refunded", "cancelled"],
  processing: ["completed", "refunded", "cancelled"],
  completed:  ["refunded"],
  cancelled:  [],
  refunded:   [],
};

export interface Customer {
  id: Id;
  email: string;
  full_name: string | null;
  phone: string | null;
  country: string | null;
  status: CustomerStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: ISO;
  updated_at: ISO;
}

export interface Product {
  id: Id;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  category: ProductCategory;
  status: ProductStatus;
  image_url: string | null;
  metadata: Record<string, unknown>;
  created_at: ISO;
  updated_at: ISO;
}

export interface OrderRow {
  id: Id;
  order_ref: string;
  email: string;
  full_name: string | null;
  plan_id: string | null;
  plan_name: string | null;
  amount: number;
  currency: string;
  method: string | null;
  status: OrderStatus;
  customer_id: Id | null;
  sebpay_reference: string | null;
  metadata: Record<string, unknown> | null;
  created_at: ISO;
  updated_at: ISO;
}

export interface Subscription {
  id: Id;
  customer_id: Id;
  product_id: Id | null;
  status: SubscriptionStatus;
  started_at: ISO | null;
  expires_at: ISO | null;
  renewed_at: ISO | null;
  metadata: Record<string, unknown>;
  created_at: ISO;
  updated_at: ISO;
}

export interface Trial {
  id: Id;
  customer_id: Id;
  product_id: Id | null;
  status: TrialStatus;
  expires_at: ISO | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: ISO;
  updated_at: ISO;
}

export interface NotificationRow {
  id: Id;
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  body: string | null;
  status: NotificationStatus;
  payload: Record<string, unknown>;
  error: string | null;
  created_at: ISO;
  sent_at: ISO | null;
}

export interface CustomerEvent {
  id: Id;
  customer_id: Id;
  type: string;
  payload: Record<string, unknown>;
  actor_id: Id | null;
  created_at: ISO;
}

export interface DashboardKpis {
  customers_active: number;
  orders_total: number;
  orders_24h: number;
  revenue_total: number;
  revenue_currency: string;
  products_active: number;
  subscriptions_active: number;
  trials_active: number;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  page_size: number;
}