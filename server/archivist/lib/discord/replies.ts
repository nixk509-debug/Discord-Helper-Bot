import { EmbedBuilder, type ChatInputCommandInteraction, type ColorResolvable, type InteractionReplyOptions } from "discord.js";

const VARIANT_COLORS: Record<"success" | "warning" | "failure" | "info", ColorResolvable> = {
  success: 0x16a34a,
  warning: 0xf59e0b,
  failure: 0xdc2626,
  info: 0xb11226,
};

function createEmbed(
  variant: keyof typeof VARIANT_COLORS,
  title: string,
  description: string,
  fields?: { name: string; value: string; inline?: boolean }[],
) {
  return new EmbedBuilder()
    .setColor(VARIANT_COLORS[variant])
    .setTitle(title)
    .setDescription(description)
    .setFields(fields || [])
    .setTimestamp(new Date());
}

async function send(interaction: ChatInputCommandInteraction, payload: InteractionReplyOptions) {
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp(payload);
  }
  return interaction.reply(payload);
}

export async function replySuccess(
  interaction: ChatInputCommandInteraction,
  title: string,
  description: string,
  options?: { fields?: { name: string; value: string; inline?: boolean }[]; ephemeral?: boolean },
) {
  return send(interaction, {
    ephemeral: options?.ephemeral ?? true,
    embeds: [createEmbed("success", title, description, options?.fields)],
  });
}

export async function replyFailure(
  interaction: ChatInputCommandInteraction,
  title: string,
  description: string,
  options?: { fields?: { name: string; value: string; inline?: boolean }[]; ephemeral?: boolean },
) {
  return send(interaction, {
    ephemeral: options?.ephemeral ?? true,
    embeds: [createEmbed("failure", title, description, options?.fields)],
  });
}
