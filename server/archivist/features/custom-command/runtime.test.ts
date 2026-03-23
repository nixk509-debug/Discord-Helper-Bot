import test from "node:test";
import assert from "node:assert/strict";
import type { CustomCommand } from "@shared/schema";
import {
  buildCustomSlashPayloads,
  buildRuntimeActions,
  matchesKeywordCommand,
  normalizeSlashCommandName,
  resolveCustomCommandEmbed,
  resolveCustomCommandTemplate,
} from "./runtime";

function makeCommand(partial: Partial<CustomCommand>): CustomCommand {
  return {
    id: 1,
    serverId: 1,
    name: "announce",
    description: "Announce something",
    response: "Hello",
    responseType: "text",
    responseVariations: [],
    embedResponse: null,
    aliases: [],
    category: "custom-commands",
    cooldown: 0,
    cooldownScope: "user",
    requiredRoles: [],
    blockedRoles: [],
    allowedChannels: [],
    blockedChannels: [],
    enabled: true,
    deleteInvocation: false,
    dmResponse: false,
    triggerType: "slash",
    conditions: [],
    actions: [],
    usageCount: 0,
    lastUsedAt: null,
    premiumOnly: false,
    createdAt: new Date(),
    ...partial,
  };
}

test("normalizeSlashCommandName keeps slash names Discord-safe", () => {
  assert.equal(normalizeSlashCommandName("  Big Announcement!!! "), "big-announcement");
  assert.equal(normalizeSlashCommandName("A".repeat(60)), "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
});

test("buildCustomSlashPayloads dedupes conflicting slash names", () => {
  const payloads = buildCustomSlashPayloads([
    makeCommand({ id: 1, name: "Announce", triggerType: "slash" }),
    makeCommand({ id: 2, name: "announce", triggerType: "slash" }),
    makeCommand({ id: 3, name: "keyword welcome", triggerType: "keyword" }),
  ]);

  assert.equal(payloads.length, 1);
  assert.equal((payloads[0] as any).name, "announce");
});

test("matchesKeywordCommand checks names and aliases against message content", () => {
  const command = makeCommand({
    name: "welcome",
    triggerType: "keyword",
    aliases: ["hello-there"],
  });

  const message = {
    content: "Need a welcome flow and hello-there reaction",
  } as any;

  assert.equal(matchesKeywordCommand(command, message), true);
  assert.equal(matchesKeywordCommand(command, { content: "nothing here" } as any), false);
});

test("resolveCustomCommandTemplate replaces member and server tokens", () => {
  const rendered = resolveCustomCommandTemplate("Welcome {user.mention} to {server.name} in {channel.name}", {
    username: "Nick",
    displayName: "Nick",
    userId: "123",
    userMention: "<@123>",
    serverName: "Archivist Central",
    channelName: "general",
    randomMode: "runtime",
  });

  assert.equal(rendered, "Welcome <@123> to Archivist Central in general");
});

test("resolveCustomCommandTemplate supports {user} alias", () => {
  const rendered = resolveCustomCommandTemplate("Hello {user}", {
    username: "Nick",
    displayName: "Nick",
    randomMode: "runtime",
  });

  assert.equal(rendered, "Hello Nick");
});

test("resolveCustomCommandTemplate supports legacy camelCase aliases", () => {
  const rendered = resolveCustomCommandTemplate("Welcome {userMention} to {serverName} in {channelName}", {
    username: "Nick",
    displayName: "Nick",
    userMention: "<@123>",
    serverName: "Archivist Central",
    channelName: "general",
    randomMode: "runtime",
  });

  assert.equal(rendered, "Welcome <@123> to Archivist Central in general");
});

test("resolveCustomCommandEmbed replaces nested tokens", () => {
  const rendered = resolveCustomCommandEmbed({
    title: "Welcome {user}",
    description: "Server: {server.name}",
    footer: {
      text: "Channel {channel.name}",
    },
  }, {
    username: "Nick",
    displayName: "Nick",
    serverName: "Archivist Central",
    channelName: "general",
    randomMode: "runtime",
  });

  assert.deepEqual(rendered, {
    title: "Welcome Nick",
    description: "Server: Archivist Central",
    footer: {
      text: "Channel general",
    },
  });
});

test("buildRuntimeActions preserves legacy embed responses", () => {
  const actions = buildRuntimeActions(makeCommand({
    response: "",
    responseType: "embed",
    embedResponse: {
      title: "Welcome {user}",
      description: "Read the rules in {channel.name}",
    },
    actions: [],
  }));

  assert.equal(actions.length, 1);
  assert.equal(actions[0]?.type, "reply");
  assert.deepEqual(actions[0]?.embedData, {
    title: "Welcome {user}",
    description: "Read the rules in {channel.name}",
  });
});
