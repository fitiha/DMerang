import { Router, Request, Response } from "express";
import { prisma, CampaignStatus, LeadStatus } from "@insta-auto/database";
import { authMiddleware } from "../middleware/auth";
import { z } from "zod";
import { campaignWorker } from "../services/campaign-worker";

const router = Router();

router.use(authMiddleware);

// Get all campaigns
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, page = "1", limit = "20" } = req.query;

    const where: any = { userId: req.user!.id };
    if (status) {
      where.status = status as CampaignStatus;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          instagramAccount: {
            select: { username: true },
          },
          _count: {
            select: { campaignLeads: true },
          },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    res.json({
      campaigns,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

// Get campaign by ID with details
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: {
        instagramAccount: {
          select: { username: true },
        },
        campaignLeads: {
          include: {
            lead: true,
          },
          orderBy: { createdAt: "desc" },
        },
        dmLogs: {
          orderBy: { attemptedAt: "desc" },
          take: 100,
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch campaign" });
  }
});

// Create campaign
const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  instagramAccountId: z.string(),
  messageTemplate: z.string().min(1).max(1000),
  timezone: z.string().default("UTC"),
  workingHoursStart: z.number().int().min(0).max(23).default(9),
  workingHoursEnd: z.number().int().min(0).max(23).default(17),
  dailyLimit: z.number().int().min(1).max(100).default(50),
  minDelaySeconds: z.number().int().min(10).max(600).default(30),
  maxDelaySeconds: z.number().int().min(30).max(1800).default(120),
  leadIds: z.array(z.string()).min(1),
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const data = createCampaignSchema.parse(req.body);

    // Verify Instagram account belongs to user
    const instaAccount = await prisma.instagramAccount.findFirst({
      where: {
        id: data.instagramAccountId,
        userId: req.user!.id,
        isActive: true,
      },
    });

    if (!instaAccount) {
      return res.status(400).json({ error: "Instagram account not found" });
    }

    // Verify leads exist
    const existingLeads = await prisma.lead.findMany({
      where: { id: { in: data.leadIds } },
      select: { id: true },
    });

    if (existingLeads.length !== data.leadIds.length) {
      return res.status(400).json({ error: "Some leads not found" });
    }

    // Create campaign with leads
    const campaign = await prisma.campaign.create({
      data: {
        userId: req.user!.id,
        instagramAccountId: data.instagramAccountId,
        name: data.name,
        messageTemplate: data.messageTemplate,
        timezone: data.timezone,
        workingHoursStart: data.workingHoursStart,
        workingHoursEnd: data.workingHoursEnd,
        dailyLimit: data.dailyLimit,
        minDelaySeconds: data.minDelaySeconds,
        maxDelaySeconds: data.maxDelaySeconds,
        campaignLeads: {
          create: data.leadIds.map((leadId) => ({
            leadId,
            status: LeadStatus.PENDING,
          })),
        },
      },
      include: {
        instagramAccount: { select: { username: true } },
        _count: { select: { campaignLeads: true } },
      },
    });

    res.status(201).json(campaign);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error creating campaign:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

// Update campaign status
const updateStatusSchema = z.object({
  status: z.enum(["RUNNING", "PAUSED", "STOPPED"]),
});

router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { status } = updateStatusSchema.parse(req.body);

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Validate status transitions
    const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
      PENDING: ["RUNNING"],
      RUNNING: ["PAUSED", "STOPPED"],
      PAUSED: ["RUNNING", "STOPPED"],
      COMPLETED: [],
      STOPPED: [],
    };

    if (!validTransitions[campaign.status].includes(status as CampaignStatus)) {
      return res.status(400).json({
        error: `Cannot transition from ${campaign.status} to ${status}`,
      });
    }

    const updateData: any = { status };
    if (status === "RUNNING" && !campaign.startedAt) {
      updateData.startedAt = new Date();
    }

    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: updateData,
    });

    // Trigger worker based on status change
    if (status === "RUNNING") {
      campaignWorker.startCampaign(req.params.id);
    } else if (status === "PAUSED") {
      campaignWorker.pauseCampaign(req.params.id);
    } else if (status === "STOPPED") {
      campaignWorker.stopCampaign(req.params.id);
    }

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update campaign status" });
  }
});

// Delete campaign
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (campaign.status === "RUNNING") {
      return res.status(400).json({ error: "Cannot delete a running campaign" });
    }

    await prisma.campaign.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

export default router;
