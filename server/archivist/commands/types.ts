import type { ChatInputCommandInteraction, Client, Guild, GuildMember } from "discord.js";
import { CommandError } from "../lib/errors";
import type { ArchivistLogger } from "../lib/logger";

export interface CommandContext {
  client: Client;
  interaction: ChatInputCommandInteraction;
  guild: Guild;
  member: GuildMember;
  botMember: GuildMember;
  logger: ArchivistLogger;
  startedAt: number;
  commandPath: string;
}

export interface CommandOutcome {
  title: string;
  description: string;
  fields?: { name: string; value: string; inline?: boolean }[];
}

export type CommandExecutionResult = CommandOutcome | null | void;

export interface CommandModule {
  data: {
    name: string;
    toJSON: () => unknown;
  };
  execute: (ctx: CommandContext) => Promise<CommandExecutionResult>;
}

export async function createCommandContext(
  interaction: ChatInputCommandInteraction,
  logger: ArchivistLogger,
): Promise<CommandContext> {
  if (!interaction.inCachedGuild() || !interaction.guild) {
    throw new CommandError("UNSUPPORTED_OPERATION", "This command only works inside a server.", { status: 400 });
  }

  const member = interaction.member as GuildMember;
  const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe();
  const subcommand = interaction.options.getSubcommand(false);

  return {
    client: interaction.client,
    interaction,
    guild: interaction.guild,
    member,
    botMember,
    logger,
    startedAt: Date.now(),
    commandPath: subcommand ? `${interaction.commandName} ${subcommand}` : interaction.commandName,
  };
}
