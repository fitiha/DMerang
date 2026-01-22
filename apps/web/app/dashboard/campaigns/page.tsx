"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCampaignsStore, type Campaign } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send,
  Play,
  Pause,
  Square,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function CampaignsPage() {
  const { campaigns, isLoading, setCampaigns, updateCampaignStatus, setLoading } =
    useCampaignsStore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    setLoading(true);
    try {
      const data = await api.get<{ campaigns: Campaign[] }>("/api/campaigns");
      setCampaigns(data.campaigns);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: "RUNNING" | "PAUSED" | "STOPPED") {
    setUpdatingId(id);
    try {
      await api.patch(`/api/campaigns/${id}/status`, { status });
      updateCampaignStatus(id, status);
    } catch (err) {
      console.error("Failed to update campaign:", err);
    } finally {
      setUpdatingId(null);
    }
  }

  const statusGroups = {
    active: campaigns.filter((c) => ["RUNNING", "PAUSED"].includes(c.status)),
    pending: campaigns.filter((c) => c.status === "PENDING"),
    completed: campaigns.filter((c) => ["COMPLETED", "STOPPED"].includes(c.status)),
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage your DM outreach campaigns
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Send className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No campaigns yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Create your first campaign to start sending DMs
            </p>
            <Link href="/dashboard/campaigns/new" className="mt-4">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Active Campaigns */}
          {statusGroups.active.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Campaigns
              </h2>
              <div className="grid gap-4">
                {statusGroups.active.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onStatusChange={handleStatusChange}
                    isUpdating={updatingId === campaign.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Pending Campaigns */}
          {statusGroups.pending.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Pending Campaigns
              </h2>
              <div className="grid gap-4">
                {statusGroups.pending.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onStatusChange={handleStatusChange}
                    isUpdating={updatingId === campaign.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed Campaigns */}
          {statusGroups.completed.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                Completed
              </h2>
              <div className="grid gap-4">
                {statusGroups.completed.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onStatusChange={handleStatusChange}
                    isUpdating={updatingId === campaign.id}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function CampaignCard({
  campaign,
  onStatusChange,
  isUpdating,
}: {
  campaign: Campaign;
  onStatusChange: (id: string, status: "RUNNING" | "PAUSED" | "STOPPED") => void;
  isUpdating: boolean;
}) {
  const totalLeads = campaign._count?.campaignLeads || 0;
  const processed = campaign.sentCount + campaign.failedCount + campaign.skippedCount;
  const progress = totalLeads > 0 ? (processed / totalLeads) * 100 : 0;

  const statusConfig = {
    PENDING: { variant: "info" as const, label: "Pending" },
    RUNNING: { variant: "success" as const, label: "Running" },
    PAUSED: { variant: "warning" as const, label: "Paused" },
    COMPLETED: { variant: "secondary" as const, label: "Completed" },
    STOPPED: { variant: "secondary" as const, label: "Stopped" },
  };

  const canStart = campaign.status === "PENDING" || campaign.status === "PAUSED";
  const canPause = campaign.status === "RUNNING";
  const canStop = campaign.status === "RUNNING" || campaign.status === "PAUSED";

  return (
    <Card className="glass hover:border-border transition-colors">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Campaign Info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">{campaign.name}</h3>
              <Badge variant={statusConfig[campaign.status].variant}>
                {statusConfig[campaign.status].label}
              </Badge>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>@{campaign.instagramAccount?.username}</span>
              <span>{totalLeads} leads</span>
              <span>{campaign.dailyLimit}/day limit</span>
              <span>
                {campaign.workingHoursStart}:00 - {campaign.workingHoursEnd}:00 ({campaign.timezone})
              </span>
            </div>

            {/* Progress */}
            <div className="space-y-1 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span>
                  {processed}/{totalLeads} ({progress.toFixed(0)}%)
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Stats */}
            <div className="flex gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Sent:</span>
                <span className="font-medium">{campaign.sentCount}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Failed:</span>
                <span className="font-medium">{campaign.failedCount}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">Skipped:</span>
                <span className="font-medium">{campaign.skippedCount}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {canStart && (
              <Button
                size="sm"
                onClick={() => onStatusChange(campaign.id, "RUNNING")}
                disabled={isUpdating}
              >
                <Play className="mr-1 h-4 w-4" />
                {campaign.status === "PENDING" ? "Start" : "Resume"}
              </Button>
            )}
            {canPause && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onStatusChange(campaign.id, "PAUSED")}
                disabled={isUpdating}
              >
                <Pause className="mr-1 h-4 w-4" />
                Pause
              </Button>
            )}
            {canStop && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(campaign.id, "STOPPED")}
                disabled={isUpdating}
              >
                <Square className="mr-1 h-4 w-4" />
                Stop
              </Button>
            )}
            <Link href={`/dashboard/campaigns/${campaign.id}`}>
              <Button size="sm" variant="ghost">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
