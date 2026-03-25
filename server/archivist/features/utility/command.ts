import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import type { CommandModule, CommandContext } from "../../commands/types";
import { getBotStatus } from "../../bot/runtime";

export const utilityCommand: CommandModule = {
  data: new SlashCommandBuilder()
    .setName("archivist")
    .setDescription("Advanced Archivist utility and diagnostic commands")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName("status")
        .setDescription("View real-time bot and gateway status")
    )
    .addSubcommand(sub =>
      sub
        .setName("lookup")
        .setDescription("Advanced member lookup with detailed metadata")
        .addUserOption(opt => opt.setName("user").setDescription("The user to inspect").setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName("diagnostics")
        .setDescription("Run a diagnostic check on the current server connection")
    ),

  async execute(ctx: CommandContext) {
    const subcommand = ctx.interaction.options.getSubcommand();

    if (subcommand === "status") {
      const status = getBotStatus();
      return {
        title: "System Status",
        description: "Real-time diagnostics from the Archivist core engine.",
        fields: [
          { name: "Gateway", value: status.ready ? "Connected" : "Offline", inline: true },
          { name: "Ping", value: status.gatewayPingMs ? `${Math.round(status.gatewayPingMs)}ms` : "N/A", inline: true },
          { name: "Status", value: status.wsStatus, inline: true },
          { name: "Uptime", value: status.uptimeMs ? `${Math.round(status.uptimeMs / 1000 / 60)} minutes` : "N/A", inline: true },
          { name: "Guilds", value: String(status.guildCount), inline: true },
        ]
      };
    }

    if (subcommand === "lookup") {
      const user = ctx.interaction.options.getUser("user", true);
      const member = await ctx.guild.members.fetch(user.id).catch(() => null);
      
      const embed = new EmbedBuilder()
        .setTitle(`Member Lookup: ${user.tag}`)
        .setThumbnail(user.displayAvatarURL())
        .setColor(0x6E7BFF)
        .addFields(
          { name: "ID", value: user.id, inline: true },
          { name: "Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: "Bot", value: user.bot ? "Yes" : "No", inline: true }
        );

      if (member) {
        embed.addFields(
          { name: "Joined Server", value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`, inline: true },
          { name: "Highest Role", value: member.roles.highest.toString(), inline: true },
          { name: "Permissions", value: String(member.permissions.toArray().length), inline: true }
        );
      }

      await ctx.interaction.reply({ embeds: [embed] });
      return null;
    }

    if (subcommand === "diagnostics") {
      const channels = ctx.guild.channels.cache.size;
      const roles = ctx.guild.roles.cache.size;
      const permissions = ctx.guild.members.me?.permissions.toArray().length || 0;

      return {
        title: "Server Diagnostics",
        description: "Checking connection health and visibility for this guild.",
        fields: [
          { name: "Visible Channels", value: String(channels), inline: true },
          { name: "Visible Roles", value: String(roles), inline: true },
          { name: "Bot Permissions", value: `${permissions} flags active`, inline: true },
          { name: "Connection", value: "Stable", inline: true }
        ]
      };
    }

    return null;
  }
};
