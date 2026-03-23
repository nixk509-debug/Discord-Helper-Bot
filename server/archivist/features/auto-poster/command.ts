import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, type GuildTextBasedChannel } from "discord.js";
import { storage } from "../../../storage";
import type { CommandModule } from "../../commands/types";
import { CommandError } from "../../lib/errors";
import {
  buildAutoPosterPayload,
  collectButtonLinks,
  collectStatFields,
  findNextCronSlotAfter,
  isLikelyCronExpression,
  normalizeTimezone,
} from "./shared";

const POSTER_THEMES = {
  crimson: { color: 0xb11226, accent: "Crimson Signal", marker: "*" },
  midnight: { color: 0x20304d, accent: "Midnight Control", marker: "#" },
  gold: { color: 0xd2a43d, accent: "Gold Broadcast", marker: "+" },
  ice: { color: 0x6ac7e0, accent: "Ice Relay", marker: "~" },
  emerald: { color: 0x2e9c74, accent: "Emerald Pulse", marker: ">" },
} as const;

const POSTER_LAYOUTS = {
  announcement: {
    eyebrow: "Server Announcement",
    helper: "A polished broadcast poster for updates and notices.",
  },
  launch: {
    eyebrow: "Feature Launch",
    helper: "A more dramatic launch-style poster with a hype-first voice.",
  },
  event: {
    eyebrow: "Event Spotlight",
    helper: "A schedule/event poster that still feels premium in Discord.",
  },
  alert: {
    eyebrow: "Important Notice",
    helper: "Sharper copy and higher urgency for rule, ops, or warning posts.",
  },
  spotlight: {
    eyebrow: "Spotlight",
    helper: "A clean feature card style for standout updates.",
  },
  roadmap: {
    eyebrow: "Roadmap Update",
    helper: "Built for progress reports, milestones, and next steps.",
  },
  status: {
    eyebrow: "Status Update",
    helper: "A compact, high-clarity poster for operational updates.",
  },
} as const;

function clean(value: string | null | undefined) {
  return value?.trim() || "";
}

