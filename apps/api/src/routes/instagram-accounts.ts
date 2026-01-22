import { Router, Request, Response } from "express";
import { prisma } from "@insta-auto/database";
import { authMiddleware } from "../middleware/auth";
import { z } from "zod";
import { BrowserManager, InstagramAuthService } from "@insta-auto/automation";

const router = Router();

router.use(authMiddleware);

// Get all Instagram accounts for user
router.get("/", async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.instagramAccount.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        username: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// Add Instagram account (login)
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    // Check if account already exists
    const existing = await prisma.instagramAccount.findUnique({
      where: { username },
    });

    if (existing && existing.userId !== req.user!.id) {
      return res.status(400).json({ error: "This account is linked to another user" });
    }

    // Attempt login
    const browserManager = new BrowserManager();
    const authService = new InstagramAuthService(browserManager);

    const result = await authService.login(username, password);

    if (!result.success) {
      await browserManager.close();
      return res.status(400).json({ error: result.error });
    }

    // Close browser after successful login
    await browserManager.close();

    // Save or update account
    const account = await prisma.instagramAccount.upsert({
      where: { username },
      create: {
        userId: req.user!.id,
        username,
        isActive: true,
        lastUsedAt: new Date(),
      },
      update: {
        isActive: true,
        lastUsedAt: new Date(),
      },
    });

    res.json({
      success: true,
      account: {
        id: account.id,
        username: account.username,
        isActive: account.isActive,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

// Verify session is still valid
router.post("/:id/verify", async (req: Request, res: Response) => {
  try {
    const account = await prisma.instagramAccount.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    const browserManager = new BrowserManager();
    const authService = new InstagramAuthService(browserManager);

    const isValid = await authService.verifySession(account.username);
    await browserManager.close();

    if (!isValid) {
      await prisma.instagramAccount.update({
        where: { id: account.id },
        data: { isActive: false },
      });
    }

    res.json({ valid: isValid });
  } catch (error) {
    res.status(500).json({ error: "Failed to verify session" });
  }
});

// Deactivate account
router.patch("/:id/deactivate", async (req: Request, res: Response) => {
  try {
    const account = await prisma.instagramAccount.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    await prisma.instagramAccount.update({
      where: { id: account.id },
      data: { isActive: false },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to deactivate account" });
  }
});

// Delete account
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const account = await prisma.instagramAccount.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Check if account has active campaigns
    const activeCampaigns = await prisma.campaign.count({
      where: {
        instagramAccountId: account.id,
        status: { in: ["PENDING", "RUNNING", "PAUSED"] },
      },
    });

    if (activeCampaigns > 0) {
      return res.status(400).json({
        error: "Cannot delete account with active campaigns",
      });
    }

    await prisma.instagramAccount.delete({
      where: { id: account.id },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
