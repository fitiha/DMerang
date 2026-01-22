"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLeadsStore, type Lead } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface LeadsResponse {
  leads: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Source {
  handle: string;
  count: number;
}

export default function LeadsPage() {
  const {
    leads,
    selectedLeads,
    isLoading,
    pagination,
    setLeads,
    toggleLead,
    selectAll,
    clearSelection,
    setLoading,
  } = useLeadsStore();

  const [search, setSearch] = useState("");
  const [source, setSource] = useState<string>("");
  const [sources, setSources] = useState<Source[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchSources();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [page, source]);

  async function fetchSources() {
    try {
      const data = await api.get<Source[]>("/api/leads/sources");
      setSources(data);
    } catch (err) {
      console.error("Failed to fetch sources:", err);
    }
  }

  async function fetchLeads() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 50 };
      if (source) params.source = source;
      if (search) params.search = search;

      const data = await api.get<LeadsResponse>("/api/leads", params);
      setLeads(data.leads, data.pagination);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (selectedLeads.size === 0) return;

    try {
      await api.delete("/api/leads", { ids: Array.from(selectedLeads) });
      clearSelection();
      fetchLeads();
    } catch (err) {
      console.error("Failed to delete leads:", err);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const allSelected = leads.length > 0 && selectedLeads.size === leads.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Leads</h1>
          <p className="text-muted-foreground">
            Manage your scraped Instagram leads
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/leads/discover">
            <Button>
              <Search className="mr-2 h-4 w-4" />
              Find New Leads
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username, name, or bio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            <Select value={source || "all"} onValueChange={(val) => setSource(val === "all" ? "" : val)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s.handle} value={s.handle}>
                    @{s.handle} ({s.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions bar */}
      {selectedLeads.size > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-muted/50 border border-border/50 p-4">
          <span className="text-sm">
            {selectedLeads.size} lead{selectedLeads.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Link href={`/dashboard/campaigns/new?leads=${Array.from(selectedLeads).join(",")}`}>
              <Button size="sm">
                <Send className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </Link>
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <Card className="glass">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Leads ({pagination.total})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={allSelected ? clearSelection : selectAll}
            >
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p>No leads found</p>
              <Link href="/dashboard/leads/discover" className="mt-4">
                <Button variant="outline" size="sm">
                  Discover Leads
                </Button>
              </Link>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Bio</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Scraped</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer"
                      onClick={() => toggleLead(lead.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedLeads.has(lead.id)}
                          onCheckedChange={() => toggleLead(lead.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">@{lead.username}</p>
                          {lead.fullName && (
                            <p className="text-sm text-muted-foreground">
                              {lead.fullName}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">
                          {lead.bio || "No bio"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">@{lead.sourceHandle}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(lead.scrapedAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <a
                          href={lead.profileUrl || `https://instagram.com/${lead.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
