"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { useDashboardStore, type DashboardStats } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Send,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Instagram,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { stats, isLoading, error, setStats, setLoading, setError } =
    useDashboardStore();

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const data = await api.get<DashboardStats>("/api/stats");
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [setStats, setLoading, setError]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const campaignProgress = stats?.campaigns.total
    ? ((stats.campaigns.completed / stats.campaigns.total) * 100).toFixed(0)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-primary/5 border border-border p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background to-primary/5" />
        <div className="relative">
          <h2 className="text-2xl font-extralight mb-2 flex items-center gap-2">
            Ready to grow your reach? <Zap className="h-6 w-6 text-primary" />
          </h2>
          <p className="text-muted-foreground max-w-xl">
            Discover new leads, create targeted campaigns, and automate your
            Instagram outreach—all from one powerful dashboard.
          </p>
          <div className="flex gap-3 mt-6">
            <Link href="/dashboard/leads/discover">
              <Button className="bg-primary hover:bg-primary/90">
                <Users className="mr-2 h-4 w-4" />
                Find Leads
              </Button>
            </Link>
            <Link href="/dashboard/campaigns/new">
              <Button variant="outline">
                <Send className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <Zap className="h-40 w-40 text-primary" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={stats?.leads.total || 0}
          icon={Users}
          trend="+12%"
          trendUp
        />
        <StatCard
          title="Active Campaigns"
          value={stats?.campaigns.running || 0}
          icon={Send}
          subtitle={`${stats?.campaigns.paused || 0} paused`}
        />
        <StatCard
          title="Messages Today"
          value={stats?.todayMessages.sent || 0}
          icon={MessageSquare}
          subtitle={`${stats?.todayMessages.failed || 0} failed`}
        />
        <StatCard
          title="Success Rate"
          value={`${
            stats?.todayMessages.total
              ? (
                  ((stats?.todayMessages.sent || 0) /
                    stats?.todayMessages.total) *
                  100
                ).toFixed(0)
              : 0
          }%`}
          icon={TrendingUp}
        />
      </div>

      {/* Campaign Progress & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Campaign Overview */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Campaign Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{campaignProgress}%</span>
              </div>
              <Progress value={Number(campaignProgress)} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.campaigns.completed || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats?.campaigns.pending || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </div>

            <Link href="/dashboard/campaigns">
              <Button variant="outline" className="w-full">
                View All Campaigns
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px] pr-4">
              {stats?.recentLogs && stats.recentLogs.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 rounded-lg bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                    >
                      <StatusIcon status={log.status} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">@{log.leadUsername}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {log.campaign?.name || "Unknown campaign"}
                        </p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={log.status} />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(log.attemptedAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Instagram Accounts */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-primary" />
            Connected Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.instagramAccounts && stats.instagramAccounts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats.instagramAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-3 rounded-lg border border-border/50 p-4 transition-all hover:border-border hover:shadow-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Instagram className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">@{account.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.lastUsedAt
                        ? `Last used ${formatDistanceToNow(
                            new Date(account.lastUsedAt),
                            { addSuffix: true }
                          )}`
                        : "Never used"}
                    </p>
                  </div>
                  <Badge variant={account.isActive ? "success" : "secondary"}>
                    {account.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Instagram className="h-12 w-12 mb-2 opacity-50" />
              <p>No accounts connected</p>
              <Link href="/dashboard/accounts" className="mt-4">
                <Button variant="outline" size="sm">
                  Connect Account
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-light mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`text-xs mt-1 ${
                trendUp ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {trend} from last week
            </p>
          )}
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"
        >
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  const iconMap = {
    SENT: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    FAILED: <XCircle className="h-5 w-5 text-red-500" />,
    SKIPPED: <AlertCircle className="h-5 w-5 text-amber-500" />,
    PENDING: <Clock className="h-5 w-5 text-blue-500" />,
  };
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
      {iconMap[status as keyof typeof iconMap] || iconMap.PENDING}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, "success" | "destructive" | "warning" | "info"> = {
    SENT: "success",
    FAILED: "destructive",
    SKIPPED: "warning",
    PENDING: "info",
  };
  return <Badge variant={variantMap[status] || "secondary"}>{status}</Badge>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
