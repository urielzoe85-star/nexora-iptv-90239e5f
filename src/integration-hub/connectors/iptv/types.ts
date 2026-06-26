import type { Connector } from "../../core/connector";
import type { IntegrationError } from "../../core/errors";
import type { Result } from "../../core/result";

export interface IPTVCreateUserInput {
  username: string;
  password?: string;
  packageId: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}
export interface IPTVUser {
  providerUserId: string;
  username: string;
  status: "active" | "suspended" | "expired";
  expiresAt?: string | null;
  m3uUrl?: string | null;
}

export interface IPTVConnector extends Connector {
  readonly type: "iptv";
  createUser(input: IPTVCreateUserInput): Promise<Result<IPTVUser, IntegrationError>>;
  suspendUser(providerUserId: string): Promise<Result<IPTVUser, IntegrationError>>;
  reactivateUser(providerUserId: string): Promise<Result<IPTVUser, IntegrationError>>;
  extend(providerUserId: string, expiresAt: string): Promise<Result<IPTVUser, IntegrationError>>;
  getUser(providerUserId: string): Promise<Result<IPTVUser, IntegrationError>>;
}