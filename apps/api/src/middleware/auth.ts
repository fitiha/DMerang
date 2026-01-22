import { Request, Response, NextFunction } from "express";
import { auth, Session } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";

declare global {
  namespace Express {
    interface Request {
      session?: Session["session"];
      user?: Session["user"];
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.session = session.session;
    req.user = session.user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  auth.api
    .getSession({
      headers: fromNodeHeaders(req.headers),
    })
    .then((session) => {
      if (session) {
        req.session = session.session;
        req.user = session.user;
      }
      next();
    })
    .catch(() => next());
}
