import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { buildApiUrl } from "@/lib/http";

export interface AuthUser {
  id: number;
  discordId: string;
  username: string;
  discriminator: string | null;
  avatar: string | null;
  email: string | null;
  isPremium: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export function useAuth() {
  return useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/auth/me"), { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to check auth");
      return await res.json();
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(buildApiUrl("/auth/logout"), { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      qc.setQueryData(["/api/auth/me"], null);
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      window.location.href = "/";
    },
  });
}

export function useGuilds() {
  return useQuery({
    queryKey: ["/api/auth/guilds"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/auth/guilds"), { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch guilds");
      return await res.json();
    },
    retry: false,
  });
}

export function usePremiumStatus() {
  return useQuery({
    queryKey: ["/api/premium/status"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/premium/status"), { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch premium status");
      return await res.json();
    },
    retry: false,
  });
}

export function getAvatarUrl(user: AuthUser): string {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=128`;
  }

  try {
    const defaultIndex = (BigInt(user.discordId) >> BigInt(22)) % BigInt(6);
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  } catch {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}
