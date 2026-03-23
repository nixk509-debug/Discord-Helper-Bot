import { storage } from "./storage";

function coerceDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isEntitlementActive(enabled: unknown, expiresAt: unknown) {
  if (!enabled) return false;
  const parsedExpiry = coerceDate(expiresAt);
  if (!parsedExpiry) return true;
  return parsedExpiry.getTime() > Date.now();
}

export async function isPremiumEnabledForServer(serverId: number) {
  const server = await storage.getServer(serverId);
  if (!server) return false;

  const ownerIds = (process.env.OWNER_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const ownerOverride = server.ownerId ? ownerIds.includes(server.ownerId) : false;
  if (ownerOverride) return true;

  const settings = (server.settings ?? {}) as Record<string, unknown>;
  const serverPremiumActive = isEntitlementActive(
    settings.serverPremiumEnabled,
    settings.serverPremiumExpiresAt,
  );
  if (serverPremiumActive) return true;

  const ownerUser = server.ownerId ? await storage.getUserByDiscordId(server.ownerId) : null;
  return isEntitlementActive(ownerUser?.isPremium, ownerUser?.premiumExpiresAt);
}

