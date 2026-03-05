import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { db } from "../../db";
import { servers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { generateCode, redeemCode, listCodes, revokeCode } from "../../codeVaultService";

export const codeCommand = new SlashCommandBuilder()
  .setName("code")
  .setDescription("Code Vault — generate and redeem invite codes")
  .addSubcommand(sub => sub.setName("gen").setDescription("Generate a new invite code (Manage Server)")
    .addStringOption(o => o.setName("format").setDescription("Code format").setRequired(true).addChoices({ name: "Plain (ABCD1234)", value: "plain" }, { name: "Grouped (ABCD-1234-EFGH)", value: "grouped" }, { name: "Prefixed (AX-XXXXXX)", value: "prefixed" }))
    .addIntegerOption(o => o.setName("max-uses").setDescription("Maximum uses (leave blank for unlimited)").setMinValue(1))
    .addIntegerOption(o => o.setName("expires-hours").setDescription("Expires after N hours").setMinValue(1))
    .addStringOption(o => o.setName("role-id").setDescription("Role ID to grant on redemption"))
    .addStringOption(o => o.setName("tag").setDescription("Tag for organization"))
  )
  .addSubcommand(sub => sub.setName("redeem").setDescription("Redeem an invite code").addStringOption(o => o.setName("code").setDescription("The code").setRequired(true)))
  .addSubcommand(sub => sub.setName("list").setDescription("List recent codes (Manage Server)"))
  .addSubcommand(sub => sub.setName("revoke").setDescription("Revoke a code (Manage Server)").addStringOption(o => o.setName("code").setDescription("Code to revoke").setRequired(true)));

export async function handleCodeCommand(interaction: any) {
  const guild = interaction.guild;
  if (!guild) return interaction.reply({ content: "Server only.", ephemeral: true });

  const [server] = await db.select().from(servers).where(eq(servers.discordId, guild.id));
  if (!server) return interaction.reply({ content: "Run /setup first.", ephemeral: true });

  const sub = interaction.options.getSubcommand();

  if (sub === "gen") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: "You need Manage Server permission.", ephemeral: true });
    }
    const format = interaction.options.getString("format");
    const maxUses = interaction.options.getInteger("max-uses") ?? undefined;
    const expiresHours = interaction.options.getInteger("expires-hours") ?? undefined;
    const roleId = interaction.options.getString("role-id");
    const tag = interaction.options.getString("tag");

    const code = await generateCode({
      format,
      maxUses,
      expiresHours,
      grantRoles: roleId ? [roleId] : [],
      tags: tag ? [tag] : [],
      createdBy: interaction.user.id,
      serverId: server.id,
      guildDiscordId: guild.id,
    });

    try {
      await interaction.user.send({
        embeds: [new EmbedBuilder()
          .setTitle("🎟️ New Code Generated")
          .setColor(0xc0392b)
          .addFields(
            { name: "Code", value: `\`\`\`${code.code}\`\`\``, inline: false },
            { name: "Format", value: format, inline: true },
            { name: "Max Uses", value: maxUses ? String(maxUses) : "Unlimited", inline: true },
            { name: "Expires", value: expiresHours ? `${expiresHours}h` : "Never", inline: true },
            { name: "Grants Roles", value: roleId ? `<@&${roleId}>` : "None", inline: true },
          )
          .setTimestamp()
        ]
      });
      return interaction.reply({ content: "✅ Code generated and sent to your DMs!", ephemeral: true });
    } catch {
      await interaction.reply({ content: `✅ Code generated: \`${code.code}\`\n*(Could not DM you — check your privacy settings)*`, ephemeral: true });
    }
  }

  if (sub === "redeem") {
    const codeStr = interaction.options.getString("code");
    const result = await redeemCode(codeStr.toUpperCase(), interaction.user.id, guild.id);

    if (!result.success) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("❌ Code Invalid").setDescription(result.error ?? "Unknown error")],
        ephemeral: true
      });
    }

    const grantedRoles: string[] = [];
    for (const roleId of (result.grantRoles ?? [])) {
      try {
        const member = await guild.members.fetch(interaction.user.id);
        await member.roles.add(roleId);
        grantedRoles.push(`<@&${roleId}>`);
      } catch (err: any) {
        console.error(`[Code] Failed to grant role ${roleId}:`, err.message);
      }
    }

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("✅ Code Redeemed!")
        .setDescription(grantedRoles.length > 0 ? `**Roles granted:** ${grantedRoles.join(", ")}` : "Code accepted! No roles to grant.")
      ],
      ephemeral: true
    });
  }

  if (sub === "list") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: "You need Manage Server permission.", ephemeral: true });
    }
    const codes = await listCodes(server.id);
    const recent = codes.slice(0, 10);
    if (recent.length === 0) return interaction.reply({ content: "No codes yet. Use `/code gen` to create one.", ephemeral: true });

    const embed = new EmbedBuilder().setTitle("🗂️ Recent Codes").setColor(0xc0392b);
    for (const c of recent) {
      const status = c.revoked ? "🔴 Revoked" : c.expiresAt && new Date() > c.expiresAt ? "⏰ Expired" : "🟢 Active";
      embed.addFields({ name: `\`${c.code}\``, value: `${status} | ${c.usesCount}/${c.maxUses ?? "∞"} uses | Format: ${c.format}`, inline: false });
    }
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === "revoke") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: "You need Manage Server permission.", ephemeral: true });
    }
    const codeStr = interaction.options.getString("code").toUpperCase();
    const codes = await listCodes(server.id);
    const found = codes.find(c => c.code === codeStr);
    if (!found) return interaction.reply({ content: "Code not found in this server.", ephemeral: true });
    await revokeCode(found.id);
    return interaction.reply({ content: `✅ Code \`${codeStr}\` revoked.`, ephemeral: true });
  }
}
