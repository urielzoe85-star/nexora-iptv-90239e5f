import type { Connector } from "../../core/connector";
import type { IntegrationError } from "../../core/errors";
import type { Result } from "../../core/result";

export interface StoragePutInput {
  bucket: string;
  key: string;
  body: Uint8Array | string;
  contentType?: string;
  metadata?: Record<string, string>;
}
export interface StoragePutResult { url: string }

export interface StorageConnector extends Connector {
  readonly type: "storage";
  put(input: StoragePutInput): Promise<Result<StoragePutResult, IntegrationError>>;
  signedUrl(bucket: string, key: string, expiresInSec?: number): Promise<Result<string, IntegrationError>>;
}