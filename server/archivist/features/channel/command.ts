import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { CommandModule } from "../../commands/types";
import {
  cloneChannel,
  createChannel,
  deleteChannel,
  editChannel,
  editChannelPermissions,
  lockChannel,
  moveChannel,
  setSlowmode,
  syncChannel,
  unlockChannel,
} from "./service";
import { channelTypeChoices } from "./helpers";

export const channelCommand: CommandModule = {
  data: new SlashCommandBuilder()
    .setName("channel")
    .setDescription("Advanced channel management.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a channel safely.")
        .addStringOption((option) => option.setName("name").setDescription("Channel name").setRequired(true))
        .addStringOption((option) => {
          option.setName("type").setDescription("Channel type").setRequired(true);
          for (const choice of channelTypeChoices) option.addChoices(choice);
          return option;
        })
        .addChannelOption((option) =>
          option.setName("category").setDescription("Parent category").addChannelTypes(ChannelType.GuildCategory),
        )
        .addStringOption((option) => option.setName("topic").setDescription("Topic where supported"))
        .addBooleanOption((option) => option.setName("nsfw").setDescription("Mark as NSFW where supported"))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Edit channel metadata.")
        .addChannelOption((option) => option.setName("channel").setDescription("Target channel").setRequired(true))
        .addStringOption((option) => option.setName("name").setDescription("New name"))
        .addStringOption((option) => option.setName("topic").setDescription("Topic where supported"))
        .addBooleanOption((option) => option.setName("nsfw").setDescription("NSFW where supported"))
        .addChannelOption((option) =>
          option.setName("category").setDescription("New category").addChannelTypes(ChannelType.GuildCategory),
        )
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("clone")
        .setDescription("Clone an existing channel.")
        .addChannelOption((option) => option.setName("channel").setDescription("Target channel").setRequired(true))
        .addStringOption((option) => option.setName("name").setDescription("Optional clone name"))
        .addChannelOption((option) =>
          option.setName("category").setDescription("Optional new category").addChannelTypes(ChannelType.GuildCategory),
        )
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("lock")
        .setDescription("Lock a channel for @everyone.")
        .addChannelOption((option) => option.setName("channel").setDescription("Target channel").setRequired(true))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("unlock")
        .setDescription("Unlock a channel for @everyone.")
        .addChannelOption((option) => option.setName("channel").setDescription("Target channel").setRequired(true))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("slowmode")
        .setDescription("Set slowmode on supported channels.")
        .addChannelOption((option) => option.setName("channel").setDescription("Target channel").setRequired(true))
        .addIntegerOption((option) =>
          option.setName("seconds").setDescription("0 to clear, max 21600").setRequired(true).setMinValue(0).setMaxValue(21600),
        )
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("move")
        .setDescription("Move a channel to a new category or position.")
        .addChannelOption((option) => option.setName("channel").setDescription("Target channel").setRequired(true))
        .addChannelOption((option) =>
          option.setName("category").setDescription("New category").addChannelTypes(ChannelType.GuildCategory),
        )
        .addIntegerOption((option) => option.setName("position").setDescription("New zero-based position").setMinValue(0))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("sync")
        .setDescription("Sync a channel with its parent category.")
        .addChannelOption((option) => option.setName("channel").setDescription("Target channel").setRequired(true))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("perms")
        .setDescription("Inspect or update channel overwrites.")
        .addChannelOption((option) => option.setName("channel").setDescription("Target channel").setRequired(true))
        .addRoleOption((option) => option.setName("target_role").setDescription("Role overwrite target"))
        .addUserOption((option) => option.setName("target_user").setDescription("User overwrite target"))
        .addStringOption((option) => option.setName("allow").setDescription("Comma-separated allow permissions"))
        .addStringOption((option) => option.setName("deny").setDescription("Comma-separated deny permissions"))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a channel with confirmation.")
        .addChannelOption((option) => option.setName("channel").setDescription("Target channel").setRequired(true))
        .addStringOption((option) => option.setName("confirm").setDescription("Type DELETE to confirm").setRequired(true))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    ),
  async execute(ctx) {
    const subcommand = ctx.interaction.options.getSubcommand(true);
    const handlers = {
      create: createChannel,
      edit: editChannel,
      clone: cloneChannel,
      lock: lockChannel,
      unlock: unlockChannel,
      slowmode: setSlowmode,
      move: moveChannel,
      sync: syncChannel,
      perms: editChannelPermissions,
      delete: deleteChannel,
    } as const;

    const handler = handlers[subcommand as keyof typeof handlers];
    return handler(ctx);
  },
};
