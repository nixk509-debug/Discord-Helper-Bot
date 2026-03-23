import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { CommandModule } from "../../commands/types";

const THEME_OPTIONS = {
  crimson: { color: 0xb11226, accent: "Crimson Signal" },
  midnight: { color: 0x1f2a44, accent: "Midnight Glass" },
  gold: { color: 0xd4a63a, accent: "Gold Archive" },
  ice: { color: 0x6bbfd8, accent: "Ice Echo" },
} as const;

function normalizeQuote(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export const quotePosterCommand: CommandModule = {
  data: new SlashCommandBuilder()
    .setName("quote-poster")
    .setDescription("Turn a quote into a polished Discord poster.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option.setName("quote").setDescription("The quote you want on the poster").setRequired(true).setMaxLength(1000),
    )
    .addUserOption((option) =>
      option.setName("speaker").setDescription("Member to credit on the poster"),
    )
    .addStringOption((option) =>
      option.setName("speaker_name").setDescription("Custom speaker name if you do not want to pick a member").setMaxLength(80),
    )
    .addStringOption((option) => {
      option.setName("theme").setDescription("Poster color style");
      for (const [value, theme] of Object.entries(THEME_OPTIONS)) {
        option.addChoices({ name: theme.accent, value });
      }
      return option;
    })
    .addStringOption((option) =>
      option.setName("caption").setDescription("Small footer note under the quote").setMaxLength(120),
    ),
  async execute(ctx) {
    const rawQuote = ctx.interaction.options.getString("quote", true);
    const speaker = ctx.interaction.options.getUser("speaker");
    const speakerName = ctx.interaction.options.getString("speaker_name");
    const themeKey = (ctx.interaction.options.getString("theme") || "crimson") as keyof typeof THEME_OPTIONS;
    const caption = ctx.interaction.options.getString("caption");
    const theme = THEME_OPTIONS[themeKey] || THEME_OPTIONS.crimson;
    const quote = normalizeQuote(rawQuote);
    const creditedName = speakerName?.trim() || speaker?.displayName || speaker?.globalName || speaker?.username || ctx.interaction.user.displayName || ctx.interaction.user.globalName || ctx.interaction.user.username;
    const avatarUrl = speaker?.displayAvatarURL({ size: 512 }) || ctx.interaction.user.displayAvatarURL({ size: 512 });

    const embed = new EmbedBuilder()
      .setColor(theme.color)
      .setAuthor({
        name: `${theme.accent} Quote Poster`,
        iconURL: ctx.interaction.client.user?.displayAvatarURL() || undefined,
      })
      .setDescription([
        "## “",
        quote,
        "”",
      ].join("\n"))
      .setThumbnail(avatarUrl)
      .addFields(
        { name: "Speaker", value: creditedName, inline: true },
        { name: "Created By", value: ctx.interaction.user.username, inline: true },
      )
      .setFooter({ text: caption?.trim() || `Posted in ${ctx.guild.name}` })
      .setTimestamp();

    await ctx.interaction.reply({ embeds: [embed] });
    return null;
  },
};
