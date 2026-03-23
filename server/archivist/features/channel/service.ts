import { ChannelType, type ChatInputCommandInteraction, type GuildBasedChannel } from "discord.js";
import { assertBotPermissions, assertUserPermissions } from "../../lib/guards/permissions";
import { CommandError } from "../../lib/errors";
import type { CommandContext, CommandOutcome } from "../../commands/types";
import { isConfirmationMatch } from "../../lib/utils/format";
import { formatPermissionList } from "../../lib/utils/permissions";
import {
  assertCommunityTypeAllowed,
  buildChannelLockPatch,
  buildOverwritePatch,
  canSetNsfw,
  canSetSlowmode,
  canSetTopic,
  channelManagePermissions,
  ensureCategoryTarget,
  ManageableGuildChannel,
  overwriteManagePermissions,
  resolveChannelType,
  summarizeOverwrite,
  type SupportedChannelType,
} from "./helpers";

function getRequiredChannel(interaction: ChatInputCommandInteraction, name = "channel") {
  const channel = interaction.options.getChannel(name, true, [
    ChannelType.GuildText,
    ChannelType.GuildVoice,
    ChannelType.GuildAnnouncement,
    ChannelType.GuildStageVoice,
    ChannelType.GuildForum,
    ChannelType.GuildCategory,
  ]);
  return channel as ManageableGuildChannel;
}

function getOptionalCategory(interaction: ChatInputCommandInteraction) {
  const category = interaction.options.getChannel("category", false, [ChannelType.GuildCategory]);
  return ensureCategoryTarget((category as GuildBasedChannel | null) || null) as ManageableGuildChannel | null;
}

export async function createChannel(ctx: CommandContext): Promise<CommandOutcome> {
  assertUserPermissions(ctx, channelManagePermissions);
  assertBotPermissions(ctx, channelManagePermissions);

  const interaction = ctx.interaction;
  const name = interaction.options.getString("name", true).trim();
  const typeKey = interaction.options.getString("type", true) as SupportedChannelType;
  const category = getOptionalCategory(interaction);
  const topic = interaction.options.getString("topic");
  const nsfw = interaction.options.getBoolean("nsfw") ?? false;
  const reason = interaction.options.getString("reason") || `Requested by ${interaction.user.tag}`;

  assertCommunityTypeAllowed(ctx.guild.features, typeKey);
  const type = resolveChannelType(typeKey);
  const payload: Record<string, unknown> = { name, type, reason };

  if (category && type !== ChannelType.GuildCategory) payload.parent = category.id;
  if ((type === ChannelType.GuildText || type === ChannelType.GuildAnnouncement || type === ChannelType.GuildStageVoice) && topic) {
    payload.topic = topic;
  }
  if ((type === ChannelType.GuildText || type === ChannelType.GuildAnnouncement || type === ChannelType.GuildForum) && nsfw) {
    payload.nsfw = nsfw;
  }

  const created = await ctx.guild.channels.create(payload as any);
  return {
    title: "Channel created",
    description: `${created} was created as a ${typeKey} channel.`,
  };
}

export async function editChannel(ctx: CommandContext): Promise<CommandOutcome> {
  const channel = getRequiredChannel(ctx.interaction);
  assertUserPermissions(ctx, channelManagePermissions, channel);
  assertBotPermissions(ctx, channelManagePermissions, channel);

  const name = ctx.interaction.options.getString("name");
  const topic = ctx.interaction.options.getString("topic");
  const nsfw = ctx.interaction.options.getBoolean("nsfw");
  const category = getOptionalCategory(ctx.interaction);
  const reason = ctx.interaction.options.getString("reason") || `Requested by ${ctx.interaction.user.tag}`;
  const ignored: string[] = [];

  if (name?.trim()) await channel.setName(name.trim(), reason);
  if (category) {
    if (channel.type === ChannelType.GuildCategory) {
      throw new CommandError("UNSUPPORTED_OPERATION", "Category channels cannot be nested inside another category.");
    }
    await (channel as any).setParent(category.id, { lockPermissions: false, reason });
  }
  if (topic != null) {
    if (!canSetTopic(channel)) ignored.push("topic");
    else await (channel as any).setTopic(topic, reason);
  }
  if (nsfw != null) {
    if (!canSetNsfw(channel)) ignored.push("nsfw");
    else await (channel as any).setNSFW(nsfw, reason);
  }

  return {
    title: "Channel updated",
    description: ignored.length > 0
      ? `${channel} was updated. Unsupported fields were ignored: ${ignored.join(", ")}.`
      : `${channel} was updated successfully.`,
  };
}

export async function cloneChannel(ctx: CommandContext): Promise<CommandOutcome> {
  const channel = getRequiredChannel(ctx.interaction);
  assertUserPermissions(ctx, channelManagePermissions, channel);
  assertBotPermissions(ctx, channelManagePermissions, channel);

  const name = ctx.interaction.options.getString("name")?.trim();
  const category = getOptionalCategory(ctx.interaction);
  const reason = ctx.interaction.options.getString("reason") || `Requested by ${ctx.interaction.user.tag}`;

  const cloned = await (channel as any).clone({ name: name || undefined, reason });
  if (category && cloned.type !== ChannelType.GuildCategory) {
    await cloned.setParent(category.id, { lockPermissions: false, reason });
  }

  return {
    title: "Channel cloned",
    description: `${channel} was cloned to ${cloned}.`,
  };
}

