import { autoPosterCommand } from "../features/auto-poster/command";
import type { CommandModule } from "./types";
import { channelCommand } from "../features/channel/command";
import { helpCommand } from "../features/help/command";
import { panelCommand } from "../features/panel/command";
import { quotePosterCommand } from "../features/quote-poster/command";
import { roleCommand } from "../features/role/command";
import { utilityCommand } from "../features/utility/command";

const commandModules: CommandModule[] = [
  channelCommand, 
  roleCommand, 
  panelCommand, 
  quotePosterCommand, 
  autoPosterCommand, 
  utilityCommand,
  helpCommand
];
const commandMap = new Map(commandModules.map((command) => [command.data.name, command]));

export function listCommandModules() {
  return commandModules;
}

export function getCommandModule(name: string) {
  return commandMap.get(name);
}

export function buildCommandPayloads() {
  return commandModules.map((command) => command.data.toJSON());
}
