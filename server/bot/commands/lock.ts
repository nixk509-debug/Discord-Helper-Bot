import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, PermissionOverwriteOptions } from "discord.js";
import { db } from "../../db";
import { servers, serverSettings, categoryLockSnapshots } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { patchGuildConfig } from "../../configService";
import { recordAudit } from "../../auditService";

export const lockCommand = new SlashCommandBuilder()
  .setName("lock")
  .setDescription("Lock/unlock the server or categories")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub => sub.setName("server").setDescription("Lock or unlock the entire server")
    .addStringOption(o => o.setName("action").setDescription("Lock or unlock").setRequired(true).addChoices({ name: "Lock", value: "on" }, { name: "Unlock", value: "off" }))
    .addStringOption(o => o.setName("reason").setDescription("Reason for lockdown"))
    .addChannelOption(o => o.setName("notify-channel").setDescription("Channel to post notification in"))
  )
  .addSubcommand(sub => sub.setName("category").setDescription("Lock or unlock a category")
    .addStringOption(o => o.setName("category-id").setDescription("Category channel ID").setRequired(true))
    .addStringOption(o => o.setName("action").setDescription("Lock or unlock").setRequired(true).addChoices({ name: "Lock", value: "on" }, { name: "Unlock", value: "off" }))
    .addStringOption(o => o.setName("message").setDescription("Message to post in locked channels"))
  )
  .addSubcommand(sub => sub.setName("status").setDescription("Show current lockdown status"));

export async function handleLockCommand(interaction: any) {
  const guild = interaction.guild;
  if (!guild) return interaction.reply({ content: "Server only.", ephemeral: true });

  const [server] = await db.select().from(servers).where(eq(servers.discordId, guild.id));
  if (!server) return interaction.reply({ content: "Run /setup first.", ephemeral: true });

  const [settings] = await db.select().from(serverSettings).where(eq(serverSettings.serverId, server.id));
  const sub = interaction.options.getSubcommand();
  const actorId = interaction.user.id;

  if (sub === "status") {
    const locked = settings?.lockdownEnabled ?? false;
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle("🔒 Server Lockdown Status")
        .setColor(locked ? 0xe74c3c : 0x2ecc71)
        .setDescription(locked ? "**🔴 Server is currently LOCKED**" : "**🟢 Server is currently UNLOCKED**")
        .setTimestamp()
      ], ephemeral: true
    });
  }

  if (sub === "server") {
    const action = interaction.options.getString("action");
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const notifyChannel = interaction.options.getChannel("notify-channel");
    const locking = action === "on";

    await interaction.deferReply({ ephemeral: true });

    try {
      const bypassRoleIds = (settings?.lockdownBypassRoleIds as string[]) ?? [];
      const everyoneRole = guild.roles.everyone;
      const textChannels = guild.channels.cache.filter((c: any) => c.isTextBased() && !c.isThread());
      let processed = 0;

      for (const [, channel] of textChannels) {
        try {
          if (locking) {
            const currentPerms = channel.permissionOverwrites.resolve(everyoneRole.id);
            const currentAllow = currentPerms?.allow?.toArray() ?? [];
            const hasBypassMember = bypassRoleIds.some((rid: string) => {
              const overwrite = channel.permissionOverwrites.resolve(rid);
              return overwrite?.allow?.has("SendMessages");
            });
            await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false });
          } else {
            await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null });
          }
          processed++;
        } catch {}
      }

      await patchGuildConfig(server.id, "settings", { lockdownEnabled: locking }, actorId);
      await recordAudit(server.id, "lockdown", actorId, { lockdownEnabled: !locking }, { lockdownEnabled: locking });

      if (notifyChannel) {
        await notifyChannel.send({
          embeds: [new EmbedBuilder()
            .setTitle(locking ? "🔒 Server Locked" : "🔓 Server Unlocked")
            .setColor(locking ? 0xe74c3c : 0x2ecc71)
            .setDescription(locking ? `The server has been locked down.\n**Reason:** ${reason}` : "The server lockdown has been lifted.")
            .setFooter({ text: `Action by ${interaction.user.tag}` })
            .setTimestamp()
          ]
        });
      }

      await interaction.editReply({ content: `✅ Server ${locking ? "locked" : "unlocked"} (${processed} channels processed)` });
    } catch (err: any) {
      await interaction.editReply({ content: `❌ Error: ${err.message}` });
    }
  }

  if (sub === "category") {
    const categoryId = interaction.options.getString("category-id");
    const action = interaction.options.getString("action");
    const lockMsg = interaction.options.getString("message");
    const locking = action === "on";

    await interaction.deferReply({ ephemeral: true });

    try {
      const category = guild.channels.cache.get(categoryId);
      if (!category) return interaction.editReply({ content: "Category not found." });

      const childChannels = guild.channels.cache.filter((c: any) => c.parentId === categoryId && c.isTextBased());
      const everyoneRole = guild.roles.everyone;

      if (locking) {
        const snapshot: any[] = [];
        for (const [, channel] of childChannels) {
          const overwrite = channel.permissionOverwrites.resolve(everyoneRole.id);
          snapshot.push({ channelId: channel.id, allowBitfield: overwrite?.allow?.bitfield?.toString() ?? "0", denyBitfield: overwrite?.deny?.bitfield?.toString() ?? "0" });
          await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false, SendMessagesInThreads: false });
          if (lockMsg) await channel.send({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setDescription(`🔒 ${lockMsg}`)] }).catch(() => {});
        }
        await db.insert(categoryLockSnapshots).values({
          serverId: server.id,
          categoryId,
          categoryName: category.name,
          snapshot,
          lockedBy: actorId,
          unlocked: false,
        });
      } else {
        const [snap] = await db.select().from(categoryLockSnapshots)
          .where(and(eq(categoryLockSnapshots.serverId, server.id), eq(categoryLockSnapshots.categoryId, categoryId), eq(categoryLockSnapshots.unlocked, false)));
        if (snap?.snapshot) {
          const snapshotData = snap.snapshot as any[];
          for (const entry of snapshotData) {
            const ch = guild.channels.cache.get(entry.channelId);
            if (ch) await ch.permissionOverwrites.edit(everyoneRole, { SendMessages: null, SendMessagesInThreads: null }).catch(() => {});
          }
          await db.update(categoryLockSnapshots).set({ unlocked: true }).where(eq(categoryLockSnapshots.id, snap.id));
        } else {
          for (const [, channel] of childChannels) {
            await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null, SendMessagesInThreads: null }).catch(() => {});
          }
        }
      }

      await recordAudit(server.id, "category-lock", actorId, null, { categoryId, locked: locking });
      await interaction.editReply({ content: `✅ Category **${category.name}** ${locking ? "locked" : "unlocked"} (${childChannels.size} channels)` });
    } catch (err: any) {
      await interaction.editReply({ content: `❌ Error: ${err.message}` });
    }
  }
}
