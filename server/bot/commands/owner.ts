import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction, type Client } from "discord.js";

function isOwner(userId: string) {
  return (process.env.OWNER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
}

export const ownerCommand = new SlashCommandBuilder()
  .setName("owner")
  .setDescription("Owner-only operational commands")
  .addSubcommand((sub) => sub.setName("status").setDescription("Show bot operational status"))
  .addSubcommand((sub) => sub.setName("guilds").setDescription("List guilds the bot is in"))
  .addSubcommand((sub) =>
    sub
      .setName("leave")
      .setDescription("Force the bot to leave a guild")
      .addStringOption((o) => o.setName("guild-id").setDescription("Guild ID").setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName("announce")
      .setDescription("DM all owners/moderators in every guild (best effort)")
      .addStringOption((o) => o.setName("message").setDescription("Announcement message").setRequired(true).setMaxLength(1000)),
  );

export async function handleOwnerCommand(interaction: ChatInputCommandInteraction, client: Client<boolean>) {
  if (!isOwner(interaction.user.id)) {
    return interaction.reply({ content: "This command is owner-only.", ephemeral: true });
  }

  const sub = interaction.options.getSubcommand();

  if (sub === "status") {
    const guildCount = client.guilds.cache.size;
    const mem = process.memoryUsage();
    const embed = new EmbedBuilder()
      .setTitle("🤖 Owner Status")
      .setColor(0x3b82f6)
      .addFields(
        { name: "Guilds", value: `${guildCount}`, inline: true },
        { name: "RSS Memory", value: `${Math.round(mem.rss / 1024 / 1024)} MB`, inline: true },
        { name: "Uptime", value: `${Math.round(process.uptime() / 60)} min`, inline: true },
      )
      .setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === "guilds") {
    const rows = client.guilds.cache
      .map((g) => `• **${g.name}** (\`${g.id}\`) — ${g.memberCount ?? "?"} members`)
      .slice(0, 25);
    return interaction.reply({ content: rows.join("\n") || "No guilds.", ephemeral: true });
  }

  if (sub === "leave") {
    const guildId = interaction.options.getString("guild-id", true);
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return interaction.reply({ content: "Guild not found.", ephemeral: true });

    const name = guild.name;
    await guild.leave();
    return interaction.reply({ content: `👋 Left **${name}** (\`${guildId}\`).`, ephemeral: true });
  }

  if (sub === "announce") {
    const message = interaction.options.getString("message", true);
    let sent = 0;

    const guilds = Array.from(client.guilds.cache.values());
    for (const guild of guilds) {
      try {
        const owner = await guild.fetchOwner();
        await owner.send(`📢 **Owner announcement**\n\n${message}`);
        sent++;
      } catch {
        // best effort
      }
    }

    return interaction.reply({ content: `✅ Announcement attempted to ${client.guilds.cache.size} guild owners. Successful DMs: ${sent}.`, ephemeral: true });
  }
}
