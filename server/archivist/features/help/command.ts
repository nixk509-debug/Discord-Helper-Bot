import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, type SlashCommandSubcommandsOnlyBuilder } from "discord.js";
import type { CommandModule, CommandContext } from "../../commands/types";
import { listCommandModules, getCommandModule } from "../../commands/registry";

export const helpCommand: CommandModule = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("View the complete guide to Archivist commands and systems")
    .addStringOption(opt =>
      opt.setName("command")
        .setDescription("Get detailed help for a specific command")
        .setRequired(false)
    ),

  async execute(ctx: CommandContext) {
    const commandName = ctx.interaction.options.getString("command");
    const modules = listCommandModules();

    if (commandName) {
      const module = getCommandModule(commandName);
      if (!module) {
        throw new Error(`Command \`/${commandName}\` not found in the Archivist registry.`);
      }

      const data = module.data.toJSON() as any;
      const description = data.description || "No description available.";

      const embed = new EmbedBuilder()
        .setTitle(`Command Guide: /${module.data.name}`)
        .setDescription(description)
        .setColor(0x6E7BFF)
        .addFields(
          { 
            name: "Usage", 
            value: `Type \`/${module.data.name}\` in your message bar to see all available subcommands and options.`
          }
        );

      await ctx.interaction.reply({ embeds: [embed], ephemeral: true });
      return null;
    }

    // Default Help Menu
    const embed = new EmbedBuilder()
      .setTitle("Archivist Control Center")
      .setDescription("Welcome to the Archivist command guide. Use the menu below to explore our core systems or type `/help [command]` for deep-dives.")
      .setColor(0x6E7BFF)
      .addFields(
        { 
          name: "Active Modules", 
          value: modules.map(m => {
            const data = m.data.toJSON() as any;
            return `**/${m.data.name}** - ${data.description || "No description"}`;
          }).join("\n") 
        }
      )
      .setFooter({ text: "Archivist • Advanced Discord Control" });

    const select = new StringSelectMenuBuilder()
      .setCustomId("help_select")
      .setPlaceholder("Choose a system to learn more...")
      .addOptions(
        modules.map(m => {
          const data = m.data.toJSON() as any;
          return {
            label: m.data.name.charAt(0).toUpperCase() + m.data.name.slice(1),
            description: (data.description || "").substring(0, 50),
            value: m.data.name,
          };
        })
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await ctx.interaction.reply({ 
      embeds: [embed], 
      components: [row.toJSON() as any],
      ephemeral: true 
    });

    return null;
  }
};
