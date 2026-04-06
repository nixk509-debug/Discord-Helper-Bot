import type { Express } from "express";
import { api } from "@shared/routes";
import type { StudioDocument } from "@shared/schema";
import { buildStudioPublishPlan } from "@shared/studio-publish-plan";
import type { StudioTokenContext } from "@shared/studio-tokens";
import { getBotClient } from "../bot/index";
import { getServerRecord } from "../repositories/server-repository";
import {
  createStudioDocumentRecord,
  createStudioPublicationRecord,
  createStudioPublicationSnapshotRecord,
  getCurrentStudioPublicationSnapshot,
  getStudioDocumentById,
  getStudioPublicationById,
  getStudioPublicationByMessage,
  getStudioPublicationSnapshotById,
  normalizeStudioDocument,
  recordStudioRuntimeEvent,
  updateStudioDocumentRecord,
  updateStudioPublicationRecord,
} from "../studio-service";
import { buildStudioDiscordPayload } from "../studio-discord";

function studioHttpError(statusCode: number, message: string) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

async function resolveStudioGuildChannel(serverId: number, channelId: string) {
  const server = await getServerRecord(serverId);
  if (!server) throw studioHttpError(404, "Server not found");

  const client = getBotClient();
  if (!client?.isReady()) throw studioHttpError(503, "Bot is offline. Start the bot before publishing.");

  const guild = client.guilds.cache.get(server.discordId) ?? await client.guilds.fetch(server.discordId).catch(() => null);
  if (!guild) throw studioHttpError(404, "Bot is not in this Discord server.");

  const channel = await guild.channels.fetch(channelId.trim()).catch(() => null);
  if (!channel || !channel.isTextBased() || channel.isThread()) {
    throw studioHttpError(400, "Selected channel is not a valid text channel.");
  }

  return { server, guild, channel };
}

function buildStudioStaticTokenContext(input: {
  guild: any;
  channel: any;
  messageId?: string | null;
}): StudioTokenContext {
  const now = new Date();
  const channelName = "name" in input.channel ? String(input.channel.name || "") : "";
  const channelId = String(input.channel?.id || "");

  return {
    serverName: String(input.guild?.name || ""),
    serverId: String(input.guild?.id || ""),
    memberCount: Number.isFinite(Number(input.guild?.memberCount)) ? Number(input.guild.memberCount) : undefined,
    channelName,
    channelId,
    channelMention: channelId ? `<#${channelId}>` : channelName,
    messageId: input.messageId || null,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    unix: Math.floor(now.getTime() / 1000),
    randomMode: "runtime",
  };
}

async function buildStudioMemberTokenContext(input: {
  guild: any;
  memberDiscordId?: string;
  channel?: any | null;
  messageId?: string | null;
}): Promise<StudioTokenContext> {
  const now = new Date();
  const member = input.memberDiscordId
    ? await input.guild.members.fetch(input.memberDiscordId).catch(() => null)
    : null;
  const user = member?.user || null;
  const channelName = input.channel && "name" in input.channel ? String(input.channel.name || "") : "";
  const channelId = String(input.channel?.id || "");

  return {
    username: user?.username || member?.displayName || null,
    displayName: member?.displayName || user?.username || null,
    userId: user?.id || null,
    userMention: user?.id ? `<@${user.id}>` : null,
    userAvatar: user?.displayAvatarURL?.() || user?.avatarURL?.() || null,
    serverName: String(input.guild?.name || ""),
    serverId: String(input.guild?.id || ""),
    memberCount: Number.isFinite(Number(input.guild?.memberCount)) ? Number(input.guild.memberCount) : undefined,
    channelName: channelName || (input.channel ? String(input.channel.id || "") : "Direct Message"),
    channelId,
    channelMention: channelId ? `<#${channelId}>` : (channelName || "Direct Message"),
    messageId: input.messageId || null,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    unix: Math.floor(now.getTime() / 1000),
    randomMode: "runtime",
  };
}

