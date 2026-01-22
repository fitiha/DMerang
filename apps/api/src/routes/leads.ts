import { Router, Request, Response } from "express";
import { prisma } from "@insta-auto/database";
import { authMiddleware } from "../middleware/auth";
import { z } from "zod";
import {
  BrowserManager,
  LeadScraperService,
  ScrapedLead,
} from "@insta-auto/automation";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all leads
router.get("/", async (req: Request, res: Response) => {
  try {
    const { source, search, page = "1", limit = "50" } = req.query;

    const where: any = {};
    if (source) {
      where.sourceHandle = source as string;
    }
    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: "insensitive" } },
        { fullName: { contains: search as string, mode: "insensitive" } },
        { bio: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { scrapedAt: "desc" },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      leads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// Get unique source handles
router.get("/sources", async (req: Request, res: Response) => {
  try {
    const sources = await prisma.lead.groupBy({
      by: ["sourceHandle"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    res.json(sources.map((s) => ({ handle: s.sourceHandle, count: s._count.id })));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sources" });
  }
});

// Scrape leads from target account
const scrapeSchema = z.object({
  targetUsername: z.string().min(1),
  maxLeads: z.number().int().min(1).max(1000).default(100),
  bioIncludeKeywords: z.array(z.string()).optional(),
  bioExcludeKeywords: z.array(z.string()).optional(),
  instagramAccountId: z.string(),
});

router.post("/scrape", async (req: Request, res: Response) => {
  try {
    const data = scrapeSchema.parse(req.body);

    // Get Instagram account
    const instaAccount = await prisma.instagramAccount.findFirst({
      where: {
        id: data.instagramAccountId,
        userId: req.user!.id,
        isActive: true,
      },
    });

    if (!instaAccount) {
      return res.status(400).json({ error: "Instagram account not found or inactive" });
    }

    // Start scraping
    const browserManager = new BrowserManager();
    const scraper = new LeadScraperService(browserManager);

    const result = await scraper.scrapeFollowers(instaAccount.username, {
      targetUsername: data.targetUsername,
      maxLeads: data.maxLeads,
      bioIncludeKeywords: data.bioIncludeKeywords,
      bioExcludeKeywords: data.bioExcludeKeywords,
    });

    await browserManager.close();

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Save leads to database
    const savedLeads = await Promise.all(
      result.leads.map(async (lead: ScrapedLead) => {
        return prisma.lead.upsert({
          where: { username: lead.username },
          create: {
            username: lead.username,
            fullName: lead.fullName,
            bio: lead.bio,
            profileUrl: lead.profileUrl,
            sourceHandle: data.targetUsername,
          },
          update: {
            fullName: lead.fullName,
            bio: lead.bio,
            profileUrl: lead.profileUrl,
          },
        });
      })
    );

    // Update Instagram account last used
    await prisma.instagramAccount.update({
      where: { id: instaAccount.id },
      data: { lastUsedAt: new Date() },
    });

    res.json({
      success: true,
      scrapedCount: result.scrapedCount,
      savedCount: savedLeads.length,
      leads: savedLeads,
    });
  } catch (error) {
    console.error("Error scraping leads:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to scrape leads" });
  }
});

// Delete leads
router.delete("/", async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid lead IDs" });
    }

    await prisma.lead.deleteMany({
      where: { id: { in: ids } },
    });

    res.json({ success: true, deletedCount: ids.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete leads" });
  }
});

export default router;
