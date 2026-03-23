import crypto from "crypto";

export const LOCKR_SUPPORTED_EVENTS = [
  "trial.started",
  "subscription.started",
  "subscription.cancelled",
] as const;

export type LockrSupportedEvent = typeof LOCKR_SUPPORTED_EVENTS[number];

function readNestedValue(payload: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return null;
    return (current as Record<string, unknown>)[segment];
  }, payload);
}

function readStringCandidate(payload: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    const value = readNestedValue(payload, path);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function readDateCandidate(payload: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    const value = readNestedValue(payload, path);
    if (!value) continue;
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function toSafeTokenBuffer(value: string) {
  return Buffer.from(value.trim(), "utf8");
}

export function getLockrWebhookSecret() {
  return process.env.LOCKR_WEBHOOK_SECRET?.trim() || process.env.SESSION_SECRET?.trim() || null;
}

export function buildLockrServerWebhookToken(serverId: number, secret: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(`lockr:server:${serverId}`)
    .digest("hex");
}

export function verifyLockrServerWebhookToken(serverId: number, providedToken: string, secret: string) {
  const expected = toSafeTokenBuffer(buildLockrServerWebhookToken(serverId, secret));
  const actual = toSafeTokenBuffer(providedToken || "");
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function normalizeLockrEventType(payload: unknown): LockrSupportedEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = readStringCandidate(payload as Record<string, unknown>, [
    "type",
    "event",
    "name",
    "eventType",
    "data.type",
    "data.event",
    "data.name",
  ]);
  if (!candidate) return null;

  const normalized = candidate.trim().toLowerCase();
  if (normalized === "subscription.canceled") return "subscription.cancelled";
  return LOCKR_SUPPORTED_EVENTS.includes(normalized as LockrSupportedEvent)
    ? normalized as LockrSupportedEvent
    : null;
}

export function summarizeLockrPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return {};
  const record = payload as Record<string, unknown>;
  const metadata = readNestedValue(record, "metadata");
  const dataMetadata = readNestedValue(record, "data.metadata");
  return {
    customerId: readStringCandidate(record, [
      "customerId",
      "customer.id",
      "data.customerId",
      "data.customer.id",
      "userId",
      "data.userId",
    ]),
    subscriptionId: readStringCandidate(record, [
      "subscriptionId",
      "subscription.id",
      "data.subscriptionId",
      "data.subscription.id",
      "id",
      "data.id",
    ]),
    metadata: typeof metadata === "object" && metadata ? metadata : typeof dataMetadata === "object" && dataMetadata ? dataMetadata : {},
  };
}

export function buildServerPremiumPatchFromLockrEvent(eventType: LockrSupportedEvent, payload: unknown) {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const eventAt = readDateCandidate(record, [
    "createdAt",
    "occurredAt",
    "timestamp",
    "data.createdAt",
    "data.occurredAt",
    "data.timestamp",
    "trial.startedAt",
    "subscription.startedAt",
    "data.trial.startedAt",
    "data.subscription.startedAt",
  ]) || new Date();
  const expiresAt = readDateCandidate(record, [
    "expiresAt",
    "endsAt",
    "trialEndsAt",
    "subscriptionEndsAt",
    "data.expiresAt",
    "data.endsAt",
    "data.trialEndsAt",
    "data.subscriptionEndsAt",
  ]);
  const summary = summarizeLockrPayload(record);

  if (eventType === "subscription.cancelled") {
    return {
      serverPremiumEnabled: false,
      serverPremiumStatus: "cancelled",
      serverPremiumProvider: "lockr",
      serverPremiumExpiresAt: eventAt,
      serverPremiumLastEvent: eventType,
      serverPremiumLastWebhookAt: new Date(),
      serverPremiumMetadata: {
        ...summary,
        lastEventAt: eventAt.toISOString(),
      },
    };
  }

  return {
    serverPremiumEnabled: true,
    serverPremiumStatus: eventType === "trial.started" ? "trialing" : "active",
    serverPremiumProvider: "lockr",
    serverPremiumSince: eventAt,
    serverPremiumExpiresAt: expiresAt,
    serverPremiumLastEvent: eventType,
    serverPremiumLastWebhookAt: new Date(),
    serverPremiumMetadata: {
      ...summary,
      lastEventAt: eventAt.toISOString(),
    },
  };
}

