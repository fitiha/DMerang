"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAccountsStore, useLeadsStore, type InstagramAccount, type Lead } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Loader2, Users, MessageSquare, Clock, ChevronLeft } from "lucide-react";
import Link from "next/link";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedLeads = searchParams.get("leads")?.split(",") || [];

  const { accounts, setAccounts } = useAccountsStore();
  const { leads, setLeads } = useLeadsStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
    new Set(preselectedLeads)
  );

  const [formData, setFormData] = useState({
    name: "",
    instagramAccountId: "",
    messageTemplate: "Hey {{name}}! 👋\n\nI noticed you're interested in [topic]. I'd love to connect and share some insights that might help you.\n\nWould you be open to a quick chat?",
    timezone: "UTC",
    workingHoursStart: 9,
    workingHoursEnd: 17,
    dailyLimit: 50,
    minDelaySeconds: 30,
    maxDelaySeconds: 120,
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [accountsData, leadsData] = await Promise.all([
        api.get<InstagramAccount[]>("/api/instagram-accounts"),
        api.get<{ leads: Lead[] }>("/api/leads", { limit: 500 }),
      ]);
      setAccounts(accountsData);
      setLeads(leadsData.leads);
      
      const activeAccount = accountsData.find((a) => a.isActive);
      if (activeAccount) {
        setFormData((prev) => ({ ...prev, instagramAccountId: activeAccount.id }));
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  }

  const toggleLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllLeads = () => {
    setSelectedLeadIds(new Set(leads.map((l) => l.id)));
  };

  const clearLeadSelection = () => {
    setSelectedLeadIds(new Set());
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedLeadIds.size === 0) {
      setError("Please select at least one lead");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await api.post("/api/campaigns", {
        ...formData,
        leadIds: Array.from(selectedLeadIds),
      });
      router.push("/dashboard/campaigns");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setIsLoading(false);
    }
  }

  const activeAccounts = accounts.filter((a) => a.isActive);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/campaigns">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Campaign</h1>
          <p className="text-muted-foreground">
            Set up a new DM outreach campaign
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-purple-500" />
              Campaign Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  placeholder="Q1 Outreach Campaign"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Instagram Account</Label>
                <Select
                  value={formData.instagramAccountId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, instagramAccountId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        @{account.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Template */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-500" />
              Message Template
            </CardTitle>
            <CardDescription>
              Use placeholders: {"{{username}}"}, {"{{name}}"}, {"{{firstName}}"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.messageTemplate}
              onChange={(e) =>
                setFormData({ ...formData, messageTemplate: e.target.value })
              }
              className="min-h-[150px]"
              placeholder="Write your message template..."
              required
            />
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              Schedule & Limits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) =>
                    setFormData({ ...formData, timezone: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Working Hours</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={formData.workingHoursStart}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        workingHoursStart: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-20"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={formData.workingHoursEnd}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        workingHoursEnd: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Daily Limit</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={formData.dailyLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dailyLimit: parseInt(e.target.value) || 50,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Delay (seconds)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={10}
                    max={600}
                    value={formData.minDelaySeconds}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minDelaySeconds: parseInt(e.target.value) || 30,
                      })
                    }
                    className="w-20"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    min={30}
                    max={1800}
                    value={formData.maxDelaySeconds}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxDelaySeconds: parseInt(e.target.value) || 120,
                      })
                    }
                    className="w-20"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Selection */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Select Leads ({selectedLeadIds.size} selected)
              </CardTitle>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllLeads}>
                  Select All
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearLeadSelection}>
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No leads available</p>
                <Link href="/dashboard/leads/discover" className="mt-2 inline-block">
                  <Button variant="link">Discover leads first</Button>
                </Link>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {leads.map((lead) => (
                    <div
                      key={lead.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        selectedLeadIds.has(lead.id)
                          ? "border-purple-500/50 bg-purple-500/5"
                          : "border-border/50 hover:border-border"
                      }`}
                      onClick={() => toggleLead(lead.id)}
                    >
                      <Checkbox
                        checked={selectedLeadIds.has(lead.id)}
                        onCheckedChange={() => toggleLead(lead.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">@{lead.username}</p>
                        {lead.bio && (
                          <p className="text-sm text-muted-foreground truncate">
                            {lead.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="submit"
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            disabled={isLoading || !formData.instagramAccountId || selectedLeadIds.size === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Create Campaign
              </>
            )}
          </Button>
          <Link href="/dashboard/campaigns">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
