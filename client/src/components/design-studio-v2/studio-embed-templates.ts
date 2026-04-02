import type { StudioEmbedDraft } from "@shared/schema";

export interface EmbedTemplate {
  id: string;
  label: string;
  description: string;
  emoji: string;
  apply: () => Partial<StudioEmbedDraft>;
}

export const EMBED_TEMPLATES: EmbedTemplate[] = [
  {
    id: "announcement",
    label: "Announcement",
    description: "Bold headline with timestamp",
    emoji: "📢",
    apply: () => ({
      title: "📢 Announcement",
      description: "Write your announcement here. Keep it clear and to the point — members read quickly.",
      color: "#E0001A",
      timestamp: true,
      footerText: "{server.name}",
    }),
  },
  {
    id: "welcome",
    label: "Welcome",
    description: "Greet new members by name",
    emoji: "👋",
    apply: () => ({
      title: "Welcome to {server.name}!",
      description: "Hey {user.mention}, glad you're here! Read the rules, grab some roles, and enjoy your stay.",
      color: "#22c55e",
      authorName: "{server.name}",
      footerText: "Member #{server.memberCount}",
      timestamp: true,
    }),
  },
  {
    id: "rules",
    label: "Rules",
    description: "Clean numbered rule list",
    emoji: "📋",
    apply: () => ({
      title: "📋 Server Rules",
      description:
        "**1.** Be respectful to all members.\n**2.** No spam or self-promotion.\n**3.** Keep content in the right channels.\n**4.** Follow Discord's Terms of Service.\n**5.** Listen to staff decisions.",
      color: "#1e293b",
      footerText: "Last updated · {date}",
    }),
  },
  {
    id: "info",
    label: "Info Card",
    description: "Author + thumbnail layout",
    emoji: "ℹ️",
    apply: () => ({
      title: "About This Server",
      description: "Write a short description of your server here. What is it about? What can members expect?",
      color: "#6366f1",
      authorName: "{server.name}",
      thumbnailUrl: "",
      footerText: "{server.name} · {date}",
    }),
  },
  {
    id: "alert",
    label: "Alert",
    description: "Red warning message",
    emoji: "⚠️",
    apply: () => ({
      title: "⚠️ Attention Required",
      description: "**Something needs your attention.** Describe the issue clearly here so members know what action to take.",
      color: "#ef4444",
      timestamp: true,
    }),
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Clean base, description only",
    emoji: "✨",
    apply: () => ({
      title: "",
      description: "Write your message here.",
      color: "#ffffff",
    }),
  },
];