async function resolveStudioDocumentForRequest(input: {
  serverId: number;
  actorUserId: number;
  documentId?: number;
  documentInput?: unknown;
  fallbackName: string;
  createIfMissing?: boolean;
}) {
  let documentRecord = input.documentId ? await getStudioDocumentById(input.documentId) : null;
  if (documentRecord && documentRecord.serverId !== input.serverId) {
    throw studioHttpError(404, "Studio document not found for this server.");
  }

  let document: StudioDocument;
  if (documentRecord) {
    document = input.documentInput
      ? normalizeStudioDocument(input.documentInput, documentRecord.name)
      : normalizeStudioDocument(documentRecord.document, documentRecord.name);

    if (input.documentInput) {
      documentRecord = await updateStudioDocumentRecord(documentRecord.id, {
        name: document.meta.name,
        document,
      } as any);
    }
  } else if (input.documentInput && input.createIfMissing) {
    document = normalizeStudioDocument(input.documentInput, input.fallbackName);
    documentRecord = await createStudioDocumentRecord({
      serverId: input.serverId,
      ownerUserId: input.actorUserId,
      scope: "server",
      kind: "surface",
      name: document.meta.name,
      slug: undefined,
      moduleBinding: null,
      document,
    });
  } else if (input.documentInput) {
    document = normalizeStudioDocument(input.documentInput, input.fallbackName);
  } else {
    throw studioHttpError(400, "A Studio documentId or document payload is required.");
  }

  return { documentRecord, document };
}

async function buildStudioPreflight(input: {
  serverId: number;
  actorUserId: number;
  documentId?: number;
  documentInput?: unknown;
  viewId?: string;
}) {
  const resolved = await resolveStudioDocumentForRequest({
    serverId: input.serverId,
    actorUserId: input.actorUserId,
    documentId: input.documentId,
    documentInput: input.documentInput,
    fallbackName: "Untitled Project",
    createIfMissing: false,
  });
  const plan = buildStudioPublishPlan(resolved.document, input.viewId, {
    tokenAvailability: {
      static: true,
      member: false,
      postSend: false,
    },
  });

  return {
    documentId: resolved.documentRecord?.id || input.documentId || null,
    document: resolved.document,
    publishPlan: plan,
    diagnostics: plan.diagnostics,
    normalizedNodes: plan.normalizedNodes,
    debug: plan.debug,
  };
}

