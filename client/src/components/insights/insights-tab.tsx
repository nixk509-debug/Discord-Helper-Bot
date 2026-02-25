import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { BarChart2, Activity, Users, MessageSquare, TrendingUp, Zap } from "lucide-react";
import { useMemo } from "react";

interface ServerInsight {
  id: number;
  serverId: number;
  date: string;
  messageCount: number;
  memberCount: number;
  memberJoins: number;
  memberLeaves: number;
  commandsUsed: number;
  topChannels: { channelId: string; channelName: string; count: number }[];
  hourlyActivity: number[];
  weekdayActivity: number[];
  createdAt: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return "12am";
  if (i < 12) return `${i}am`;
  if (i === 12) return "12pm";
  return `${i - 12}pm`;
});

function getHeatmapColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "hsl(0, 6%, 10%)";
  const intensity = value / max;
  if (intensity < 0.2) return "hsl(0, 30%, 15%)";
  if (intensity < 0.4) return "hsl(0, 50%, 22%)";
  if (intensity < 0.6) return "hsl(0, 60%, 30%)";
  if (intensity < 0.8) return "hsl(0, 65%, 38%)";
  return "hsl(0, 72%, 51%)";
}

interface InsightsTabProps {
  serverId: number;
}

export function InsightsTab({ serverId }: InsightsTabProps) {
  const { data: insights, isLoading } = useQuery<ServerInsight[]>({
    queryKey: ["/api/servers", serverId, "insights"],
    queryFn: async () => {
      const res = await fetch(`/api/servers/${serverId}/insights`);
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    },
  });

  const heatmapData = useMemo(() => {
    if (!insights || insights.length === 0) return { grid: [], max: 0 };
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    insights.forEach((insight) => {
      const d = new Date(insight.date);
      const dayIdx = d.getDay();
      if (insight.hourlyActivity && insight.hourlyActivity.length === 24) {
        insight.hourlyActivity.forEach((count, h) => {
          grid[dayIdx][h] += count;
        });
      }
    });
    const max = Math.max(...grid.flat());
    return { grid, max };
  }, [insights]);

  const memberGrowthData = useMemo(() => {
    if (!insights) return [];
    return [...insights]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((ins) => ({
        date: ins.date.slice(5),
        joins: ins.memberJoins,
        leaves: ins.memberLeaves,
        total: ins.memberCount,
      }));
  }, [insights]);

  const commandData = useMemo(() => {
    if (!insights) return [];
    const commandsByChannel: Record<string, number> = {};
    insights.forEach((ins) => {
      (ins.topChannels || []).forEach((ch) => {
        commandsByChannel[ch.channelName] = (commandsByChannel[ch.channelName] || 0) + ch.count;
      });
    });
    return Object.entries(commandsByChannel)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [insights]);

  const engagementScore = useMemo(() => {
    if (!insights || insights.length === 0) return 0;
    const avgMessages = insights.reduce((s, i) => s + (i.messageCount || 0), 0) / insights.length;
    const avgCommands = insights.reduce((s, i) => s + (i.commandsUsed || 0), 0) / insights.length;
    const avgMembers = insights.reduce((s, i) => s + (i.memberCount || 0), 0) / insights.length;
    const msgScore = Math.min(40, (avgMessages / 500) * 40);
    const cmdScore = Math.min(30, (avgCommands / 100) * 30);
    const memberScore = Math.min(30, (avgMembers / 1000) * 30);
    return Math.round(msgScore + cmdScore + memberScore);
  }, [insights]);

  const topMembers = useMemo(() => {
    if (!insights || insights.length === 0) return [];
    const recent = insights.slice(0, 7);
    const channels = recent.flatMap((i) => i.topChannels || []);
    const byChannel: Record<string, number> = {};
    channels.forEach((ch) => {
      byChannel[ch.channelName] = (byChannel[ch.channelName] || 0) + ch.count;
    });
    return Object.entries(byChannel)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [insights]);

  const totalMessages = useMemo(() => insights?.reduce((s, i) => s + (i.messageCount || 0), 0) ?? 0, [insights]);
  const totalCommands = useMemo(() => insights?.reduce((s, i) => s + (i.commandsUsed || 0), 0) ?? 0, [insights]);
  const avgDailyJoins = useMemo(() => insights ? Math.round(insights.reduce((s, i) => s + (i.memberJoins || 0), 0) / Math.max(insights.length, 1)) : 0, [insights]);
  const latestMemberCount = useMemo(() => insights?.length ? insights[0].memberCount : 0, [insights]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-white/5" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl bg-white/5" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl bg-white/5" />
          <Skeleton className="h-64 rounded-xl bg-white/5" />
        </div>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (engagementScore / 100) * circumference;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card" data-testid="card-total-messages">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Messages (30d)</span>
            </div>
            <p className="text-2xl font-display font-bold" data-testid="text-total-messages">{totalMessages.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card" data-testid="card-total-commands">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Commands (30d)</span>
            </div>
            <p className="text-2xl font-display font-bold" data-testid="text-total-commands">{totalCommands.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card" data-testid="card-member-count">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Members</span>
            </div>
            <p className="text-2xl font-display font-bold" data-testid="text-member-count">{latestMemberCount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card" data-testid="card-avg-joins">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg Daily Joins</span>
            </div>
            <p className="text-2xl font-display font-bold" data-testid="text-avg-joins">{avgDailyJoins}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card" data-testid="card-heatmap">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Activity Heatmap
          </CardTitle>
          <CardDescription>Average message activity by day of week and hour of day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="flex gap-1 mb-1 ml-10">
                {HOURS.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 text-center text-[9px] text-muted-foreground"
                    style={{ minWidth: 20 }}
                  >
                    {i % 3 === 0 ? h : ""}
                  </div>
                ))}
              </div>
              {DAYS.map((day, dayIdx) => (
                <div key={dayIdx} className="flex items-center gap-1 mb-1">
                  <div className="w-9 text-right text-[10px] text-muted-foreground pr-1 shrink-0">{day}</div>
                  {Array.from({ length: 24 }, (_, h) => {
                    const val = heatmapData.grid[dayIdx]?.[h] ?? 0;
                    const color = getHeatmapColor(val, heatmapData.max);
                    return (
                      <div
                        key={h}
                        className="flex-1 rounded-sm cursor-default group relative"
                        style={{ minWidth: 20, height: 20, backgroundColor: color }}
                        data-testid={`cell-heatmap-${dayIdx}-${h}`}
                      >
                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-md bg-popover text-popover-foreground text-[10px] whitespace-nowrap invisible group-hover:visible pointer-events-none shadow-lg border border-border">
                          {day} {HOURS[h]} — {val} msgs
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className="flex items-center gap-2 mt-3 ml-10">
                <span className="text-xs text-muted-foreground">Less</span>
                {["hsl(0,6%,10%)", "hsl(0,30%,15%)", "hsl(0,50%,22%)", "hsl(0,60%,30%)", "hsl(0,65%,38%)", "hsl(0,72%,51%)"].map((c, i) => (
                  <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: c }} />
                ))}
                <span className="text-xs text-muted-foreground">More</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="glass-card" data-testid="card-member-growth">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Member Growth (30 days)
              </CardTitle>
              <CardDescription>Daily joins and leaves over the past 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={memberGrowthData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorJoins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorLeaves" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 5% 55%)" }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(0 5% 55%)" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(0,6%,9%)", border: "1px solid hsl(0,6%,18%)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "hsl(0,0%,95%)" }}
                  />
                  <Area type="monotone" dataKey="joins" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#colorJoins)" name="Joins" />
                  <Area type="monotone" dataKey="leaves" stroke="hsl(0, 72%, 51%)" strokeWidth={2} fill="url(#colorLeaves)" name="Leaves" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card" data-testid="card-engagement">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              Engagement Score
            </CardTitle>
            <CardDescription>Based on messages, commands, and member activity</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-2">
            <svg width={140} height={100} viewBox="0 0 140 100" data-testid="svg-engagement-gauge">
              <path
                d="M 15 90 A 55 55 0 0 1 125 90"
                fill="none"
                stroke="hsl(0, 6%, 18%)"
                strokeWidth={12}
                strokeLinecap="round"
              />
              <path
                d="M 15 90 A 55 55 0 0 1 125 90"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={`${(engagementScore / 100) * 173} 173`}
              />
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(0, 72%, 51%)" />
                  <stop offset="100%" stopColor="hsl(340, 75%, 55%)" />
                </linearGradient>
              </defs>
              <text x="70" y="82" textAnchor="middle" fontSize={28} fontWeight="bold" fill="hsl(0,0%,95%)" fontFamily="var(--font-display)">
                {engagementScore}
              </text>
            </svg>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-engagement-label">
              {engagementScore >= 75 ? "Excellent" : engagementScore >= 50 ? "Good" : engagementScore >= 25 ? "Fair" : "Low"} engagement
            </p>
            <div className="w-full mt-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Messages / day</span>
                <span className="font-medium text-foreground">{Math.round(totalMessages / 30)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Commands / day</span>
                <span className="font-medium text-foreground">{Math.round(totalCommands / 30)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Avg joins / day</span>
                <span className="font-medium text-foreground">{avgDailyJoins}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card" data-testid="card-channel-activity">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              Top Active Channels
            </CardTitle>
            <CardDescription>Message counts by channel over 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={commandData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(0 5% 55%)" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(0 5% 55%)" }} tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  contentStyle={{ background: "hsl(0,6%,9%)", border: "1px solid hsl(0,6%,18%)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "hsl(0,0%,95%)" }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Messages">
                  {commandData.map((_, i) => (
                    <Cell key={i} fill={`hsl(0, ${72 - i * 4}%, ${51 - i * 2}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card" data-testid="card-top-members">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Top Active Channels (Week)
            </CardTitle>
            <CardDescription>Most active channels in the past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mt-1">
              {topMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No data available</p>
              ) : (
                topMembers.map((member, i) => {
                  const max = topMembers[0].count;
                  const pct = max > 0 ? (member.count / max) * 100 : 0;
                  return (
                    <div key={i} className="space-y-1" data-testid={`row-top-member-${i}`}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium truncate">{member.name}</span>
                        <Badge variant="secondary" className="text-xs shrink-0 ml-2">{member.count.toLocaleString()} msgs</Badge>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full gradient-brand"
                          style={{ width: `${pct}%` }}
                          data-testid={`bar-top-member-${i}`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
