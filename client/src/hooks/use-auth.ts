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
  ownerAccess?: boolean;
  ownerSession?: boolean;
  ownerServerIds?: number[] | null;
  qaBypass?: boolean;
  qaServerId?: number | null;
}

export interface AuthOptions {
  discordLoginEnabled: boolean;
  ownerLoginEnabled: boolean;
}

export interface OwnerLoginResult {
  success: true;
  redirectTo: string;
  user: AuthUser | null;
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

export function useAuthOptions() {
  return useQuery<AuthOptions>({
    queryKey: ["/api/auth/options"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/auth/options"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch auth options");
      return await res.json();
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useOwnerLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await fetch(buildApiUrl("/auth/owner-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Owner login failed");
      }
      const loginResult = await res.json() as { success: true; redirectTo: string };
      const meResponse = await fetch(buildApiUrl("/api/auth/me"), { credentials: "include" });
      const user = meResponse.ok ? await meResponse.json() as AuthUser : null;

      return {
        ...loginResult,
        user,
      } satisfies OwnerLoginResult;
    },
    onSuccess: (result) => {
      qc.setQueryData(["/api/auth/me"], result.user);
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      qc.invalidateQueries({ queryKey: ["/api/auth/guilds"] });
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
