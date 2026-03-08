import { createHmac, timingSafeEqual } from "crypto";

type StudioTokenKind = "a" | "m";

interface StudioTokenPayload {
  v: 1;
  k: StudioTokenKind;
  p: number;
  n?: string;
  a?: string;
  o?: string;
  m?: string;
  x: number;
}

export interface DecodedStudioActionToken {
  publicationId: number;
  nodeId?: string;
  actionId?: string;
  optionValue?: string;
  modalId?: string;
}

export const STUDIO_ACTION_TOKEN_PREFIX = "sx:";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30;

function getSigningSecret() {
  return (
    process.env.STUDIO_ACTION_SECRET ||
    process.env.EMBED_ACTION_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.DISCORD_CLIENT_SECRET ||
    "archivist-dev-studio-secret"
  );
}

function sign(body: string) {
  return createHmac("sha256", getSigningSecret()).update(body).digest("base64url").slice(0, 16);
}

function encodePayload(payload: StudioTokenPayload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodePayload(token: string): StudioTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  try {
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as StudioTokenPayload;
    if (payload.v !== 1 || payload.x < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function encodeStudioActionToken(input: {
  publicationId: number;
  nodeId: string;
  actionId?: string;
  optionValue?: string;
  ttlSeconds?: number;
}) {
  return `${STUDIO_ACTION_TOKEN_PREFIX}${encodePayload({
    v: 1,
    k: "a",
    p: input.publicationId,
    n: input.nodeId.slice(0, 24),
    a: input.actionId?.slice(0, 24),
    o: input.optionValue?.slice(0, 32),
    x: Math.floor(Date.now() / 1000) + Math.max(60, input.ttlSeconds ?? DEFAULT_TTL_SECONDS),
  })}`;
}

export function encodeStudioModalToken(input: {
  publicationId: number;
  modalId: string;
  actionId?: string;
  ttlSeconds?: number;
}) {
  return `${STUDIO_ACTION_TOKEN_PREFIX}${encodePayload({
    v: 1,
    k: "m",
    p: input.publicationId,
    m: input.modalId.slice(0, 24),
    a: input.actionId?.slice(0, 24),
    x: Math.floor(Date.now() / 1000) + Math.max(60, input.ttlSeconds ?? DEFAULT_TTL_SECONDS),
  })}`;
}

export function decodeStudioToken(rawToken: string): DecodedStudioActionToken | null {
  const token = rawToken.startsWith(STUDIO_ACTION_TOKEN_PREFIX)
    ? rawToken.slice(STUDIO_ACTION_TOKEN_PREFIX.length)
    : rawToken;
  const payload = decodePayload(token);
  if (!payload?.p) return null;

  return {
    publicationId: payload.p,
    nodeId: payload.n,
    actionId: payload.a,
    optionValue: payload.o,
    modalId: payload.m,
  };
}
