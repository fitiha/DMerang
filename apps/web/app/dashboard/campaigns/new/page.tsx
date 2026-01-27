"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { TIMEZONES, get12HourOptions } from "@/lib/timezones";
import { useAccountsStore, useLeadsStore, useTemplatesStore, type InstagramAccount, type Lead, type MessageTemplate } from "@/lib/store";
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
import { Send, Loader2, Users, MessageSquare, Clock, ChevronLeft, Filter } from "lucide-react";
import Link from "next/link";

import { Suspense } from "react";

function NewCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedLeads = searchParams.get("leads")?.split(",") || [];

  const { accounts, setAccounts } = useAccountsStore();
  const { leads, setLeads } = useLeadsStore();
  const { templates, setTemplates } = useTemplatesStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
    new Set(preselectedLeads)
  );
  const [sourceFilter, setSourceFilter] = useState<string>("all");

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
      const [accountsData, leadsData, templatesData] = await Promise.all([
        api.get<InstagramAccount[]>("/api/instagram-accounts"),
        api.get<{ leads: Lead[] }>("/api/leads", { limit: 500 }),
        api.get<MessageTemplate[]>("/api/message-templates"),
      ]);
      setAccounts(accountsData);
      setLeads(leadsData.leads);
      setTemplates(templatesData);
      
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
    const leadsToSelect = sourceFilter === "all" ? leads : leads.filter((l) => l.sourceHandle === sourceFilter);
    setSelectedLeadIds(new Set(leadsToSelect.map((l) => l.id)));
  };

  const selectBySource = (source: string) => {
    const sourceLeads = leads.filter((l) => l.sourceHandle === source);
    setSelectedLeadIds(new Set(sourceLeads.map((l) => l.id)));
  };

  // Get unique sources
  const sources = Array.from(new Set(leads.map((l) => l.sourceHandle))).filter(Boolean);

  // Filter leads by source
  const filteredLeads = sourceFilter === "all" ? leads : leads.filter((l) => l.sourceHandle === sourceFilter);

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
              <Send className="h-5 w-5 text-primary" />
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
                {activeAccounts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    No active Instagram accounts. Please add one first.
                  </div>
                ) : formData.instagramAccountId ? (
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
                ) : (
                  <div className="rounded-lg border border-border p-4 text-center text-sm text-muted-foreground">
                    Loading accounts...
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Template */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Message Template
              </CardTitle>
              <Select
                onValueChange={(value) => {
                  const template = templates.find((t) => t.id === value);
                  if (template) {
                    setFormData({ ...formData, messageTemplate: template.content });
                  }
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Load template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Clock className="h-5 w-5 text-primary" />
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
                  <Select
                    value={formData.workingHoursStart.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, workingHoursStart: parseInt(value) })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {get12HourOptions().map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground">to</span>
                  <Select
                    value={formData.workingHoursEnd.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, workingHoursEnd: parseInt(value) })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {get12HourOptions().map((opt) => (
                        <SelectItem key={opt.value} value={opt.value.toString()}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Users className="h-5 w-5 text-primary" />
                Select Leads ({selectedLeadIds.size} selected)
              </CardTitle>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllLeads}>
                  Select All {sourceFilter !== "all" && "Filtered"}
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
              <>
                {/* Source Filter */}
                <div className="mb-4 flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Filter by source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources ({leads.length})</SelectItem>
                      {sources.map((source) => (
                        <SelectItem key={source} value={source}>
                          @{source} ({leads.filter((l) => l.sourceHandle === source).length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {filteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                        selectedLeadIds.has(lead.id)
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/50 hover:border-border"
                      }`}
                    >
                      <Checkbox
                        checked={selectedLeadIds.has(lead.id)}
                        onCheckedChange={() => toggleLead(lead.id)}
                      />
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleLead(lead.id)}>
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
              </>
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
            className="flex-1 bg-primary hover:bg-primary/90"
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

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <NewCampaignContent />
    </Suspense>
  );
}