async function setLockedState(ctx: CommandContext, locked: boolean): Promise<CommandOutcome> {
  const channel = getRequiredChannel(ctx.interaction);
  assertUserPermissions(ctx, channelManagePermissions, channel);
  assertBotPermissions(ctx, overwriteManagePermissions, channel);

  const patch = buildChannelLockPatch(channel, locked);
  const reason = ctx.interaction.options.getString("reason") || `Requested by ${ctx.interaction.user.tag}`;
  await channel.permissionOverwrites.edit(ctx.guild.roles.everyone, patch, { reason });

  return {
    title: locked ? "Channel locked" : "Channel unlocked",
    description: `${channel} was ${locked ? "locked" : "unlocked"} for @everyone.`,
  };
}

export function lockChannel(ctx: CommandContext) {
  return setLockedState(ctx, true);
}

export function unlockChannel(ctx: CommandContext) {
  return setLockedState(ctx, false);
}

export async function setSlowmode(ctx: CommandContext): Promise<CommandOutcome> {
  const channel = getRequiredChannel(ctx.interaction);
  assertUserPermissions(ctx, channelManagePermissions, channel);
  assertBotPermissions(ctx, channelManagePermissions, channel);

  if (!canSetSlowmode(channel)) {
    throw new CommandError("UNSUPPORTED_OPERATION", "That channel type does not support slowmode.");
  }

  const seconds = ctx.interaction.options.getInteger("seconds", true);
  const reason = ctx.interaction.options.getString("reason") || `Requested by ${ctx.interaction.user.tag}`;
  await (channel as any).setRateLimitPerUser(seconds, reason);

  return {
    title: "Slowmode updated",
    description: seconds === 0 ? `${channel} slowmode was cleared.` : `${channel} slowmode is now ${seconds} seconds.`,
  };
}

export async function moveChannel(ctx: CommandContext): Promise<CommandOutcome> {
  const channel = getRequiredChannel(ctx.interaction);
  assertUserPermissions(ctx, channelManagePermissions, channel);
  assertBotPermissions(ctx, channelManagePermissions, channel);

  const category = getOptionalCategory(ctx.interaction);
  const position = ctx.interaction.options.getInteger("position");
  const reason = ctx.interaction.options.getString("reason") || `Requested by ${ctx.interaction.user.tag}`;

  if (category) {
    if (channel.type === ChannelType.GuildCategory) {
      throw new CommandError("UNSUPPORTED_OPERATION", "Category channels cannot be nested inside categories.");
    }
    await (channel as any).setParent(category.id, { lockPermissions: false, reason });
  }

  if (position != null) {
    await (channel as any).setPosition(position, { reason });
  }

  return {
    title: "Channel moved",
    description: `${channel} was moved${category ? ` into ${category}` : ""}${position != null ? ` to position ${position}` : ""}.`,
  };
}

export async function syncChannel(ctx: CommandContext): Promise<CommandOutcome> {
  const channel = getRequiredChannel(ctx.interaction);
  assertUserPermissions(ctx, channelManagePermissions, channel);
  assertBotPermissions(ctx, channelManagePermissions, channel);

  if (!channel.parent) {
    throw new CommandError("UNSUPPORTED_OPERATION", "This channel does not have a parent category to sync from.");
  }

  await (channel as any).lockPermissions();
  return {
    title: "Permissions synced",
    description: `${channel} now matches the overwrites from ${channel.parent}.`,
  };
}

export async function editChannelPermissions(ctx: CommandContext): Promise<CommandOutcome> {
  const channel = getRequiredChannel(ctx.interaction);
  assertUserPermissions(ctx, overwriteManagePermissions, channel);
  assertBotPermissions(ctx, overwriteManagePermissions, channel);

  const roleTarget = ctx.interaction.options.getRole("target_role");
  const userTarget = ctx.interaction.options.getUser("target_user");
  const allowInput = ctx.interaction.options.getString("allow");
  const denyInput = ctx.interaction.options.getString("deny");
  const reason = ctx.interaction.options.getString("reason") || `Requested by ${ctx.interaction.user.tag}`;

  if (roleTarget && userTarget) {
    throw new CommandError("VALIDATION_FAILED", "Choose either a role target or a user target, not both.");
  }

  const target = roleTarget || userTarget;
  if (!target) {
    return {
      title: "Channel permissions",
      description: summarizeOverwrite(channel),
    };
  }

  if (!allowInput && !denyInput) {
    return {
      title: "Channel permissions",
      description: summarizeOverwrite(channel, target.id),
    };
  }

  const patch = buildOverwritePatch(allowInput, denyInput);
  await channel.permissionOverwrites.edit(target.id, patch as any, { reason });

  return {
    title: "Overwrite updated",
    description: `${channel} permissions were updated for ${roleTarget ? `<@&${roleTarget.id}>` : `<@${userTarget!.id}>`}.`,
    fields: [
      allowInput ? { name: "Allow", value: formatPermissionList(allowInput.split(",").map((item) => item.trim()).filter(Boolean)) || "none" } : undefined,
      denyInput ? { name: "Deny", value: formatPermissionList(denyInput.split(",").map((item) => item.trim()).filter(Boolean)) || "none" } : undefined,
    ].filter(Boolean) as { name: string; value: string }[],
  };
}

export async function deleteChannel(ctx: CommandContext): Promise<CommandOutcome> {
  const channel = getRequiredChannel(ctx.interaction);
  assertUserPermissions(ctx, channelManagePermissions, channel);
  assertBotPermissions(ctx, channelManagePermissions, channel);

  const confirmation = ctx.interaction.options.getString("confirm", true);
  if (!isConfirmationMatch(confirmation)) {
    throw new CommandError("VALIDATION_FAILED", "Type DELETE in the confirmation field to remove a channel.");
  }

  const name = channel.name;
  const reason = ctx.interaction.options.getString("reason") || `Requested by ${ctx.interaction.user.tag}`;
  await channel.delete(reason);

  return {
    title: "Channel deleted",
    description: `#${name} was deleted.`,
  };
}
