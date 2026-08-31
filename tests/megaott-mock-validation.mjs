/*
 * MegaOTT integration contract checks. Run with:
 *   MEGAOTT_MOCK_MODE=true MEGAOTT_DEFAULT_PACKAGE_ID=4 bun tests/megaott-mock-validation.mjs
 *
 * This script never contacts MegaOTT and never needs a bearer token.
 */
import assert from "node:assert/strict";
import {
  megaottConnector,
  pingMegaott,
} from "../src/integration-hub/connectors/iptv/megaott.adapter.ts";
import { apiGateway } from "../src/integration-hub/gateway/api-gateway.ts";

const originalFetch = globalThis.fetch;
const originalMock = process.env.MEGAOTT_MOCK_MODE;
const originalPackage = process.env.MEGAOTT_DEFAULT_PACKAGE_ID;
process.env.MEGAOTT_MOCK_MODE = "true";
process.env.MEGAOTT_DEFAULT_PACKAGE_ID = "4";

try {
  const health = await pingMegaott();
  assert.equal(health.ok, true);
  assert.equal(health.value.authenticated, true);
  assert.equal(health.value.responseValid, true);

  const created = await megaottConnector.createUser({
    username: "mock_validation_user",
    packageId: "4",
  });
  assert.equal(created.ok, true);
  assert.equal(created.value.status, "active");
  assert.ok(created.value.providerUserId);
  assert.ok(created.value.password);

  const read = await megaottConnector.getUser(created.value.providerUserId);
  assert.equal(read.ok, true);
  assert.equal(read.value.providerUserId, created.value.providerUserId);
  const extended = await megaottConnector.extend(
    created.value.providerUserId,
    new Date().toISOString(),
  );
  assert.equal(extended.ok, true);
  assert.ok(extended.value.expiresAt);
  assert.equal((await megaottConnector.suspendUser(created.value.providerUserId)).ok, true);
  assert.equal((await megaottConnector.reactivateUser(created.value.providerUserId)).ok, true);

  async function gatewayScenario(statuses) {
    let calls = 0;
    globalThis.fetch = async () => {
      const status = statuses[Math.min(calls++, statuses.length - 1)];
      return new Response(JSON.stringify({ message: `mock-${status}` }), {
        status,
        headers: { "content-type": "application/json" },
      });
    };
    return {
      result: await apiGateway.request({
        connectorId: "iptv.megaott",
        url: "https://mock.invalid",
        method: "GET",
        maxAttempts: 3,
        backoffMs: 1,
      }),
      calls,
    };
  }

  const retry429 = await gatewayScenario([429, 429, 200]);
  assert.equal(retry429.result.ok, true);
  assert.equal(retry429.calls, 3);
  const retry5xx = await gatewayScenario([503, 503, 200]);
  assert.equal(retry5xx.result.ok, true);
  assert.equal(retry5xx.calls, 3);
  const noRetry401 = await gatewayScenario([401, 200]);
  assert.equal(noRetry401.result.ok, false);
  assert.equal(noRetry401.calls, 1);
  const noRetry403 = await gatewayScenario([403, 200]);
  assert.equal(noRetry403.result.ok, false);
  assert.equal(noRetry403.calls, 1);

  let timeoutCalls = 0;
  globalThis.fetch = async (_url, init) => {
    timeoutCalls++;
    await new Promise((_, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
        return;
      }
      signal?.addEventListener(
        "abort",
        () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        },
        { once: true },
      );
    });
  };
  const timeout = await apiGateway.request({
    connectorId: "iptv.megaott",
    url: "https://mock.invalid",
    method: "GET",
    maxAttempts: 3,
    timeoutMs: 2,
    backoffMs: 1,
  });
  assert.equal(timeout.ok, false);
  assert.equal(timeout.error.kind, "timeout");
  assert.equal(timeoutCalls, 3);

  console.log(
    JSON.stringify({
      health: "pass",
      create: "pass",
      read: "pass",
      extend: "pass",
      lifecycle: "pass",
      retry_429: "pass",
      retry_5xx: "pass",
      unauthorized_no_loop: "pass",
      forbidden_no_loop: "pass",
      timeout_bounded: "pass",
      network_calls_to_megaott: 0,
    }),
  );
} finally {
  globalThis.fetch = originalFetch;
  if (originalMock === undefined) delete process.env.MEGAOTT_MOCK_MODE;
  else process.env.MEGAOTT_MOCK_MODE = originalMock;
  if (originalPackage === undefined) delete process.env.MEGAOTT_DEFAULT_PACKAGE_ID;
  else process.env.MEGAOTT_DEFAULT_PACKAGE_ID = originalPackage;
}
