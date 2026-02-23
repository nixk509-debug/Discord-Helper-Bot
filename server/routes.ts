import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // --- STATS ---
  app.get(api.stats.get.path, async (_req, res) => {
    // Mock stats for dashboard landing page
    res.json({
      totalServers: 42,
      totalMembers: 154820,
      commandsExecuted: 890241,
      uptime: "99.99%",
    });
  });

  // --- SERVERS ---
  app.get(api.servers.list.path, async (_req, res) => {
    const serversList = await storage.getServers();
    res.json(serversList);
  });

  app.get(api.servers.get.path, async (req, res) => {
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: "Invalid server ID" });
    }
    const server = await storage.getServer(serverId);
    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }
    res.json(server);
  });

  // --- SETTINGS ---
  app.patch(api.settings.update.path, async (req, res) => {
    try {
      const serverId = parseInt(req.params.serverId);
      if (isNaN(serverId)) {
        return res.status(400).json({ message: "Invalid server ID" });
      }

      // Verify server exists
      const server = await storage.getServer(serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      const input = api.settings.update.input.parse(req.body);
      const updated = await storage.updateSettings(serverId, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // --- CUSTOM COMMANDS ---
  app.get(api.commands.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: "Invalid server ID" });
    }
    const commands = await storage.getCommands(serverId);
    res.json(commands);
  });

  app.post(api.commands.create.path, async (req, res) => {
    try {
      const serverId = parseInt(req.params.serverId);
      if (isNaN(serverId)) {
        return res.status(400).json({ message: "Invalid server ID" });
      }
      
      const server = await storage.getServer(serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      const inputSchema = api.commands.create.input.extend({
        serverId: z.number()
      });
      
      const input = inputSchema.parse({ ...req.body, serverId });
      const created = await storage.createCommand(serverId, input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.commands.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid command ID" });
    }
    await storage.deleteCommand(id);
    res.status(204).send();
  });

  // --- EMBEDS ---
  app.get(api.embeds.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: "Invalid server ID" });
    }
    const embedsList = await storage.getEmbeds(serverId);
    res.json(embedsList);
  });

  app.post(api.embeds.create.path, async (req, res) => {
    try {
      const serverId = parseInt(req.params.serverId);
      if (isNaN(serverId)) {
        return res.status(400).json({ message: "Invalid server ID" });
      }
      const input = api.embeds.create.input.parse(req.body);
      const created = await storage.createEmbed(serverId, input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.embeds.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid embed ID" });
      }
      const input = api.embeds.update.input.parse(req.body);
      const updated = await storage.updateEmbed(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.embeds.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid embed ID" });
    }
    await storage.deleteEmbed(id);
    res.status(204).send();
  });

  // Seed the database on startup
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getServers();
  if (existing.length === 0) {
    console.log("Seeding initial mock data...");
    
    // Server 1
    const s1 = await storage._createBaseServer({
      discordId: "123456789012345678",
      name: "The Gaming Hub",
      iconUrl: "https://cdn.discordapp.com/icons/123456789012345678/a_dummy_icon.png",
      memberCount: 1542,
      ownerId: "987654321098765432",
    });

    await storage._createBaseSettings({
      serverId: s1.id,
      prefix: "!",
      welcomeChannelId: "welcome-1",
      welcomeMessage: "Welcome to The Gaming Hub, {user}!",
      leaveMessage: "{user} has left the server.",
      automodEnabled: true,
      antiSpamEnabled: true,
      antiLinkEnabled: false,
      bannedWords: ["badword1", "badword2"],
      logChannelId: "logs-1",
      logEvents: ["messageDelete", "memberJoin", "memberLeave"],
    });

    await storage.createCommand(s1.id, {
      name: "rules",
      response: "1. Be respectful. 2. No spamming. 3. Have fun!",
    });

    // Server 2
    const s2 = await storage._createBaseServer({
      discordId: "876543210987654321",
      name: "Anime Enthusiasts",
      iconUrl: "https://cdn.discordapp.com/icons/876543210987654321/a_dummy_icon.png",
      memberCount: 890,
      ownerId: "987654321098765432",
    });

    await storage._createBaseSettings({
      serverId: s2.id,
      prefix: "?",
      welcomeChannelId: "welcome-2",
      welcomeMessage: "Yokoso, {user}!",
      leaveMessage: "Sayonara, {user}.",
      automodEnabled: false,
      antiSpamEnabled: false,
      antiLinkEnabled: true,
      bannedWords: [],
      logChannelId: null,
      logEvents: [],
    });

    await storage.createCommand(s2.id, {
      name: "recommend",
      response: "Check out Frieren: Beyond Journey's End!",
    });
  }
}