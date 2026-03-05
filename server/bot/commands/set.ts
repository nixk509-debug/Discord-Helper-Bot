import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from "discord.js";
import { db } from "../../db";
import { servers, serverSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { patchGuildConfig } from "../../configService";

export const setCommand = new SlashCommandBuilder()
  .setName("set")
  .setDescription("Configure server settings")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub => sub.setName("prefix").setDescription("Set the command prefix").addStringOption(o => o.setName("prefix").setDescription("New prefix").setRequired(true).setMaxLength(5)))
  .addSubcommand(sub => sub.setName("mode").setDescription("Set server control mode").addStringOption(o => o.setName("mode").setDescription("Mode").setRequired(true).addChoices({ name: "Relaxed", value: "relaxed" }, { name: "Normal", value: "normal" }, { name: "Shield", value: "shield" })))
  .addSubcommand(sub => sub.setName("automod").setDescription("Toggle automod").addStringOption(o => o.setName("status").setDescription("On or off").setRequired(true).addChoices({ name: "On", value: "on" }, { name: "Off", value: "off" })))
  .addSubcommandGroup(grp => grp.setName("logs").setDescription("Set log channels")
    .addSubcommand(sub => sub.setName("mod").setDescription("Set mod log channel").addChannelOption(o => o.setName("channel").setDescription("Channel").setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand(sub => sub.setName("config").setDescription("Set config log channel").addChannelOption(o => o.setName("channel").setDescription("Channel").setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand(sub => sub.setName("raid").setDescription("Set raid log channel").addChannelOption(o => o.setName("channel").setDescription("Channel").setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand(sub => sub.setName("auto").setDescription("Set auto-mod log channel").addChannelOption(o => o.setName("channel").setDescription("Channel").setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
  );

export async function handleSetCommand(interaction: any) {
  const guild = interaction.guild;
  if (!guild) return interaction.reply({ content: "Server only.", ephemeral: true });

  const [server] = await db.select().from(servers).where(eq(servers.discordId, guild.id));
  if (!server) return interaction.reply({ content: "Run /setup first.", ephemeral: true });

  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();
  const actorId = interaction.user.id;

  if (group === "logs") {
    const channel = interaction.options.getChannel("channel");
    const fieldMap: Record<string, string> = {
      mod: "modLogChannelId",
      config: "configLogChannelId",
      raid: "raidLogChannelId",
      auto: "autoLogChannelId",
    };
    const field = fieldMap[sub];
    if (!field) return interaction.reply({ content: "Unknown log type.", ephemeral: true });
    await patchGuildConfig(server.id, "settings", { [field]: channel.id }, actorId);
    return interaction.reply({ content: `✅ ${sub.charAt(0).toUpperCase() + sub.slice(1)} log channel set to ${channel}.`, ephemeral: true });
  }

  if (sub === "prefix") {
    const prefix = interaction.options.getString("prefix");
    await patchGuildConfig(server.id, "settings", { prefix }, actorId);
    return interaction.reply({ content: `✅ Prefix set to \`${prefix}\``, ephemeral: true });
  }

  if (sub === "mode") {
    const mode = interaction.options.getString("mode");
    const modeSettings: Record<string, any> = {
      relaxed: { raidProtectionEnabled: false, antiSpamEnabled: false, raidJoinThreshold: 20, raidMinAccountAge: 0, serverControlMode: "relaxed" },
      normal: { raidProtectionEnabled: false, raidJoinThreshold: 10, raidMinAccountAge: 0, serverControlMode: "normal" },
      shield: { raidProtectionEnabled: true, antiSpamEnabled: true, antiLinkEnabled: true, antiMassMentionEnabled: true, raidJoinThreshold: 5, raidJoinWindow: 10, raidMinAccountAge: 7, serverControlMode: "shield" },
    };
    const patch = modeSettings[mode];
    if (!patch) return interaction.reply({ content: "Unknown mode.", ephemeral: true });
    await patchGuildConfig(server.id, "settings", patch, actorId);
    return interaction.reply({ content: `✅ Server mode set to **${mode}**`, ephemeral: true });
  }

  if (sub === "automod") {
    const status = interaction.options.getString("status") === "on";
    await patchGuildConfig(server.id, "settings", { automodEnabled: status }, actorId);
    return interaction.reply({ content: `✅ Automod ${status ? "enabled" : "disabled"}`, ephemeral: true });
  }

  return interaction.reply({ content: "Unknown subcommand.", ephemeral: true });
}
