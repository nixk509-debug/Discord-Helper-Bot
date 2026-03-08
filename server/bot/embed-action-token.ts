import { createHmac, timingSafeEqual } from "crypto";
import type { InteractiveActionConfig, InteractiveReplyMode } from "@shared/schema";

type ActionKind = "ra" | "rr" | "rt" | "rc" | "ru";
type ReplyModeFlag = "e" | "c";

interface CompactTokenPayload {
  v: 1;
  s: number;
  g: string;
  e: number;
  k: ActionKind;
  r?: string;
  c?: string;
  a?: string;
  u?: string;
  m?: ReplyModeFlag;
  x: number;
}

export interface DecodedEmbedActionToken {
  serverId: number;
  guildId: string;
  embedId: number;
  action: InteractiveActionConfig;
}

export const EMBED_ACTION_TOKEN_PREFIX = "ax:";

const TOKEN_MAX_LENGTH = 97;
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30;

function getSigningSecret() {
  return (
    process.env.EMBED_ACTION_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.DISCORD_CLIENT_SECRET ||
    "archivist-dev-embed-action-secret"
  );
}

function toKind(type: InteractiveActionConfig["type"]): ActionKind {
  if (type === "role_add") return "ra";
  if (type === "role_remove") return "rr";
  if (type === "role_toggle") return "rt";
  if (type === "open_url") return "ru";
  return "rc";
}

function fromKind(kind: ActionKind): InteractiveActionConfig["type"] {
  if (kind === "ra") return "role_add";
  if (kind === "rr") return "role_remove";
  if (kind === "rt") return "role_toggle";
  if (kind === "ru") return "open_url";
  return "run_command";
}

function toReplyModeFlag(mode?: InteractiveReplyMode): ReplyModeFlag | undefined {
  if (mode === "channel") return "c";
  if (mode === "ephemeral") return "e";
  return undefined;
}

function fromReplyModeFlag(flag?: ReplyModeFlag): InteractiveReplyMode | undefined {
  if (flag === "c") return "channel";
  if (flag === "e") return "ephemeral";
  return undefined;
}

function sign(body: string) {
  return createHmac("sha256", getSigningSecret()).update(body).digest("base64url").slice(0, 16);
}

export function encodeEmbedActionToken(input: {
  serverId: number;
  guildId: string;
  embedId: number;
  action: InteractiveActionConfig;
  ttlSeconds?: number;
}): string | null {
  const { serverId, guildId, embedId, action } = input;

  // URL actions need a shorter representation to stay within Discord's 100-char custom_id/value limit.
  if (action.type === "open_url") {
    const url = String(action.url || "").trim();
    if (!/^https?:\/\//i.test(url)) return null;
    const mode = toReplyModeFlag(action.replyMode) || "c";
    const serverPart = Math.max(1, serverId).toString(36);
    const body = `ou:${serverPart}:${mode}:${url}`;
    const signature = sign(body).slice(0, 12);
    const token = `ou:${serverPart}:${mode}:${signature}:${url}`;
    return token.length <= TOKEN_MAX_LENGTH ? token : null;
  }

  const compact: CompactTokenPayload = {
    v: 1,
    s: serverId,
    g: guildId,
    e: embedId,
    k: toKind(action.type),
    x: Math.floor(Date.now() / 1000) + Math.max(60, input.ttlSeconds ?? DEFAULT_TTL_SECONDS),
  };

  const replyMode = toReplyModeFlag(action.replyMode);
  if (replyMode) compact.m = replyMode;

  if (compact.k === "ra" || compact.k === "rr" || compact.k === "rt") {
    const roleId = String(action.roleId || "").trim();
    if (!roleId) return null;
    compact.r = roleId;
  }

  if (compact.k === "rc") {
    const commandName = String(action.commandName || "").trim().toLowerCase();
    if (!commandName) return null;
    compact.c = commandName.slice(0, 32);
    if (action.commandArgs) {
      compact.a = String(action.commandArgs).trim().slice(0, 48);
    }
  }

  if (compact.k === "ru") {
    const url = String(action.url || "").trim();
    if (!/^https?:\/\//i.test(url)) return null;
    compact.u = url.slice(0, 120);
  }

  const body = Buffer.from(JSON.stringify(compact), "utf8").toString("base64url");
  const signature = sign(body);
  const token = `${body}.${signature}`;
  return token.length <= TOKEN_MAX_LENGTH ? token : null;
}

export function decodeEmbedActionToken(rawToken: string): DecodedEmbedActionToken | null {
  const token = rawToken.startsWith(EMBED_ACTION_TOKEN_PREFIX)
    ? rawToken.slice(EMBED_ACTION_TOKEN_PREFIX.length)
    : rawToken;

  if (token.startsWith("ou:")) {
    const parts = token.split(":");
    if (parts.length < 5) return null;

    const serverPart = parts[1];
    const replyMode = parts[2] as ReplyModeFlag;
    const signature = parts[3];
    const url = parts.slice(4).join(":");

    const body = `ou:${serverPart}:${replyMode}:${url}`;
    const expected = sign(body).slice(0, 12);

    try {
      if (
        signature.length !== expected.length ||
        !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
      ) {
        return null;
      }
    } catch {
      return null;
    }

    const serverId = Number.parseInt(serverPart, 36);
    if (!Number.isFinite(serverId) || serverId <= 0) return null;
    if (!/^https?:\/\//i.test(url)) return null;

    return {
      serverId,
      guildId: "",
      embedId: 0,
      action: {
        type: "open_url",
        url,
        replyMode: fromReplyModeFlag(replyMode),
      },
    };
  }

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, signature] = parts;
  const expected = sign(body);

  try {
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  let payload: CompactTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CompactTokenPayload;
  } catch {
    return null;
  }

  if (payload?.v !== 1) return null;
  if (!payload?.s || !payload?.g || !payload?.e || !payload?.k || !payload?.x) return null;
  if (payload.x < Math.floor(Date.now() / 1000)) return null;

  const actionType = fromKind(payload.k);
  const action: InteractiveActionConfig = {
    type: actionType,
    replyMode: fromReplyModeFlag(payload.m),
  };

  if (actionType === "role_add" || actionType === "role_remove" || actionType === "role_toggle") {
    if (!payload.r) return null;
    action.roleId = payload.r;
  }

  if (actionType === "run_command") {
    if (!payload.c) return null;
    action.commandName = payload.c;
    if (payload.a) action.commandArgs = payload.a;
  }

  if (actionType === "open_url") {
    if (!payload.u) return null;
    action.url = payload.u;
  }

  return {
    serverId: payload.s,
    guildId: payload.g,
    embedId: payload.e,
    action,
  };
}
