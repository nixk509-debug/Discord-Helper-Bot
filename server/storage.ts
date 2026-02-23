import { db } from "./db";
import {
  servers,
  serverSettings,
  customCommands,
  embeds,
  type Server,
  type ServerSettings,
  type CustomCommand,
  type Embed,
} from "@shared/schema";
import { 
  type UpdateSettingsInput, 
  type CreateCommandInput, 
  type ServerWithRelations,
  type CreateEmbedInput,
  type UpdateEmbedInput 
} from "@shared/routes";
import { eq } from "drizzle-orm";

export interface IStorage {
  getServers(): Promise<ServerWithRelations[]>;
  getServer(id: number): Promise<ServerWithRelations | undefined>;
  
  updateSettings(serverId: number, settings: UpdateSettingsInput): Promise<ServerSettings>;
  
  getCommands(serverId: number): Promise<CustomCommand[]>;
  createCommand(serverId: number, command: CreateCommandInput): Promise<CustomCommand>;
  deleteCommand(id: number): Promise<void>;

  getEmbeds(serverId: number): Promise<Embed[]>;
  createEmbed(serverId: number, embed: CreateEmbedInput): Promise<Embed>;
  updateEmbed(id: number, embed: UpdateEmbedInput): Promise<Embed>;
  deleteEmbed(id: number): Promise<void>;
  
  // Seed data helpers
  _createBaseServer(server: Omit<Server, "id" | "joinedAt">): Promise<Server>;
  _createBaseSettings(settings: Omit<ServerSettings, "id" | "updatedAt">): Promise<ServerSettings>;
}

export class DatabaseStorage implements IStorage {
  async getServers(): Promise<ServerWithRelations[]> {
    const allServers = await db.query.servers.findMany({
      with: {
        settings: true,
        customCommands: true,
        embeds: true,
      },
    });
    return allServers;
  }

  async getServer(id: number): Promise<ServerWithRelations | undefined> {
    return await db.query.servers.findFirst({
      where: eq(servers.id, id),
      with: {
        settings: true,
        customCommands: true,
        embeds: true,
      },
    });
  }

  async updateSettings(serverId: number, settings: UpdateSettingsInput): Promise<ServerSettings> {
    const { bannedWords, ...rest } = settings;
    const [updated] = await db
      .update(serverSettings)
      .set({ 
        ...rest, 
        ...(bannedWords ? { bannedWords: bannedWords as string[] } : {}),
        updatedAt: new Date() 
      } as any)
      .where(eq(serverSettings.serverId, serverId))
      .returning();
    return updated;
  }

  async getCommands(serverId: number): Promise<CustomCommand[]> {
    return await db.select().from(customCommands).where(eq(customCommands.serverId, serverId));
  }

  async createCommand(serverId: number, command: CreateCommandInput): Promise<CustomCommand> {
    const [created] = await db.insert(customCommands).values({ ...command, serverId }).returning();
    return created;
  }

  async deleteCommand(id: number): Promise<void> {
    await db.delete(customCommands).where(eq(customCommands.id, id));
  }

  async getEmbeds(serverId: number): Promise<Embed[]> {
    return await db.select().from(embeds).where(eq(embeds.serverId, serverId));
  }

  async createEmbed(serverId: number, embed: CreateEmbedInput): Promise<Embed> {
    const [created] = await db.insert(embeds).values({ ...embed, serverId } as any).returning();
    return created;
  }

  async updateEmbed(id: number, embed: UpdateEmbedInput): Promise<Embed> {
    const [updated] = await db.update(embeds).set(embed as any).where(eq(embeds.id, id)).returning();
    return updated;
  }

  async deleteEmbed(id: number): Promise<void> {
    await db.delete(embeds).where(eq(embeds.id, id));
  }

  async _createBaseServer(server: Omit<Server, "id" | "joinedAt">): Promise<Server> {
    const [created] = await db.insert(servers).values(server).returning();
    return created;
  }

  async _createBaseSettings(settings: Omit<ServerSettings, "id" | "updatedAt">): Promise<ServerSettings> {
    const [created] = await db.insert(serverSettings).values(settings).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();