import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { db } from "../../db";
import { servers, serverSettings, economy, economyTransactions, roleShop } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

const COOLDOWN_DAILY = 24 * 60 * 60 * 1000;
const COOLDOWN_WORK = 60 * 60 * 1000;
const COOLDOWN_ROB = 6 * 60 * 60 * 1000;

export const economyCommands = [
  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your or another user's balance")
    .addUserOption((o) => o.setName("user").setDescription("User to check").setRequired(false)),

  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily reward"),

  new SlashCommandBuilder()
    .setName("work")
    .setDescription("Work to earn some coins"),

  new SlashCommandBuilder()
    .setName("transfer")
    .setDescription("Transfer coins to another user")
    .addUserOption((o) => o.setName("user").setDescription("User to transfer to").setRequired(true))
    .addIntegerOption((o) => o.setName("amount").setDescription("Amount to transfer").setRequired(true).setMinValue(1)),

  new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Pay another user coins")
    .addUserOption((o) => o.setName("user").setDescription("User to pay").setRequired(true))
    .addIntegerOption((o) => o.setName("amount").setDescription("Amount to pay").setRequired(true).setMinValue(1)),

  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Browse the role shop"),

  new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Buy a role from the shop")
    .addStringOption((o) => o.setName("role").setDescription("Role name to buy").setRequired(true)),

  new SlashCommandBuilder()
    .setName("slots")
    .setDescription("Play the slots")
    .addIntegerOption((o) => o.setName("bet").setDescription("Amount to bet").setRequired(false).setMinValue(1)),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin")
    .addIntegerOption((o) => o.setName("bet").setDescription("Amount to bet").setRequired(false).setMinValue(1))
    .addStringOption((o) =>
      o.setName("side").setDescription("heads or tails").setRequired(false)
        .addChoices({ name: "Heads", value: "heads" }, { name: "Tails", value: "tails" })
    ),

  new SlashCommandBuilder()
    .setName("richest")
    .setDescription("View the richest members leaderboard"),

  new SlashCommandBuilder()
    .setName("transactions")
    .setDescription("View recent transactions")
    .addUserOption((o) => o.setName("user").setDescription("User to view").setRequired(false)),

  new SlashCommandBuilder()
    .setName("rob")
    .setDescription("Attempt to rob another user")
    .addUserOption((o) => o.setName("user").setDescription("User to rob").setRequired(true)),
];

async function getServerAndSettings(guildId: string) {
  const [server] = await db.select().from(servers).where(eq(servers.discordId, guildId));
  if (!server) return null;
  const [settings] = await db.select().from(serverSettings).where(eq(serverSettings.serverId, server.id));
  return { server, settings };
}

async function getOrCreateAccount(serverId: number, userId: string, username: string, startingBalance = 100) {
  const [existing] = await db.select().from(economy).where(and(eq(economy.serverId, serverId), eq(economy.userId, userId)));
  if (existing) return existing;
  const [created] = await db.insert(economy).values({ serverId, userId, username, balance: startingBalance } as any).returning();
  return created;
}

async function adjustBalance(serverId: number, userId: string, amount: number, type: string, description: string) {
  const [account] = await db.select().from(economy).where(and(eq(economy.serverId, serverId), eq(economy.userId, userId)));
  if (!account) return null;
  const newBalance = Math.max(0, (account.balance || 0) + amount);
  const [updated] = await db.update(economy).set({
    balance: newBalance,
    totalEarned: amount > 0 ? (account.totalEarned || 0) + amount : account.totalEarned,
    totalSpent: amount < 0 ? (account.totalSpent || 0) + Math.abs(amount) : account.totalSpent,
  } as any).where(eq(economy.id, account.id)).returning();
  await db.insert(economyTransactions).values({
    serverId, userId, type, amount, balanceBefore: account.balance || 0, balanceAfter: newBalance, description
  } as any);
  return updated;
}

function buildEmbed(title: string, description: string, color: number = 0xdc2626) {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
}

