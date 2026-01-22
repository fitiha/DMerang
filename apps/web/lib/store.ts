import { create } from "zustand";

// Types
export interface Lead {
  id: string;
  username: string;
  fullName?: string;
  bio?: string;
  profileUrl?: string;
  sourceHandle: string;
  scrapedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: "PENDING" | "RUNNING" | "PAUSED" | "COMPLETED" | "STOPPED";
  messageTemplate: string;
  timezone: string;
  workingHoursStart: number;
  workingHoursEnd: number;
  dailyLimit: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  instagramAccount?: { username: string };
  _count?: { campaignLeads: number };
}

export interface InstagramAccount {
  id: string;
  username: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

export interface DmLog {
  id: string;
  leadUsername: string;
  status: "PENDING" | "SENT" | "FAILED" | "SKIPPED";
  errorMessage?: string;
  attemptedAt: string;
  campaign?: { name: string };
}

export interface DashboardStats {
  leads: { total: number };
  campaigns: {
    total: number;
    pending: number;
    running: number;
    paused: number;
    completed: number;
    stopped: number;
  };
  todayMessages: {
    sent: number;
    failed: number;
    skipped: number;
    total: number;
  };
  recentLogs: DmLog[];
  instagramAccounts: InstagramAccount[];
}

// Dashboard Store
interface DashboardStore {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  setStats: (stats: DashboardStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  stats: null,
  isLoading: false,
  error: null,
  setStats: (stats) => set({ stats, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

// Leads Store
interface LeadsStore {
  leads: Lead[];
  selectedLeads: Set<string>;
  isLoading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  setLeads: (leads: Lead[], pagination?: LeadsStore["pagination"]) => void;
  toggleLead: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setLoading: (loading: boolean) => void;
}

export const useLeadsStore = create<LeadsStore>((set, get) => ({
  leads: [],
  selectedLeads: new Set(),
  isLoading: false,
  pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
  setLeads: (leads, pagination) =>
    set({
      leads,
      pagination: pagination || get().pagination,
      selectedLeads: new Set(),
    }),
  toggleLead: (id) =>
    set((state) => {
      const newSelected = new Set(state.selectedLeads);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { selectedLeads: newSelected };
    }),
  selectAll: () =>
    set((state) => ({
      selectedLeads: new Set(state.leads.map((l) => l.id)),
    })),
  clearSelection: () => set({ selectedLeads: new Set() }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// Campaigns Store
interface CampaignsStore {
  campaigns: Campaign[];
  selectedCampaign: Campaign | null;
  isLoading: boolean;
  setCampaigns: (campaigns: Campaign[]) => void;
  setSelectedCampaign: (campaign: Campaign | null) => void;
  updateCampaignStatus: (id: string, status: Campaign["status"]) => void;
  setLoading: (loading: boolean) => void;
}

export const useCampaignsStore = create<CampaignsStore>((set) => ({
  campaigns: [],
  selectedCampaign: null,
  isLoading: false,
  setCampaigns: (campaigns) => set({ campaigns }),
  setSelectedCampaign: (selectedCampaign) => set({ selectedCampaign }),
  updateCampaignStatus: (id, status) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === id ? { ...c, status } : c
      ),
    })),
  setLoading: (isLoading) => set({ isLoading }),
}));

// Instagram Accounts Store
interface AccountsStore {
  accounts: InstagramAccount[];
  isLoading: boolean;
  setAccounts: (accounts: InstagramAccount[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useAccountsStore = create<AccountsStore>((set) => ({
  accounts: [],
  isLoading: false,
  setAccounts: (accounts) => set({ accounts }),
  setLoading: (isLoading) => set({ isLoading }),
}));
