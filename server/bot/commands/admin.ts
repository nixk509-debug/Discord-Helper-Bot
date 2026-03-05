import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type GuildTextBasedChannel,
} from "discord.js";

export const adminCommand = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("Advanced admin moderation utilities")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("purge")
      .setDescription("Delete recent messages")
      .addIntegerOption((o) => o.setName("amount").setDescription("How many messages (1-100)").setRequired(true).setMinValue(1).setMaxValue(100))
      .addUserOption((o) => o.setName("user").setDescription("Optional user filter"))
      .addStringOption((o) => o.setName("reason").setDescription("Reason for the purge").setMaxLength(200)),
  )
  .addSubcommand((sub) =>
    sub
      .setName("say")
      .setDescription("Send a bot announcement to a channel")
      .addChannelOption((o) =>
        o
          .setName("channel")
          .setDescription("Destination channel")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
      )
      .addStringOption((o) => o.setName("message").setDescription("Announcement content").setRequired(true).setMaxLength(2000)),
  )
  .addSubcommand((sub) =>
    sub
      .setName("slowmode")
      .setDescription("Set slowmode in a text channel")
      .addChannelOption((o) =>
        o
          .setName("channel")
          .setDescription("Channel to update")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText),
      )
      .addIntegerOption((o) => o.setName("seconds").setDescription("0 to disable, max 21600").setRequired(true).setMinValue(0).setMaxValue(21600)),
  )
  .addSubcommand((sub) =>
    sub
      .setName("nickname")
      .setDescription("Set a member nickname")
      .addUserOption((o) => o.setName("user").setDescription("Member").setRequired(true))
      .addStringOption((o) => o.setName("nickname").setDescription("Leave blank to clear").setMaxLength(32).setRequired(false)),
  );

export async function handleAdminCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({ content: "Server only.", ephemeral: true });
  }

  const sub = interaction.options.getSubcommand();

  if (sub === "purge") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: "You need **Manage Messages** to use this.", ephemeral: true });
    }

    const amount = interaction.options.getInteger("amount", true);
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const channel = interaction.channel;

    if (!channel?.isTextBased() || channel.isDMBased()) {
      return interaction.reply({ content: "This command only works in text channels.", ephemeral: true });
    }

    const fetched = await channel.messages.fetch({ limit: 100 });
    const filtered = user ? fetched.filter((m) => m.author.id === user.id).first(amount) : fetched.first(amount);

    if (filtered.length === 0) {
      return interaction.reply({ content: "No matching messages found.", ephemeral: true });
    }

    const deleted = await channel.bulkDelete(filtered, true);
    return interaction.reply({ content: `🧹 Deleted **${deleted.size}** messages. Reason: ${reason}`, ephemeral: true });
  }

  if (sub === "say") {
    const channel = interaction.options.getChannel("channel", true);
    const message = interaction.options.getString("message", true);

    await (channel as GuildTextBasedChannel).send(message);
    return interaction.reply({ content: `✅ Sent message to ${channel}.`, ephemeral: true });
  }

  if (sub === "slowmode") {
    const channel = interaction.options.getChannel("channel", true);
    const seconds = interaction.options.getInteger("seconds", true);

    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply({ content: "Slowmode can only be changed on text channels.", ephemeral: true });
    }

    await (channel as any).setRateLimitPerUser(seconds);
    return interaction.reply({ content: `✅ Slowmode for ${channel} set to **${seconds}s**.`, ephemeral: true });
  }

  if (sub === "nickname") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageNicknames)) {
      return interaction.reply({ content: "You need **Manage Nicknames** to use this.", ephemeral: true });
    }
    const user = interaction.options.getUser("user", true);
    const nickname = interaction.options.getString("nickname");
    const member = await interaction.guild.members.fetch(user.id);

    await member.setNickname(nickname ?? null);
    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle("Nickname Updated")
      .setDescription(`Updated nickname for ${member} to **${nickname ?? member.user.username}**.`)
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