export async function publishStudioMessage(input: {
  serverId: number;
  actorUserId: number;
  actorDiscordId?: string;
  documentId?: number;
  documentInput?: unknown;
  allowDowngrade?: boolean;
  target: {
    channelId: string;
    messageId?: string;
    viewId?: string;
  };
}) {
  const resolved = await resolveStudioDocumentForRequest({
    serverId: input.serverId,
    actorUserId: input.actorUserId,
    documentId: input.documentId,
    documentInput: input.documentInput,
    fallbackName: "Untitled Project",
    createIfMissing: true,
  });
  let documentRecord = resolved.documentRecord;
  const document = resolved.document;
  if (!documentRecord) {
    throw studioHttpError(404, "Studio document could not be resolved for publish.");
  }

  const targetChannelId = input.target.channelId.trim();
  const { guild, channel } = await resolveStudioGuildChannel(input.serverId, targetChannelId);
  const plan = buildStudioPublishPlan(document, input.target.viewId, {
    tokenAvailability: {
      static: true,
      member: false,
      postSend: Boolean(input.target.messageId?.trim()),
    },
  });

  if (!plan.payloadReady) {
    throw studioHttpError(400, "Nothing to publish. Add content, embeds, or interactive components.");
  }
  if (plan.mode === "blocked") {
    throw studioHttpError(400, plan.summary);
  }
  if (plan.mode === "downgraded" && !input.allowDowngrade) {
    throw studioHttpError(400, "This page will publish in a simplified form. Review the downgrade details, then confirm with Publish simplified.");
  }

  let publication = input.target.messageId?.trim()
    ? await getStudioPublicationByMessage(input.serverId, targetChannelId, input.target.messageId.trim())
    : null;

  if (!publication) {
    publication = await createStudioPublicationRecord({
      serverId: input.serverId,
      documentId: documentRecord.id,
      channelId: targetChannelId,
      messageId: input.target.messageId?.trim() || "pending",
      currentViewId: plan.viewId,
    });
  }

  const snapshotPayload = {
    documentId: documentRecord.id,
    documentName: documentRecord.name,
    documentVersion: document.version,
    publishedViewId: plan.viewId,
    channelId: targetChannelId,
    guildId: guild.id,
    render: {
      content: plan.liveMessage.content,
      embeds: plan.liveMessage.embeds,
      components: plan.liveMessage.components,
      flags: plan.liveMessage.flags,
      publishPath: plan.publishPath,
    },
    diagnostics: plan.diagnostics,
    publishPlan: plan,
    document,
  };

  const snapshotRecord = await createStudioPublicationSnapshotRecord({
    publicationId: publication.id,
    createdByUserId: input.actorUserId,
    snapshot: snapshotPayload,
  });

  publication = await updateStudioPublicationRecord(publication.id, {
    currentSnapshotId: snapshotRecord.id,
    currentViewId: plan.viewId,
    status: plan.mode === "downgraded" ? "degraded" : "published",
  });

  const payload = buildStudioDiscordPayload(
    plan,
    publication.id,
    buildStudioStaticTokenContext({
      guild,
      channel,
      messageId: input.target.messageId?.trim() || null,
    }),
  );

  try {
    let messageId = input.target.messageId?.trim();
    if (messageId) {
      const existing = await (channel as any).messages.fetch(messageId).catch(() => null);
      if (!existing) throw studioHttpError(404, "Message not found for update.");
      const updated = await existing.edit({
        content: payload.content,
        embeds: payload.embeds,
        components: payload.components,
        files: payload.files,
        flags: payload.flags,
      });
      messageId = updated.id;
    } else {
      const sent = await (channel as any).send({
        content: payload.content,
        embeds: payload.embeds,
        components: payload.components,
        files: payload.files,
        flags: payload.flags,
      });
      messageId = sent.id;
    }

    publication = await updateStudioPublicationRecord(publication.id, {
      messageId,
      channelId: targetChannelId,
      currentSnapshotId: snapshotRecord.id,
      currentViewId: plan.viewId,
      lastPublishedAt: new Date(),
      active: true,
      status: plan.mode === "downgraded" ? "degraded" : "published",
      lastFailureAt: null,
      lastFailureSummary: null,
    } as any);

    await recordStudioRuntimeEvent({
      serverId: input.serverId,
      publicationId: publication.id,
      documentId: documentRecord.id,
      severity: payload.diagnostics.some((diag) => diag.level === "warning") ? "warning" : "info",
      eventType: "publish",
      summary: `Published ${documentRecord.name} to ${targetChannelId}.`,
      details: { diagnostics: payload.diagnostics, viewId: plan.viewId, messageId, debug: plan.debug },
    });

    return {
      publicationId: publication.id,
      messageId,
      channelId: targetChannelId,
      snapshotVersion: snapshotRecord.version,
      diagnostics: payload.diagnostics,
      publishPlan: plan,
    };
  } catch (err: any) {
    await updateStudioPublicationRecord(publication.id, {
      status: "failed",
      lastFailureAt: new Date(),
      lastFailureSummary: err?.message || "Publish failed",
    } as any);
    await recordStudioRuntimeEvent({
      serverId: input.serverId,
      publicationId: publication.id,
      documentId: documentRecord.id,
      severity: "error",
      eventType: "publish_failed",
      summary: err?.message || "Publish failed",
      details: { diagnostics: payload.diagnostics, targetChannelId, debug: plan.debug },
    });
    throw err;
  }
}

