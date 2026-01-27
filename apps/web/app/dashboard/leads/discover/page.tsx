"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAccountsStore, type InstagramAccount } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, Users, Filter, X, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ScrapedLead {
  id: string;
  username: string;
  fullName?: string;
  bio?: string;
  profileUrl: string;
}

interface ScrapeResult {
  success: boolean;
  scrapedCount: number;
  savedCount: number;
  leads: ScrapedLead[];
}

export default function DiscoverLeadsPage() {
  const router = useRouter();
  const { accounts, setAccounts, setLoading: setAccountsLoading } = useAccountsStore();
  
  const [targetUsername, setTargetUsername] = useState("");
  const [maxLeads, setMaxLeads] = useState(100);
  const [includeKeywords, setIncludeKeywords] = useState("");
  const [excludeKeywords, setExcludeKeywords] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    setAccountsLoading(true);
    try {
      const data = await api.get<InstagramAccount[]>("/api/instagram-accounts");
      setAccounts(data);
      if (data.length > 0 && !selectedAccount) {
        setSelectedAccount(data.find(a => a.isActive)?.id || data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    } finally {
      setAccountsLoading(false);
    }
  }

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount || !targetUsername) return;

    setIsLoading(true);
    setError("");
    setResult(null);
    setProgress(0);

    // Simulate progress since we don't have real-time updates
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(90, p + Math.random() * 10));
    }, 1000);

    try {
      const data = await api.post<ScrapeResult>("/api/leads/scrape", {
        targetUsername: targetUsername.replace("@", ""),
        maxLeads,
        bioIncludeKeywords: includeKeywords
          ? includeKeywords.split(",").map((k) => k.trim())
          : undefined,
        bioExcludeKeywords: excludeKeywords
          ? excludeKeywords.split(",").map((k) => k.trim())
          : undefined,
        instagramAccountId: selectedAccount,
      });

      clearInterval(progressInterval);
      setProgress(100);
      setResult(data);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : "Scraping failed");
    } finally {
      setIsLoading(false);
    }
  }

  const activeAccounts = accounts.filter((a) => a.isActive);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Discover Leads</h1>
        <p className="text-muted-foreground">
          Scrape followers from target Instagram accounts
        </p>
      </div>

      {/* Scraping Form */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Scrape Followers
          </CardTitle>
          <CardDescription>
            Enter a target account to scrape their followers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScrape} className="space-y-6">
            {/* Account Selection */}
            <div className="space-y-2">
              <Label>Instagram Account</Label>
              {activeAccounts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No active Instagram accounts.
                  </p>
                  <Button
                    variant="link"
                    className="mt-1"
                    onClick={() => router.push("/dashboard/accounts")}
                  >
                    Connect an account
                  </Button>
                </div>
              ) : (
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        @{account.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Target Username */}
            <div className="space-y-2">
              <Label htmlFor="target">Target Account</Label>
              <Input
                id="target"
                placeholder="@competitor_account"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                The account whose followers you want to scrape
              </p>
            </div>

            {/* Max Leads */}
            <div className="space-y-2">
              <Label htmlFor="maxLeads">Maximum Leads</Label>
              <Input
                id="maxLeads"
                type="number"
                min={1}
                max={1000}
                value={maxLeads}
                onChange={(e) => setMaxLeads(parseInt(e.target.value) || 100)}
                disabled={isLoading}
              />
            </div>

            {/* Bio Filters */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="include" className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-emerald-500" />
                  Include Keywords
                </Label>
                <Input
                  id="include"
                  placeholder="founder, CEO, business"
                  value={includeKeywords}
                  onChange={(e) => setIncludeKeywords(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Only include leads with these keywords in bio
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exclude" className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" />
                  Exclude Keywords
                </Label>
                <Input
                  id="exclude"
                  placeholder="bot, spam, follow back"
                  value={excludeKeywords}
                  onChange={(e) => setExcludeKeywords(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Exclude leads with these keywords in bio
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Progress */}
            {isLoading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Scraping followers...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading || !selectedAccount || !targetUsername}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Start Scraping
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className="glass border-emerald-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
              Scraping Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-2xl font-bold">{result.scrapedCount}</p>
                <p className="text-sm text-muted-foreground">Profiles scraped</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-2xl font-bold">{result.savedCount}</p>
                <p className="text-sm text-muted-foreground">New leads saved</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => router.push("/dashboard/leads")} className="flex-1">
                <Users className="mr-2 h-4 w-4" />
                View All Leads
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setProgress(0);
                  setTargetUsername("");
                }}
              >
                Scrape More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
