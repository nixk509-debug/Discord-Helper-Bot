import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { db } from "../../db";
import { servers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getAuditLog } from "../../auditService";
import { getBotClient, getBotUptime } from "../index";

export const auditCommand = new SlashCommandBuilder()
  .setName("audit")
  .setDescription("View config audit trail")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub => sub.setName("recent").setDescription("Show recent config changes").addIntegerOption(o => o.setName("limit").setDescription("Number of entries").setMinValue(1).setMaxValue(20)))
  .addSubcommand(sub => sub.setName("user").setDescription("Changes by a specific user").addUserOption(o => o.setName("user").setDescription("User").setRequired(true)))
  .addSubcommand(sub => sub.setName("module").setDescription("Changes for a module").addStringOption(o => o.setName("module-id").setDescription("Module ID (e.g. settings, commands)").setRequired(true)))
  .addSubcommand(sub => sub.setName("health").setDescription("Show bot health status"));

export async function handleAuditCommand(interaction: any) {
  const guild = interaction.guild;
  if (!guild) return interaction.reply({ content: "Server only.", ephemeral: true });

  const [server] = await db.select().from(servers).where(eq(servers.discordId, guild.id));
  if (!server) return interaction.reply({ content: "Run /setup first.", ephemeral: true });

  const sub = interaction.options.getSubcommand();

  if (sub === "health") {
    const bot = getBotClient();
    const uptimeMs = getBotUptime();
    const uptimeStr = uptimeMs ? `${Math.floor(uptimeMs / 3600000)}h ${Math.floor((uptimeMs % 3600000) / 60000)}m` : "Unknown";
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle("🩺 Archivist Health")
        .setColor(0x2ecc71)
        .addFields(
          { name: "Bot Status", value: bot ? "🟢 Online" : "🔴 Offline", inline: true },
          { name: "Uptime", value: uptimeStr, inline: true },
          { name: "Guilds", value: bot ? String(bot.guilds.cache.size) : "N/A", inline: true },
          { name: "Server ID (DB)", value: String(server.id), inline: true },
        )
        .setTimestamp()
      ], ephemeral: true
    });
  }

  const filters: any = {};
  if (sub === "recent") filters.limit = interaction.options.getInteger("limit") ?? 10;
  if (sub === "user") filters.actorId = interaction.options.getUser("user").id;
  if (sub === "module") filters.moduleId = interaction.options.getString("module-id");

  const entries = await getAuditLog(server.id, filters);
  if (entries.length === 0) {
    return interaction.reply({ content: "No audit entries found.", ephemeral: true });
  }

  const embed = new EmbedBuilder().setTitle("📋 Config Audit Log").setColor(0xc0392b);
  for (const entry of entries.slice(0, 10)) {
    const keys = (entry.changedKeys as string[]).slice(0, 5).join(", ") || "N/A";
    const time = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Unknown";
    embed.addFields({
      name: `${entry.moduleId} — ${time}`,
      value: `Actor: \`${entry.actorId}\`\nChanged: \`${keys}\``,
      inline: false,
    });
  }
  await interaction.reply({ embeds: [embed], ephemeral: true });
}
