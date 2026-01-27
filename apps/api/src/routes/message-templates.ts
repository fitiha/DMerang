import { Router } from "express";
import { z } from "zod";
import { prisma } from "@insta-auto/database";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Schema for creating/updating templates
const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().default("General"),
});

// Get all templates for the user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const templates = await prisma.messageTemplate.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json(templates);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// Create a new template
router.post("/", authMiddleware, async (req, res) => {
  try {
    const data = templateSchema.parse(req.body);
    
    const template = await prisma.messageTemplate.create({
      data: {
        ...data,
        userId: req.user.id,
      },
    });
    
    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error("Failed to create template:", error);
    res.status(500).json({ error: "Failed to create template" });
  }
});

// Update a template
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const data = templateSchema.parse(req.body);

    const existing = await prisma.messageTemplate.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== req.user.id) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    const template = await prisma.messageTemplate.update({
      where: { id },
      data,
    });

    res.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error("Failed to update template:", error);
    res.status(500).json({ error: "Failed to update template" });
  }
});

// Delete a template
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.messageTemplate.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== req.user.id) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    await prisma.messageTemplate.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete template:", error);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

export default router;
