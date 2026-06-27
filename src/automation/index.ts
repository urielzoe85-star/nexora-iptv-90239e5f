// Point d'entrée du moteur d'automatisation. Importer ce fichier suffit
// à enregistrer tous les workflows par défaut. Les modules métier
// doivent utiliser `automationApi` exclusivement.

import { workflowRegistry } from "./core/registry";
import { orderCreatedWorkflow } from "./workflows/order-created.workflow";
import { paymentConfirmedWorkflow } from "./workflows/payment-confirmed.workflow";
import { paymentFailedWorkflow } from "./workflows/payment-failed.workflow";
import { subscriptionRenewalWorkflow } from "./workflows/subscription-renewal.workflow";
import { subscriptionActivateWorkflow } from "./workflows/subscription-activate.workflow";
import { subscriptionSuspendWorkflow } from "./workflows/subscription-suspend.workflow";

let bootstrapped = false;

export function bootstrapAutomation() {
  if (bootstrapped) return;
  bootstrapped = true;
  workflowRegistry.register(orderCreatedWorkflow);
  workflowRegistry.register(paymentConfirmedWorkflow);
  workflowRegistry.register(paymentFailedWorkflow);
  workflowRegistry.register(subscriptionRenewalWorkflow);
  workflowRegistry.register(subscriptionActivateWorkflow);
  workflowRegistry.register(subscriptionSuspendWorkflow);
}

bootstrapAutomation();

export { automationApi } from "./core/api";
export { workflowRegistry } from "./core/registry";
export { BUSINESS_EVENTS } from "./core/events";
export type { BusinessEvent } from "./core/events";
export type { WorkflowDefinition, WorkflowContext } from "./core/workflow";