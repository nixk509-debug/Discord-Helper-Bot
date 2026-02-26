import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 30_000;

function checkCooldown(userId: string, sub: string): number | null {
  const key = `${userId}:${sub}`;
  const last = cooldowns.get(key);
  if (last && Date.now() - last < COOLDOWN_MS) return Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000);
  cooldowns.set(key, Date.now());
  return null;
}

const ROASTS = [
  "Their code has more bugs than a rainforest.",
  "They still use Internet Explorer unironically.",
  "Their commit messages just say 'stuff'.",
  "They think git blame is a personal attack.",
  "They turned off type-checking because 'it slows them down'.",
  "They push directly to main without a PR.",
  "They copy-paste from Stack Overflow without reading it.",
  "Their PR descriptions are just the ticket number.",
  "They've never heard of a code review.",
  "Their idea of documentation is 'it works on my machine'.",
  "They name variables x1, x2, x3.",
  "They think 'delete everything and rewrite' is a refactor.",
  "They turn off linting because 'it's just suggestions'.",
  "Their functions are 500 lines long. Each.",
  "They use print debugging in production.",
  "Their entire codebase is in one file.",
  "They hardcode credentials. Always.",
  "They've never written a unit test.",
  "They think CI/CD stands for 'Can I Clone/Download?'",
  "Their error handling is just a comment saying 'TODO: fix later'.",
  "They use tabs AND spaces in the same file.",
];

const SKILL_ISSUES = [
  "Classic skill issue.",
  "Sounds like a skill issue to me.",
  "Have you tried getting good?",
  "That's a skill issue and you know it.",
  "Skill issue detected. Please recalibrate.",
  "Our monitoring detected elevated skill issues in your vicinity.",
  "Touch skill, acquire brain, become good.",
  "The skill issue is coming from inside the user.",
];

const COPIUM = [
  "Next patch it'll definitely be different.",
  "I wasn't trying anyway.",
  "They were camping, it doesn't count.",
  "My team held me back.",
  "Lag. Definitely lag.",
  "I let them win out of generosity.",
  "I was testing a new strategy.",
  "That was actually intended.",
  "I could've won if I wanted to.",
  "It's a character flaw in society, not me.",
];

function rollDice(expr: string): { result: number; breakdown: string } | null {
  const match = expr.trim().toLowerCase().match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return null;
  const count = Math.min(parseInt(match[1]), 100);
  const sides = Math.min(parseInt(match[2]), 1000);
  const modifier = match[3] ? parseInt(match[3]) : 0;
  if (count < 1 || sides < 1) return null;
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) rolls.push(Math.floor(Math.random() * sides) + 1);
  const sum = rolls.reduce((a, b) => a + b, 0);
  const result = sum + modifier;
  const breakdown = `[${rolls.join(", ")}]${modifier !== 0 ? ` ${modifier > 0 ? "+" : ""}${modifier}` : ""} = **${result}**`;
  return { result, breakdown };
}

export const funCommand = new SlashCommandBuilder()
  .setName("fun")
  .setDescription("Fun commands to entertain your server")
  .addSubcommand(sub => sub.setName("judge").setDescription("Get a judgment on a user").addUserOption(o => o.setName("user").setDescription("User to judge").setRequired(true)))
  .addSubcommand(sub => sub.setName("skillissue").setDescription("Diagnose someone's skill issue").addUserOption(o => o.setName("user").setDescription("User to diagnose").setRequired(true)))
  .addSubcommand(sub => sub.setName("copium").setDescription("Get a fresh hit of copium"))
  .addSubcommand(sub => sub.setName("roll").setDescription("Roll dice").addStringOption(o => o.setName("expression").setDescription("Dice expression (e.g. 2d6+3)").setRequired(true)))
  .addSubcommand(sub => sub.setName("pick").setDescription("Pick a random option").addStringOption(o => o.setName("options").setDescription("Comma-separated options").setRequired(true)));

export async function handleFunCommand(interaction: any) {
  const sub = interaction.options.getSubcommand();
  const remaining = checkCooldown(interaction.user.id, sub);
  if (remaining !== null) {
    return interaction.reply({ content: `Cooldown active. Try again in **${remaining}s**.`, ephemeral: true });
  }

  const embed = new EmbedBuilder().setColor(0xc0392b);

  if (sub === "judge") {
    const target = interaction.options.getUser("user");
    const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
    embed.setTitle(`⚖️ Judgment: ${target.username}`).setDescription(roast);
  } else if (sub === "skillissue") {
    const target = interaction.options.getUser("user");
    const msg = SKILL_ISSUES[Math.floor(Math.random() * SKILL_ISSUES.length)];
    embed.setTitle(`🔎 Skill Issue Analysis: ${target.username}`).setDescription(msg);
  } else if (sub === "copium") {
    const msg = COPIUM[Math.floor(Math.random() * COPIUM.length)];
    embed.setTitle("🫁 Copium Dispensed").setDescription(`*"${msg}"*`);
  } else if (sub === "roll") {
    const expr = interaction.options.getString("expression");
    const result = rollDice(expr);
    if (!result) {
      return interaction.reply({ content: "Invalid dice expression. Use format like `2d6`, `1d20+5`, etc.", ephemeral: true });
    }
    embed.setTitle(`🎲 Dice Roll: ${expr}`).setDescription(result.breakdown);
  } else if (sub === "pick") {
    const opts = interaction.options.getString("options").split(",").map((s: string) => s.trim()).filter(Boolean);
    if (opts.length < 2) return interaction.reply({ content: "Please provide at least 2 comma-separated options.", ephemeral: true });
    const chosen = opts[Math.floor(Math.random() * opts.length)];
    embed.setTitle("🎯 Archivist Picks").setDescription(`**${chosen}**`).setFooter({ text: `From: ${opts.join(", ")}` });
  }

  await interaction.reply({ embeds: [embed] });
}