async function sendStudioTestMessage(input: {
  serverId: number;
  actorUserId: number;
  actorDiscordId?: string;
  documentId?: number;
  documentInput?: unknown;
  target: {
    kind: "channel" | "dm";
    channelId?: string;
    viewId?: string;
  };
}) {
  const resolved = await resolveStudioDocumentForRequest({
    serverId: input.serverId,
    actorUserId: input.actorUserId,
    documentId: input.documentId,
    documentInput: input.documentInput,
    fallbackName: "Untitled Studio Document",
    createIfMissing: false,
  });
  const document = resolved.document;

  const client = getBotClient();
  if (!client?.isReady()) throw studioHttpError(503, "Bot is offline. Start the bot before sending a test.");

  const server = await getServerRecord(input.serverId);
  if (!server) throw studioHttpError(404, "Server not found");
  const guild = client.guilds.cache.get(server.discordId) ?? await client.guilds.fetch(server.discordId).catch(() => null);
  if (!guild) throw studioHttpError(404, "Bot is not in this Discord server.");

  const plan = buildStudioPublishPlan(document, input.target.viewId, {
    tokenAvailability: {
      static: true,
      member: true,
      postSend: false,
    },
  });

  if (!plan.payloadReady) {
    throw studioHttpError(400, "Nothing to test. Add content, embeds, or interactive components.");
  }
  if (plan.mode === "blocked") {
    throw studioHttpError(400, plan.summary);
  }

  if (input.target.kind === "dm") {
    if (!input.actorDiscordId) {
      throw studioHttpError(400, "Your Discord account is not linked for DM test sends.");
    }

    const user = await client.users.fetch(input.actorDiscordId).catch(() => null);
    if (!user) throw studioHttpError(404, "Could not find your Discord user for the DM test.");

    const tokenContext = await buildStudioMemberTokenContext({
      guild,
      memberDiscordId: input.actorDiscordId,
      channel: null,
      messageId: null,
    });
    const payload = buildStudioDiscordPayload(plan, 0, tokenContext);

    await user.send({
      content: payload.content,
      embeds: payload.embeds,
      components: payload.components,
      files: payload.files,
      flags: payload.flags,
    }).catch((err: any) => {
      throw studioHttpError(400, err?.message || "Could not send the Studio DM test.");
    });

    return { ok: true, mode: "dm", diagnostics: payload.diagnostics, publishPlan: plan };
  }

  const channelId = String(input.target.channelId || "").trim();
  if (!channelId) throw studioHttpError(400, "Choose a channel before sending a test.");
  const { channel } = await resolveStudioGuildChannel(input.serverId, channelId);
  const tokenContext = await buildStudioMemberTokenContext({
    guild,
    memberDiscordId: input.actorDiscordId,
    channel,
    messageId: null,
  });
  const payload = buildStudioDiscordPayload(plan, 0, tokenContext);

  await (channel as any).send({
    content: payload.content,
    embeds: payload.embeds,
    components: payload.components,
    files: payload.files,
    flags: payload.flags,
  }).catch((err: any) => {
    throw studioHttpError(400, err?.message || "Could not send the Studio test message.");
  });

  return { ok: true, mode: "channel", diagnostics: payload.diagnostics, channelId, publishPlan: plan };
}

async function cloneStudioPublication(input: {
  publicationId: number;
  actorUserId: number;
  targetChannelId: string;
}) {
  const publication = await getStudioPublicationById(input.publicationId);
  if (!publication) throw studioHttpError(404, "Publication not found");

  const snapshot = await getCurrentStudioPublicationSnapshot(publication.id);
  if (!snapshot) throw studioHttpError(404, "Publication snapshot not found");

  return publishStudioMessage({
    serverId: publication.serverId,
    actorUserId: input.actorUserId,
    documentId: publication.documentId,
    documentInput: (snapshot.snapshot as any)?.document,
    target: {
      channelId: input.targetChannelId,
      viewId: (snapshot.snapshot as any)?.publishedViewId,
    },
  });
}

