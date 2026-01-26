"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Square,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface CampaignDetails {
  id: string;
  name: string;
  status: string;
  messageTemplate: string;
  timezone: string;
  workingHoursStart: number;
  workingHoursEnd: number;
  dailyLimit: number;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  instagramAccount: {
    username: string;
  };
  campaignLeads: Array<{
    id: string;
    status: string;
    processedAt?: string;
    lead: {
      username: string;
      fullName?: string;
      bio?: string;
    };
  }>;
  dmLogs: Array<{
    id: string;
    leadUsername: string;
    status: string;
    errorMessage?: string;
    attemptedAt: string;
  }>;
  _count: {
    campaignLeads: number;
  };
}

export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchCampaign();
  }, [params.id]);

  async function fetchCampaign() {
    setIsLoading(true);
    try {
      const data = await api.get<CampaignDetails>(`/api/campaigns/${params.id}`);
      setCampaign(data);
    } catch (err) {
      console.error("Failed to fetch campaign:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStatusChange(status: "RUNNING" | "PAUSED" | "STOPPED") {
    if (!campaign) return;
    setIsUpdating(true);
    try {
      await api.patch(`/api/campaigns/${campaign.id}/status`, { status });
      await fetchCampaign();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Campaign not found</h2>
        <Link href="/dashboard/campaigns" className="mt-4">
          <Button variant="outline">Back to Campaigns</Button>
        </Link>
      </div>
    );
  }

  const totalLeads = campaign._count?.campaignLeads || campaign.campaignLeads?.length || 0;
  const processed = campaign.sentCount + campaign.failedCount + campaign.skippedCount;
  const progress = totalLeads > 0 ? (processed / totalLeads) * 100 : 0;

  const statusConfig: Record<string, { variant: any; label: string }> = {
    PENDING: { variant: "info", label: "Pending" },
    RUNNING: { variant: "success", label: "Running" },
    PAUSED: { variant: "warning", label: "Paused" },
    COMPLETED: { variant: "secondary", label: "Completed" },
    STOPPED: { variant: "secondary", label: "Stopped" },
  };

  const canStart = campaign.status === "PENDING" || campaign.status === "PAUSED";
  const canPause = campaign.status === "RUNNING";
  const canStop = campaign.status === "RUNNING" || campaign.status === "PAUSED";

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/campaigns">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge variant={statusConfig[campaign.status].variant}>
              {statusConfig[campaign.status].label}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Campaign details and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          {canStart && (
            <Button onClick={() => handleStatusChange("RUNNING")} disabled={isUpdating}>
              <Play className="mr-2 h-4 w-4" />
              {campaign.status === "PENDING" ? "Start" : "Resume"}
            </Button>
          )}
          {canPause && (
            <Button
              variant="secondary"
              onClick={() => handleStatusChange("PAUSED")}
              disabled={isUpdating}
            >
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          )}
          {canStop && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("STOPPED")}
              disabled={isUpdating}
            >
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {campaign.sentCount}
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {campaign.failedCount}
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="glass">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Campaign Progress</span>
              <span>
                {processed}/{totalLeads} leads processed
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Campaign Settings */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Campaign Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Instagram Account</p>
              <p className="font-medium">@{campaign.instagramAccount.username}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Daily Limit</p>
              <p className="font-medium">{campaign.dailyLimit} messages/day</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Working Hours</p>
              <p className="font-medium">
                {campaign.workingHoursStart}:00 - {campaign.workingHoursEnd}:00 ({campaign.timezone})
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Delay Between Messages</p>
              <p className="font-medium">
                {campaign.minDelaySeconds}s - {campaign.maxDelaySeconds}s
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Message Template</p>
            <div className="rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap font-mono">
              {campaign.messageTemplate}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaign.dmLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No activity yet
                    </TableCell>
                  </TableRow>
                ) : (
                  campaign.dmLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">@{log.leadUsername}</TableCell>
                      <TableCell>
                        {log.status === "SENT" ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(log.attemptedAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.errorMessage || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
