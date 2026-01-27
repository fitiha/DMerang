import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";

import leadsRouter from "./routes/leads";
import campaignsRouter from "./routes/campaigns";
import instagramAccountsRouter from "./routes/instagram-accounts";
import statsRouter from "./routes/stats";
import messageTemplatesRouter from "./routes/message-templates";

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Better Auth handler - must be before body parsers for auth routes
app.all("/api/auth/*", toNodeHandler(auth));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api/leads", leadsRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/instagram-accounts", instagramAccountsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/message-templates", messageTemplatesRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});

export default app;