async function rollbackStudioPublication(input: {
  publicationId: number;
  snapshotId: number;
  actorUserId: number;
}) {
  const publication = await getStudioPublicationById(input.publicationId);
  if (!publication) throw studioHttpError(404, "Publication not found");

  const snapshotRecord = await getStudioPublicationSnapshotById(input.snapshotId);
  if (!snapshotRecord || snapshotRecord.publicationId !== publication.id) {
    throw studioHttpError(404, "Snapshot not found for this publication.");
  }

  const snapshot = snapshotRecord.snapshot as any;
  const { guild, channel } = await resolveStudioGuildChannel(publication.serverId, publication.channelId);
  const rollbackPlan = snapshot.publishPlan || buildStudioPublishPlan(snapshot.document, snapshot.publishedViewId, {
    tokenAvailability: {
      static: true,
      member: false,
      postSend: true,
    },
  });
  const payload = buildStudioDiscordPayload(
    rollbackPlan,
    publication.id,
    buildStudioStaticTokenContext({
      guild,
      channel,
      messageId: publication.messageId,
    }),
  );
  const existing = await (channel as any).messages.fetch(publication.messageId).catch(() => null);
  if (!existing) throw studioHttpError(404, "Published message no longer exists.");

  await existing.edit({
    content: payload.content,
    embeds: payload.embeds,
    components: payload.components,
    files: payload.files,
    flags: payload.flags,
  });

  await updateStudioPublicationRecord(publication.id, {
    currentSnapshotId: snapshotRecord.id,
    currentViewId: snapshot.publishedViewId,
    lastPublishedAt: new Date(),
    active: true,
    status: rollbackPlan.mode === "downgraded" ? "degraded" : "published",
  });

  await recordStudioRuntimeEvent({
    serverId: publication.serverId,
    publicationId: publication.id,
    documentId: publication.documentId,
    severity: "info",
    eventType: "rollback",
    summary: `Rolled back publication ${publication.id} to snapshot ${snapshotRecord.version}.`,
    details: { snapshotId: snapshotRecord.id },
  });

  return {
    publicationId: publication.id,
    messageId: publication.messageId,
    channelId: publication.channelId,
    snapshotVersion: snapshotRecord.version,
    diagnostics: payload.diagnostics,
  };
}

export function registerStudioPublishRoutes(app: Express) {
  app.post(api.servers.studioPublish.publish.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

    const parsed = api.servers.studioPublish.publish.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    try {
      const result = await publishStudioMessage({
        serverId,
        actorUserId: req.user!.id,
        actorDiscordId: req.user!.discordId,
        documentId: parsed.data.documentId,
        documentInput: parsed.data.document,
        allowDowngrade: parsed.data.allowDowngrade,
        target: parsed.data.target,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err?.statusCode || 400).json({ message: err?.message || "Failed to publish Studio document." });
    }
  });

  app.post(api.servers.studioPublish.preflight.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

    const parsed = api.servers.studioPublish.preflight.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    try {
      const result = await buildStudioPreflight({
        serverId,
        actorUserId: req.user!.id,
        documentId: parsed.data.documentId,
        documentInput: parsed.data.document,
        viewId: parsed.data.viewId,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err?.statusCode || 400).json({ message: err?.message || "Failed to build Studio preflight." });
    }
  });

  app.post(api.servers.studioPublish.test.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

    const parsed = api.servers.studioPublish.test.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    try {
      const result = await sendStudioTestMessage({
        serverId,
        actorUserId: req.user!.id,
        actorDiscordId: req.user!.discordId,
        documentId: parsed.data.documentId,
        documentInput: parsed.data.document,
        target: parsed.data.target,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err?.statusCode || 400).json({ message: err?.message || "Failed to send Studio test." });
    }
  });

  app.post(api.studio.publications.clone.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid publication ID" });
    const parsed = api.studio.publications.clone.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    try {
      const result = await cloneStudioPublication({
        publicationId: id,
        actorUserId: req.user!.id,
        targetChannelId: parsed.data.channelId,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err?.statusCode || 400).json({ message: err?.message || "Failed to clone publication." });
    }
  });

  app.post(api.studio.publications.rollback.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid publication ID" });
    const parsed = api.studio.publications.rollback.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    try {
      const result = await rollbackStudioPublication({
        publicationId: id,
        snapshotId: parsed.data.snapshotId,
        actorUserId: req.user!.id,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err?.statusCode || 400).json({ message: err?.message || "Failed to rollback publication." });
    }
  });
}