function normalizeBody(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function pickTheme(value: string | null) {
  const key = (value || "crimson") as keyof typeof POSTER_THEMES;
  return POSTER_THEMES[key] || POSTER_THEMES.crimson;
}

function pickLayout(value: string | null) {
  const key = (value || "announcement") as keyof typeof POSTER_LAYOUTS;
  return POSTER_LAYOUTS[key] || POSTER_LAYOUTS.announcement;
}

function resolvePosterChannel(channel: unknown): GuildTextBasedChannel | null {
  if (!channel || typeof channel !== "object" || !("send" in channel)) return null;
  return channel as GuildTextBasedChannel;
}

function formatScheduledRun(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export const autoPosterCommand: CommandModule = {
  data: new SlashCommandBuilder()
    .setName("auto-poster")
    .setDescription("Create a premium Discord poster directly from the bot.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option.setName("title").setDescription("Main poster title").setRequired(true).setMaxLength(120),
    )
    .addStringOption((option) =>
      option.setName("body").setDescription("Main poster body or announcement copy").setRequired(true).setMaxLength(1900),
    )
    .addStringOption((option) => {
      option.setName("layout").setDescription("Poster composition style");
      for (const [value, layout] of Object.entries(POSTER_LAYOUTS)) {
        option.addChoices({ name: layout.eyebrow, value });
      }
      return option;
    })
    .addStringOption((option) => {
      option.setName("theme").setDescription("Poster color direction");
      for (const [value, theme] of Object.entries(POSTER_THEMES)) {
        option.addChoices({ name: theme.accent, value });
      }
      return option;
    })
    .addStringOption((option) =>
      option.setName("eyebrow").setDescription("Small label above the title").setMaxLength(80),
    )
    .addStringOption((option) =>
      option.setName("subtitle").setDescription("Secondary line under the title").setMaxLength(160),
    )
    .addStringOption((option) =>
      option.setName("footer").setDescription("Footer or signature line").setMaxLength(160),
    )
    .addStringOption((option) =>
      option.setName("image_url").setDescription("Large image URL for the poster body").setMaxLength(500),
    )
    .addStringOption((option) =>
      option.setName("thumbnail_url").setDescription("Thumbnail or badge art URL").setMaxLength(500),
    )
    .addRoleOption((option) =>
      option.setName("mention_role").setDescription("Optional role mention to pair with the poster"),
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Post into a specific text channel instead of replying here")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addStringOption((option) =>
      option.setName("button_label").setDescription("Optional CTA button label").setMaxLength(80),
    )
    .addStringOption((option) =>
      option.setName("button_url").setDescription("Optional CTA button URL").setMaxLength(500),
    )
    .addStringOption((option) =>
      option.setName("button_two_label").setDescription("Optional second CTA button label").setMaxLength(80),
    )
    .addStringOption((option) =>
      option.setName("button_two_url").setDescription("Optional second CTA button URL").setMaxLength(500),
    )
    .addStringOption((option) =>
      option.setName("button_three_label").setDescription("Optional third CTA button label").setMaxLength(80),
    )
    .addStringOption((option) =>
      option.setName("button_three_url").setDescription("Optional third CTA button URL").setMaxLength(500),
    )
    .addStringOption((option) =>
      option.setName("stat_one_label").setDescription("Optional stat label #1").setMaxLength(60),
    )
    .addStringOption((option) =>
      option.setName("stat_one_value").setDescription("Optional stat value #1").setMaxLength(120),
    )
    .addStringOption((option) =>
      option.setName("stat_two_label").setDescription("Optional stat label #2").setMaxLength(60),
    )
    .addStringOption((option) =>
      option.setName("stat_two_value").setDescription("Optional stat value #2").setMaxLength(120),
    )
    .addStringOption((option) =>
      option.setName("stat_three_label").setDescription("Optional stat label #3").setMaxLength(60),
    )
    .addStringOption((option) =>
      option.setName("stat_three_value").setDescription("Optional stat value #3").setMaxLength(120),
    )
    .addStringOption((option) =>
      option.setName("schedule_cron").setDescription("Optional cron expression to auto-post on repeat").setMaxLength(120),
    )
    .addStringOption((option) =>
      option.setName("schedule_timezone").setDescription("Timezone for scheduled posting, like America/New_York").setMaxLength(64),
    ),
  async execute(ctx) {
    const title = clean(ctx.interaction.options.getString("title", true));
    const body = normalizeBody(ctx.interaction.options.getString("body", true));
    const layoutKey = ctx.interaction.options.getString("layout") || "announcement";
    const themeKey = ctx.interaction.options.getString("theme") || "crimson";
    const layout = pickLayout(layoutKey);
    const theme = pickTheme(themeKey);
    const eyebrow = clean(ctx.interaction.options.getString("eyebrow")) || `${theme.marker} ${layout.eyebrow}`;
    const subtitle = clean(ctx.interaction.options.getString("subtitle"));
    const footer = clean(ctx.interaction.options.getString("footer")) || `Posted by ${ctx.interaction.user.displayName || ctx.interaction.user.username}`;
    const imageUrl = clean(ctx.interaction.options.getString("image_url"));
    const thumbnailUrl = clean(ctx.interaction.options.getString("thumbnail_url"));
    const mentionRole = ctx.interaction.options.getRole("mention_role");
    const targetChannel = resolvePosterChannel(ctx.interaction.options.getChannel("channel"));
    const fallbackChannel = resolvePosterChannel(ctx.interaction.channel);
    const buttonLinks = collectButtonLinks([
      { label: ctx.interaction.options.getString("button_label"), url: ctx.interaction.options.getString("button_url") },
      { label: ctx.interaction.options.getString("button_two_label"), url: ctx.interaction.options.getString("button_two_url") },
      { label: ctx.interaction.options.getString("button_three_label"), url: ctx.interaction.options.getString("button_three_url") },
    ]);
    const statFields = collectStatFields([
      { label: ctx.interaction.options.getString("stat_one_label"), value: ctx.interaction.options.getString("stat_one_value") },
      { label: ctx.interaction.options.getString("stat_two_label"), value: ctx.interaction.options.getString("stat_two_value") },
      { label: ctx.interaction.options.getString("stat_three_label"), value: ctx.interaction.options.getString("stat_three_value") },
    ]);
    const scheduleCron = clean(ctx.interaction.options.getString("schedule_cron"));
    const scheduleTimezone = scheduleCron ? normalizeTimezone(ctx.interaction.options.getString("schedule_timezone")) : "UTC";
    const sendChannel = targetChannel || fallbackChannel;

    if (!title) {
      throw new CommandError("VALIDATION_FAILED", "Poster title cannot be empty.");
    }
    if (!body) {
      throw new CommandError("VALIDATION_FAILED", "Poster body cannot be empty.");
    }

    const payload = buildAutoPosterPayload({
      title,
      body,
      layoutKey,
      themeKey,
      eyebrow,
      subtitle,
      footer,
      imageUrl,
      thumbnailUrl,
      mentionRole: mentionRole ? `${mentionRole}` : null,
      actorLabel: ctx.interaction.user.displayName || ctx.interaction.user.username,
      brandIconUrl: ctx.client.user?.displayAvatarURL() || undefined,
      buttonLinks,
      statFields,
    });

    await ctx.interaction.deferReply({ ephemeral: true });

    if (scheduleCron) {
      if (!isLikelyCronExpression(scheduleCron)) {
        throw new CommandError("VALIDATION_FAILED", "Scheduled posters need a 5-field cron like 0 9 * * *.");
      }
      if (!sendChannel) {
        throw new CommandError("UNSUPPORTED_OPERATION", "Pick a text channel to store the scheduled poster in.");
      }

      const nextRunAt = findNextCronSlotAfter(scheduleCron, new Date(), scheduleTimezone);
      if (!nextRunAt) {
        throw new CommandError("VALIDATION_FAILED", "No matching run was found in the next 90 days.");
      }

      const server = await storage.getServerByDiscordId(ctx.guild.id);
      if (!server) {
        throw new CommandError("NOT_FOUND", "This server is not registered with Archivist yet.");
      }

      const stored = await storage.createScheduledMessage(server.id, {
        channelId: sendChannel.id,
        content: payload.content || null,
        embedData: {
          kind: "auto_poster",
          version: 1,
          title,
          layoutKey,
          themeKey,
          payload,
        },
        cronExpression: scheduleCron,
        timezone: scheduleTimezone,
        enabled: true,
        lastRunAt: null,
        nextRunAt,
        embedId: null,
      });

      await ctx.interaction.editReply({
        content: `Auto poster #${stored.id} scheduled for ${formatScheduledRun(nextRunAt, scheduleTimezone)} in ${sendChannel.toString()}.`,
      });
      return null;
    }

    if (!sendChannel) {
      throw new CommandError("UNSUPPORTED_OPERATION", "Use the command in a text channel or choose a target channel.");
    }

    await sendChannel.send(payload as any);
    await ctx.interaction.editReply({
      content: `Poster sent to ${sendChannel.toString()}.`,
    });
    return null;
  },
};
