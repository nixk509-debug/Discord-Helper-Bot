import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } from "discord.js";
import { db } from "../../db";
import { servers, channelSettings, channelSyncTemplates } from "@shared/schema";
import { and, eq } from "drizzle-orm";

export const syncCommand = new SlashCommandBuilder()
  .setName("sync")
  .setDescription("Channel template sync")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub => sub.setName("save").setDescription("Save current channel settings as a template")
    .addStringOption(o => o.setName("name").setDescription("Template name").setRequired(true))
    .addChannelOption(o => o.setName("channel").setDescription("Source channel").setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addStringOption(o => o.setName("description").setDescription("Optional description"))
  )
  .addSubcommand(sub => sub.setName("apply").setDescription("Apply a template to channels")
    .addStringOption(o => o.setName("template-name").setDescription("Template name").setRequired(true))
    .addBooleanOption(o => o.setName("preview").setDescription("Preview only — no changes applied"))
  )
  .addSubcommand(sub => sub.setName("list").setDescription("List saved templates"));

export async function handleSyncCommand(interaction: any) {
  const guild = interaction.guild;
  if (!guild) return interaction.reply({ content: "Server only.", ephemeral: true });

  const [server] = await db.select().from(servers).where(eq(servers.discordId, guild.id));
  if (!server) return interaction.reply({ content: "Run /setup first.", ephemeral: true });

  const sub = interaction.options.getSubcommand();

  if (sub === "save") {
    const name = interaction.options.getString("name");
    const channel = interaction.options.getChannel("channel");
    const description = interaction.options.getString("description");

    const [existingSettings] = await db.select().from(channelSettings)
      .where(eq(channelSettings.channelId, channel.id));

    const settings = {
      slowmode: existingSettings?.slowmode ?? 0,
      autoDeleteAfter: existingSettings?.autoDeleteAfter ?? 0,
      automodOverride: existingSettings?.automodOverride ?? null,
      adaptiveSlowmodeEnabled: existingSettings?.adaptiveSlowmodeEnabled ?? false,
      adaptiveSlowmodeThreshold: existingSettings?.adaptiveSlowmodeThreshold ?? 10,
      channelAntiLinkEnabled: existingSettings?.channelAntiLinkEnabled ?? false,
      autoPurgeEnabled: existingSettings?.autoPurgeEnabled ?? false,
      autoPurgeAfterMinutes: existingSettings?.autoPurgeAfterMinutes ?? 60,
    };

    const existing = await db.select().from(channelSyncTemplates).where(and(eq(channelSyncTemplates.serverId, server.id), eq(channelSyncTemplates.name, name)));
    if (existing.length > 0) {
      return interaction.reply({ content: `Template \`${name}\` already exists. Choose a different name.`, ephemeral: true });
    }

    await db.insert(channelSyncTemplates).values({ serverId: server.id, name, description, settings });
    return interaction.reply({ content: `✅ Template **${name}** saved from ${channel}`, ephemeral: true });
  }

  if (sub === "list") {
    const templates = await db.select().from(channelSyncTemplates).where(eq(channelSyncTemplates.serverId, server.id));
    if (templates.length === 0) return interaction.reply({ content: "No templates yet. Use `/sync save` to create one.", ephemeral: true });
    const embed = new EmbedBuilder().setTitle("📋 Channel Sync Templates").setColor(0xc0392b);
    for (const t of templates) {
      embed.addFields({ name: t.name, value: t.description ?? "No description", inline: false });
    }
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === "apply") {
    const templateName = interaction.options.getString("template-name");
    const previewOnly = interaction.options.getBoolean("preview") ?? false;

    const [template] = await db.select().from(channelSyncTemplates)
      .where(and(eq(channelSyncTemplates.serverId, server.id), eq(channelSyncTemplates.name, templateName)));
    if (!template) return interaction.reply({ content: `Template \`${templateName}\` not found.`, ephemeral: true });

    const allChannelSettings = await db.select().from(channelSettings).where(eq(channelSettings.serverId, server.id));
    const templateSettings = template.settings as Record<string, any> ?? {};

    const diff = allChannelSettings.map(ch => {
      const changes = Object.keys(templateSettings).filter(k => JSON.stringify((ch as any)[k]) !== JSON.stringify(templateSettings[k]));
      return { channel: ch.channelName, changes };
    }).filter(d => d.changes.length > 0);

    if (previewOnly) {
      const embed = new EmbedBuilder().setTitle(`📋 Preview: ${templateName}`).setColor(0xf39c12);
      if (diff.length === 0) {
        embed.setDescription("No changes needed — all channels already match this template.");
      } else {
        for (const d of diff.slice(0, 10)) {
          embed.addFields({ name: d.channel, value: d.changes.join(", "), inline: false });
        }
        if (diff.length > 10) embed.setFooter({ text: `...and ${diff.length - 10} more channels` });
      }
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    for (const ch of allChannelSettings) {
      await db.update(channelSettings).set(templateSettings as any).where(eq(channelSettings.id, ch.id));
    }
    return interaction.reply({ content: `✅ Template **${templateName}** applied to ${allChannelSettings.length} channels (${diff.length} had changes)`, ephemeral: true });
  }
}