export async function handleEconomyCommand(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) return interaction.reply({ content: "Economy commands only work in servers.", ephemeral: true });

  const data = await getServerAndSettings(guild.id);
  if (!data) return interaction.reply({ content: "This server is not set up with Archivist.", ephemeral: true });
  const { server, settings } = data;

  if (!settings?.economyEnabled) {
    return interaction.reply({ content: "The economy system is not enabled for this server.", ephemeral: true });
  }

  const currencyName = settings.economyCurrencyName || "Coins";
  const currencySymbol = settings.economyCurrencySymbol || "🪙";
  const startingBalance = settings.economyStartingBalance || 100;
  const commandName = interaction.commandName;

  if (commandName === "balance") {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const account = await getOrCreateAccount(server.id, targetUser.id, targetUser.username, startingBalance);
    const embed = buildEmbed(
      `${currencySymbol} Balance — ${targetUser.username}`,
      `**Balance:** ${account.balance?.toLocaleString() || 0} ${currencyName}\n**Total Earned:** ${(account.totalEarned || 0).toLocaleString()}\n**Total Spent:** ${(account.totalSpent || 0).toLocaleString()}`
    );
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === "daily") {
    const account = await getOrCreateAccount(server.id, interaction.user.id, interaction.user.username, startingBalance);
    const now = new Date();
    if (account.lastDaily && now.getTime() - new Date(account.lastDaily).getTime() < COOLDOWN_DAILY) {
      const remaining = COOLDOWN_DAILY - (now.getTime() - new Date(account.lastDaily).getTime());
      const hours = Math.ceil(remaining / 3600000);
      return interaction.reply({ content: `Your daily reward is on cooldown! Come back in **${hours}h**.`, ephemeral: true });
    }
    const min = settings.economyDailyMin || 50;
    const max = settings.economyDailyMax || 200;
    const reward = Math.floor(Math.random() * (max - min + 1)) + min;
    await adjustBalance(server.id, interaction.user.id, reward, "daily", "Daily reward");
    await db.update(economy).set({ lastDaily: now } as any).where(and(eq(economy.serverId, server.id), eq(economy.userId, interaction.user.id)));
    const embed = buildEmbed(`${currencySymbol} Daily Reward`, `You claimed your daily reward of **${reward} ${currencyName}**!`, 0x22c55e);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === "work") {
    const account = await getOrCreateAccount(server.id, interaction.user.id, interaction.user.username, startingBalance);
    const now = new Date();
    if (account.lastWork && now.getTime() - new Date(account.lastWork).getTime() < COOLDOWN_WORK) {
      const remaining = COOLDOWN_WORK - (now.getTime() - new Date(account.lastWork).getTime());
      const minutes = Math.ceil(remaining / 60000);
      return interaction.reply({ content: `You're still tired from your last shift! Rest for **${minutes}m**.`, ephemeral: true });
    }
    const min = settings.economyWorkMin || 20;
    const max = settings.economyWorkMax || 100;
    const reward = Math.floor(Math.random() * (max - min + 1)) + min;
    const messages = (settings.economyWorkMessages as string[] | null) || [];
    const defaultMessages = [
      "You worked hard and earned {amount} coins!",
      "You fixed some bugs and got {amount} coins.",
      "Your shift is over, you earned {amount} coins.",
      "You delivered packages and earned {amount} coins.",
    ];
    const pool = messages.length > 0 ? messages : defaultMessages;
    const msg = pool[Math.floor(Math.random() * pool.length)].replace("{amount}", `**${reward}**`);
    await adjustBalance(server.id, interaction.user.id, reward, "work", "Work reward");
    await db.update(economy).set({ lastWork: now } as any).where(and(eq(economy.serverId, server.id), eq(economy.userId, interaction.user.id)));
    const embed = buildEmbed(`${currencySymbol} Work`, `${msg} (+${reward} ${currencyName})`, 0x3b82f6);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === "transfer" || commandName === "pay") {
    const targetUser = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);
    if (targetUser.id === interaction.user.id) return interaction.reply({ content: "You can't transfer to yourself.", ephemeral: true });
    const senderAccount = await getOrCreateAccount(server.id, interaction.user.id, interaction.user.username, startingBalance);
    if ((senderAccount.balance || 0) < amount) {
      return interaction.reply({ content: `You don't have enough ${currencyName}. Your balance is **${senderAccount.balance || 0}**.`, ephemeral: true });
    }
    await getOrCreateAccount(server.id, targetUser.id, targetUser.username, startingBalance);
    await adjustBalance(server.id, interaction.user.id, -amount, "transfer", `Transfer to ${targetUser.username}`);
    await adjustBalance(server.id, targetUser.id, amount, "transfer", `Transfer from ${interaction.user.username}`);
    const embed = buildEmbed(`${currencySymbol} Transfer`, `**${interaction.user.username}** sent **${amount} ${currencyName}** to **${targetUser.username}**.`, 0x22c55e);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === "shop") {
    const items = await db.select().from(roleShop).where(and(eq(roleShop.serverId, server.id), eq(roleShop.isActive, true)));
    if (items.length === 0) {
      return interaction.reply({ content: "The role shop is empty.", ephemeral: true });
    }
    const list = items.map((i) => `**${i.roleName}** — ${currencySymbol} ${i.price.toLocaleString()} ${i.duration ? `(${i.duration}min)` : "(Permanent)"}`).join("\n");
    const embed = buildEmbed(`${currencySymbol} Role Shop`, list);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === "buy") {
    const roleName = interaction.options.getString("role", true);
    const items = await db.select().from(roleShop).where(and(eq(roleShop.serverId, server.id), eq(roleShop.isActive, true)));
    const item = items.find((entry) => entry.roleName.toLowerCase() === roleName.toLowerCase());
    if (!item) {
      return interaction.reply({ content: `Role **${roleName}** not found in the shop.`, ephemeral: true });
    }
    const account = await getOrCreateAccount(server.id, interaction.user.id, interaction.user.username, startingBalance);
    if ((account.balance || 0) < item.price) {
      return interaction.reply({ content: `You need **${item.price} ${currencyName}** to buy this role. You have **${account.balance || 0}**.`, ephemeral: true });
    }
    await adjustBalance(server.id, interaction.user.id, -item.price, "shop", `Bought role: ${item.roleName}`);
    await db.update(roleShop).set({ totalSold: (item.totalSold || 0) + 1 } as any).where(eq(roleShop.id, item.id));
    try {
      const member = await guild.members.fetch(interaction.user.id);
      await member.roles.add(item.roleId);
    } catch {}
    const embed = buildEmbed(`${currencySymbol} Purchase`, `You bought the **${item.roleName}** role for **${item.price} ${currencyName}**!`, 0x22c55e);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === "slots") {
    if (!settings.economyGamblingEnabled) return interaction.reply({ content: "Gambling is disabled in this server.", ephemeral: true });
    const bet = interaction.options.getInteger("bet") || 10;
    const account = await getOrCreateAccount(server.id, interaction.user.id, interaction.user.username, startingBalance);
    if ((account.balance || 0) < bet) return interaction.reply({ content: `Not enough ${currencyName}.`, ephemeral: true });
    const symbols = ["🍒", "🍋", "🍇", "⭐", "💎"];
    const spin = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];
    const row = spin.join(" | ");
    let winMultiplier = 0;
    if (spin[0] === spin[1] && spin[1] === spin[2]) {
      winMultiplier = spin[0] === "💎" ? 5 : spin[0] === "⭐" ? 3 : 2;
    } else if (spin[0] === spin[1] || spin[1] === spin[2]) {
      winMultiplier = 1.2;
    }
    const winAmount = Math.floor(bet * winMultiplier) - bet;
    await adjustBalance(server.id, interaction.user.id, winAmount, "gamble", `Slots: bet ${bet}`);
    const won = winAmount > 0;
    const embed = buildEmbed(
      `${currencySymbol} Slots`,
      `[ ${row} ]\n\n${won ? `**You won ${winAmount} ${currencyName}!**` : winAmount === 0 ? "Push — your bet was returned!" : `**You lost ${bet} ${currencyName}.**`}`,
      won ? 0x22c55e : 0xef4444
    );
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === "coinflip") {
    if (!settings.economyGamblingEnabled) return interaction.reply({ content: "Gambling is disabled in this server.", ephemeral: true });
    const bet = interaction.options.getInteger("bet") || 10;
    const side = interaction.options.getString("side") || (Math.random() < 0.5 ? "heads" : "tails");
    const account = await getOrCreateAccount(server.id, interaction.user.id, interaction.user.username, startingBalance);
    if ((account.balance || 0) < bet) return interaction.reply({ content: `Not enough ${currencyName}.`, ephemeral: true });
    const result = Math.random() < 0.5 ? "heads" : "tails";
    const won = result === side;
    const delta = won ? bet : -bet;
    await adjustBalance(server.id, interaction.user.id, delta, "gamble", `Coinflip: ${side}`);
    const embed = buildEmbed(
      `${currencySymbol} Coin Flip`,
      `You chose **${side}**, it landed on **${result}**!\n\n${won ? `**+${bet} ${currencyName}** — You win!` : `**-${bet} ${currencyName}** — Better luck next time!`}`,
      won ? 0x22c55e : 0xef4444
    );
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === "richest") {
    const top = await db.select().from(economy).where(eq(economy.serverId, server.id))
      .orderBy(sql`balance DESC`).limit(10);
    if (top.length === 0) return interaction.reply({ content: "No economy data yet.", ephemeral: true });
    const list = top.map((a, i) => `**#${i + 1}** ${a.username || a.userId} — ${currencySymbol} ${(a.balance || 0).toLocaleString()}`).join("\n");
    const embed = buildEmbed(`${currencySymbol} ${currencyName} Leaderboard`, list);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === "transactions") {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const txs = await db.select().from(economyTransactions)
      .where(and(eq(economyTransactions.serverId, server.id), eq(economyTransactions.userId, targetUser.id)))
      .orderBy(sql`created_at DESC`).limit(10);
    if (txs.length === 0) return interaction.reply({ content: `No transactions found for **${targetUser.username}**.`, ephemeral: true });
    const list = txs.map((t) => `\`${t.type}\` ${t.amount > 0 ? "+" : ""}${t.amount} → **${t.balanceAfter}** — ${t.description || ""}`).join("\n");
    const embed = buildEmbed(`${currencySymbol} Transactions — ${targetUser.username}`, list);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (commandName === "rob") {
    if (!settings.economyRobEnabled) return interaction.reply({ content: "The rob command is disabled in this server.", ephemeral: true });
    const targetUser = interaction.options.getUser("user", true);
    if (targetUser.id === interaction.user.id) return interaction.reply({ content: "You can't rob yourself.", ephemeral: true });
    const robberAccount = await getOrCreateAccount(server.id, interaction.user.id, interaction.user.username, startingBalance);
    const now = new Date();
    if (robberAccount.lastRob && now.getTime() - new Date(robberAccount.lastRob).getTime() < COOLDOWN_ROB) {
      const remaining = COOLDOWN_ROB - (now.getTime() - new Date(robberAccount.lastRob).getTime());
      const hours = Math.ceil(remaining / 3600000);
      return interaction.reply({ content: `You need to lay low for another **${hours}h** before robbing again.`, ephemeral: true });
    }
    const victimAccount = await getOrCreateAccount(server.id, targetUser.id, targetUser.username, startingBalance);
    if ((victimAccount.balance || 0) < 10) return interaction.reply({ content: `**${targetUser.username}** doesn't have enough to rob.`, ephemeral: true });
    const successChance = (settings.economyRobSuccessChance || 40) / 100;
    await db.update(economy).set({ lastRob: now } as any).where(and(eq(economy.serverId, server.id), eq(economy.userId, interaction.user.id)));
    if (Math.random() < successChance) {
      const stolen = Math.floor((victimAccount.balance || 0) * (Math.random() * 0.3 + 0.1));
      await adjustBalance(server.id, targetUser.id, -stolen, "rob", `Robbed by ${interaction.user.username}`);
      await adjustBalance(server.id, interaction.user.id, stolen, "rob", `Stole from ${targetUser.username}`);
      const embed = buildEmbed(`${currencySymbol} Robbery — Success!`, `You stole **${stolen} ${currencyName}** from **${targetUser.username}**!`, 0x22c55e);
      return interaction.reply({ embeds: [embed] });
    } else {
      const fine = Math.floor((robberAccount.balance || 0) * 0.15);
      await adjustBalance(server.id, interaction.user.id, -fine, "rob", `Rob fine — caught stealing from ${targetUser.username}`);
      const embed = buildEmbed(`${currencySymbol} Robbery — Caught!`, `You were caught trying to rob **${targetUser.username}** and paid a fine of **${fine} ${currencyName}**.`, 0xef4444);
      return interaction.reply({ embeds: [embed] });
    }
  }
}
