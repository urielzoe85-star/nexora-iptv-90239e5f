// Public entry point for the Integration Hub. Importing this file is
// enough to register the default connector set exactly once. Business
// modules should import from this barrel (or from a specific connector
// type), never from a concrete adapter file.

import { connectorRegistry } from "./core/registry";

import { sebpayConnector } from "./connectors/payment/sebpay.adapter";
import {
  stripeConnector, paypalConnector, orangeMoneyConnector, mtnMomoConnector, cryptoConnector,
} from "./connectors/payment/stub.adapter";

import { megaottConnector } from "./connectors/iptv/megaott.adapter";
import { xtreamUiConnector, xtreamCodesConnector } from "./connectors/iptv/stub.adapter";
import {
  whatsappBusinessConnector, telegramBotConnector, smsConnector, inAppConnector,
} from "./connectors/messaging/stub.adapter";
import { transactionalEmailConnector } from "./connectors/email/stub.adapter";
import { lovableAiConnector } from "./connectors/ai/stub.adapter";
import { storageConnector } from "./connectors/storage/stub.adapter";
import { analyticsConnector } from "./connectors/analytics/stub.adapter";
import { outboundWebhookConnector } from "./connectors/webhook/outbound.adapter";

let bootstrapped = false;

function registerDefaultConnectors() {
  if (bootstrapped) return;
  bootstrapped = true;

  // Payment: SebPay is the first official provider (wrapper of the
  // existing implementation). Others are stubs.
  connectorRegistry.register(sebpayConnector);
  connectorRegistry.register(stripeConnector);
  connectorRegistry.register(paypalConnector);
  connectorRegistry.register(orangeMoneyConnector);
  connectorRegistry.register(mtnMomoConnector);
  connectorRegistry.register(cryptoConnector);

  // IPTV (interfaces only)
  connectorRegistry.register(megaottConnector);
  connectorRegistry.register(xtreamUiConnector);
  connectorRegistry.register(xtreamCodesConnector);

  // Messaging (interfaces only)
  connectorRegistry.register(whatsappBusinessConnector);
  connectorRegistry.register(telegramBotConnector);
  connectorRegistry.register(smsConnector);
  connectorRegistry.register(inAppConnector);

  // Email / AI / Storage / Analytics (stubs)
  connectorRegistry.register(transactionalEmailConnector);
  connectorRegistry.register(lovableAiConnector);
  connectorRegistry.register(storageConnector);
  connectorRegistry.register(analyticsConnector);

  // Outbound webhooks (enabled — uses the API gateway, no provider secret)
  connectorRegistry.register(outboundWebhookConnector);
}

registerDefaultConnectors();

// Re-exports for ergonomic imports.
export { connectorRegistry } from "./core/registry";
export { apiGateway } from "./gateway/api-gateway";
export { secretsManager } from "./core/secrets";
export { logger } from "./core/logger";
export { metrics } from "./core/monitoring";
export { queue } from "./queue/queue";
export { webhookEngine } from "./webhooks/engine";
export type { Connector, ConnectorType, ConnectorStatus, ConnectorDescriptor } from "./core/connector";
export type { IntegrationError, IntegrationErrorKind } from "./core/errors";
export type { Result } from "./core/result";
export type { PaymentConnector } from "./connectors/payment/types";
export type { IPTVConnector } from "./connectors/iptv/types";
export type { MessagingConnector, MessagingChannel } from "./connectors/messaging/types";
export type { EmailConnector } from "./connectors/email/types";
export type { AIConnector } from "./connectors/ai/types";
export type { StorageConnector } from "./connectors/storage/types";
export type { AnalyticsConnector } from "./connectors/analytics/types";
export type { WebhookConnector } from "./connectors/webhook/types";