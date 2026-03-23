import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLockrServerWebhookToken,
  buildServerPremiumPatchFromLockrEvent,
  normalizeLockrEventType,
  verifyLockrServerWebhookToken,
} from "./lockr-webhook";

test("normalizes supported Lockr event names", () => {
  assert.equal(normalizeLockrEventType({ type: "trial.started" }), "trial.started");
  assert.equal(normalizeLockrEventType({ event: "subscription.started" }), "subscription.started");
  assert.equal(normalizeLockrEventType({ data: { type: "subscription.canceled" } }), "subscription.cancelled");
  assert.equal(normalizeLockrEventType({ type: "invoice.paid" }), null);
});

test("builds and verifies per-server webhook tokens", () => {
  const secret = "test-secret";
  const token = buildLockrServerWebhookToken(1, secret);

  assert.equal(verifyLockrServerWebhookToken(1, token, secret), true);
  assert.equal(verifyLockrServerWebhookToken(2, token, secret), false);
  assert.equal(verifyLockrServerWebhookToken(1, "wrong-token", secret), false);
});

test("builds active premium state from started events", () => {
  const patch = buildServerPremiumPatchFromLockrEvent("subscription.started", {
    createdAt: "2026-03-22T12:00:00.000Z",
    subscription: { id: "sub_123" },
    customer: { id: "cus_123" },
  });

  assert.equal(patch.serverPremiumEnabled, true);
  assert.equal(patch.serverPremiumStatus, "active");
  assert.equal(patch.serverPremiumProvider, "lockr");
  assert.equal(patch.serverPremiumLastEvent, "subscription.started");
});

test("builds cancelled premium state from cancellation events", () => {
  const patch = buildServerPremiumPatchFromLockrEvent("subscription.cancelled", {
    occurredAt: "2026-03-22T12:05:00.000Z",
  });

  assert.equal(patch.serverPremiumEnabled, false);
  assert.equal(patch.serverPremiumStatus, "cancelled");
  assert.equal(patch.serverPremiumProvider, "lockr");
  assert.equal(patch.serverPremiumExpiresAt?.toISOString(), "2026-03-22T12:05:00.000Z");
});
