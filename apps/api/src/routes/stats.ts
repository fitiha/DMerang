import { Router, Request, Response } from "express";
import { prisma, CampaignStatus, LeadStatus } from "@insta-auto/database";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

// Get dashboard statistics
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalLeads,
      campaignCounts,
      todaysDms,
      recentLogs,
      instagramAccounts,
    ] = await Promise.all([
      // Total leads
      prisma.lead.count(),

      // Campaign counts by status
      prisma.campaign.groupBy({
        by: ["status"],
        where: { userId },
        _count: { id: true },
      }),

      // Today's DM stats
      prisma.dmLog.groupBy({
        by: ["status"],
        where: {
          attemptedAt: { gte: today },
          campaign: { userId },
        },
        _count: { id: true },
      }),

      // Recent DM logs
      prisma.dmLog.findMany({
        where: { campaign: { userId } },
        orderBy: { attemptedAt: "desc" },
        take: 10,
        include: {
          campaign: { select: { name: true } },
        },
      }),

      // Instagram accounts
      prisma.instagramAccount.findMany({
        where: { userId },
        select: {
          id: true,
          username: true,
          isActive: true,
          lastUsedAt: true,
        },
      }),
    ]);

    // Format campaign counts
    const campaigns = {
      total: 0,
      pending: 0,
      running: 0,
      paused: 0,
      completed: 0,
      stopped: 0,
    };

    campaignCounts.forEach((c) => {
      const key = c.status.toLowerCase() as keyof typeof campaigns;
      campaigns[key] = c._count.id;
      campaigns.total += c._count.id;
    });

    // Format DM stats
    const todayMessages = {
      sent: 0,
      failed: 0,
      skipped: 0,
      total: 0,
    };

    todaysDms.forEach((d) => {
      const key = d.status.toLowerCase() as keyof typeof todayMessages;
      if (key in todayMessages) {
        todayMessages[key] = d._count.id;
      }
      todayMessages.total += d._count.id;
    });

    res.json({
      leads: {
        total: totalLeads,
      },
      campaigns,
      todayMessages,
      recentLogs,
      instagramAccounts,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

export default router;
