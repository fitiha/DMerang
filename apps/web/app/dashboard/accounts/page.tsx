"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAccountsStore, type InstagramAccount } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Instagram,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AccountsPage() {
  const { accounts, isLoading, setAccounts, setLoading } = useAccountsStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loginError, setLoginError] = useState("");

  const [username, setUsername] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const data = await api.get<InstagramAccount[]>("/api/instagram-accounts");
      setAccounts(data);
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoginLoading(true);
    setLoginError("");

    try {
      await api.post("/api/instagram-accounts/login", { username, password: "dummy" });
      setIsAddDialogOpen(false);
      setUsername("");
      fetchAccounts();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoginLoading(false);
    }
  }

  async function handleVerify(id: string) {
    setVerifyingId(id);
    try {
      const result = await api.post<{ valid: boolean }>(
        `/api/instagram-accounts/${id}/verify`
      );
      if (!result.valid) {
        fetchAccounts(); // Refresh to get updated status
      }
    } catch (err) {
      console.error("Failed to verify:", err);
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/api/instagram-accounts/${id}`);
      fetchAccounts();
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
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
          <h1 className="text-2xl font-bold">Instagram Accounts</h1>
          <p className="text-muted-foreground">
            Manage your connected Instagram accounts
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-purple-500" />
                Connect Instagram Account
              </DialogTitle>
              <DialogDescription>
                Enter your Instagram username. A browser window will open where you can log in manually.
                This is more secure and works with 2FA and other security features.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLogin}>
              <div className="space-y-4 py-4">
                {loginError && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {loginError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="username">Instagram Username</Label>
                  <Input
                    id="username"
                    placeholder="your_username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoginLoading}
                    required
                  />
                </div>
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-sm space-y-2">
                  <p className="font-medium text-blue-600 dark:text-blue-400">How it works:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-600/80 dark:text-blue-400/80">
                    <li>A browser window will open with Instagram login page</li>
                    <li>Log in manually with your credentials</li>
                    <li>Handle 2FA, CAPTCHAs, or any security challenges</li>
                    <li>The bot will detect when you're logged in and save your session</li>
                  </ol>
                  <p className="text-xs text-blue-600/60 dark:text-blue-400/60 mt-2">
                    You have 3 minutes to complete the login process.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isLoginLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoginLoading}>
                  {isLoginLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect Account"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Instagram className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No accounts connected</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Connect your Instagram account to start automating
            </p>
            <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="glass">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500">
                      <Instagram className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">@{account.username}</p>
                      <p className="text-xs text-muted-foreground">
                        Added{" "}
                        {formatDistanceToNow(new Date(account.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={account.isActive ? "success" : "secondary"}>
                    {account.isActive ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" />
                        Inactive
                      </>
                    )}
                  </Badge>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-3">
                    {account.lastUsedAt
                      ? `Last used ${formatDistanceToNow(
                          new Date(account.lastUsedAt),
                          { addSuffix: true }
                        )}`
                      : "Never used"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVerify(account.id)}
                      disabled={verifyingId === account.id}
                    >
                      {verifyingId === account.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1 h-3 w-3" />
                      )}
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(account.id)}
                      disabled={deletingId === account.id}
                    >
                      {deletingId === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info */}
      <Card className="glass border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            About Account Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • Sessions are stored locally and used for automation tasks
          </p>
          <p>
            • If a session expires, you&apos;ll need to re-login
          </p>
          <p>
            • Use the Verify button to check if a session is still valid
          </p>
          <p>
            • For security, avoid using your main Instagram account
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
