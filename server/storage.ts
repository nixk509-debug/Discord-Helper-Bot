import { db } from "./db";
import {
  servers,
  serverSettings,
  customCommands,
  type Server,
  type ServerSettings,
  type CustomCommand,
} from "@shared/schema";
import { type UpdateSettingsInput, type CreateCommandInput, type ServerWithRelations } from "@shared/routes";
import { eq } from "drizzle-orm";

export interface IStorage {
  getServers(): Promise<ServerWithRelations[]>;
  getServer(id: number): Promise<ServerWithRelations | undefined>;
  
  updateSettings(serverId: number, settings: UpdateSettingsInput): Promise<ServerSettings>;
  
  getCommands(serverId: number): Promise<CustomCommand[]>;
  createCommand(command: CreateCommandInput): Promise<CustomCommand>;
  deleteCommand(id: number): Promise<void>;
  
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
      },
    });
  }

  async updateSettings(serverId: number, settings: UpdateSettingsInput): Promise<ServerSettings> {
    const [updated] = await db
      .update(serverSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(serverSettings.serverId, serverId))
      .returning();
    return updated;
  }

  async getCommands(serverId: number): Promise<CustomCommand[]> {
    return await db.select().from(customCommands).where(eq(customCommands.serverId, serverId));
  }

  async createCommand(command: CreateCommandInput): Promise<CustomCommand> {
    const [created] = await db.insert(customCommands).values(command).returning();
    return created;
  }

  async deleteCommand(id: number): Promise<void> {
    await db.delete(customCommands).where(eq(customCommands.id, id));
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