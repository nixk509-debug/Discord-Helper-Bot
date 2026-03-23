import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { CommandModule } from "../../commands/types";
import {
  assignRole,
  createRole,
  deleteRole,
  editRole,
  editRolePermissions,
  removeRole,
  setRoleColor,
  setRoleHoist,
  setRoleMentionable,
  setRolePosition,
} from "./service";

export const roleCommand: CommandModule = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Advanced role management.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a role.")
        .addStringOption((option) => option.setName("name").setDescription("Role name").setRequired(true))
        .addStringOption((option) => option.setName("color").setDescription("Hex color like #B11226"))
        .addBooleanOption((option) => option.setName("hoist").setDescription("Display separately"))
        .addBooleanOption((option) => option.setName("mentionable").setDescription("Allow mentions"))
        .addStringOption((option) => option.setName("permissions").setDescription("Comma-separated permissions"))
        .addIntegerOption((option) => option.setName("position").setDescription("Desired position").setMinValue(1))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Edit role properties.")
        .addRoleOption((option) => option.setName("role").setDescription("Target role").setRequired(true))
        .addStringOption((option) => option.setName("name").setDescription("New role name"))
        .addBooleanOption((option) => option.setName("hoist").setDescription("Display separately"))
        .addBooleanOption((option) => option.setName("mentionable").setDescription("Allow mentions"))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("color")
        .setDescription("Set or clear role color.")
        .addRoleOption((option) => option.setName("role").setDescription("Target role").setRequired(true))
        .addStringOption((option) => option.setName("color").setDescription("Hex color like #B11226"))
        .addBooleanOption((option) => option.setName("reset").setDescription("Clear the role color"))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("position")
        .setDescription("Move a role safely.")
        .addRoleOption((option) => option.setName("role").setDescription("Target role").setRequired(true))
        .addIntegerOption((option) => option.setName("position").setDescription("New position").setRequired(true).setMinValue(1))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("assign")
        .setDescription("Assign a role to a member.")
        .addRoleOption((option) => option.setName("role").setDescription("Target role").setRequired(true))
        .addUserOption((option) => option.setName("member").setDescription("Target member").setRequired(true))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a role from a member.")
        .addRoleOption((option) => option.setName("role").setDescription("Target role").setRequired(true))
        .addUserOption((option) => option.setName("member").setDescription("Target member").setRequired(true))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("hoist")
        .setDescription("Toggle role hoist.")
        .addRoleOption((option) => option.setName("role").setDescription("Target role").setRequired(true))
        .addBooleanOption((option) => option.setName("enabled").setDescription("Enable or disable").setRequired(true))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("mentionable")
        .setDescription("Toggle mentionable.")
        .addRoleOption((option) => option.setName("role").setDescription("Target role").setRequired(true))
        .addBooleanOption((option) => option.setName("enabled").setDescription("Enable or disable").setRequired(true))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("perms")
        .setDescription("Inspect or change role permissions.")
        .addRoleOption((option) => option.setName("role").setDescription("Target role").setRequired(true))
        .addStringOption((option) => option.setName("add").setDescription("Permissions to add"))
        .addStringOption((option) => option.setName("remove").setDescription("Permissions to remove"))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a role with confirmation.")
        .addRoleOption((option) => option.setName("role").setDescription("Target role").setRequired(true))
        .addStringOption((option) => option.setName("confirm").setDescription("Type DELETE to confirm").setRequired(true))
        .addStringOption((option) => option.setName("reason").setDescription("Audit log reason")),
    ),
  async execute(ctx) {
    const subcommand = ctx.interaction.options.getSubcommand(true);
    const handlers = {
      create: createRole,
      edit: editRole,
      color: setRoleColor,
      position: setRolePosition,
      assign: assignRole,
      remove: removeRole,
      hoist: setRoleHoist,
      mentionable: setRoleMentionable,
      perms: editRolePermissions,
      delete: deleteRole,
    } as const;

    return handlers[subcommand as keyof typeof handlers](ctx);
  },
};
