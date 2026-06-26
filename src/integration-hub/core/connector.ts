// Common contract every connector implements. Concrete connectors extend
// this with their own domain methods (charge, sendMessage, createUser…).

export type ConnectorType =
  | "payment"
  | "iptv"
  | "messaging"
  | "email"
  | "ai"
  | "storage"
  | "analytics"
  | "webhook";

export type ConnectorStatus = "enabled" | "stub" | "disabled";

export interface ConnectorDescriptor {
  /** Stable unique id, e.g. "payment.sebpay". */
  readonly id: string;
  readonly type: ConnectorType;
  /** Human-friendly label for admin UIs. */
  readonly label: string;
  /** `enabled` = wired and live. `stub` = interface only. `disabled` = registered but off. */
  readonly status: ConnectorStatus;
  /** Optional provider-side capabilities (e.g. ["charge","refund"]). */
  readonly capabilities?: readonly string[];
}

export interface Connector extends ConnectorDescriptor {
  /** Lightweight readiness check. Must NOT contact the provider. */
  isReady(): boolean;
}