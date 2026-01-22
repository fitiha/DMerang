import { chromium, Browser, BrowserContext, Page } from "playwright";
import { config } from "./config";
import fs from "fs";
import path from "path";

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async launch(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    this.browser = await chromium.launch({
      headless: config.headless,
      slowMo: config.slowMo,
    });

    return this.browser;
  }

  async createContext(sessionId?: string): Promise<BrowserContext> {
    if (!this.browser) {
      await this.launch();
    }

    const storageStatePath = sessionId
      ? path.join(config.sessionsDir, `${sessionId}.json`)
      : null;

    if (storageStatePath && fs.existsSync(storageStatePath)) {
      this.context = await this.browser!.newContext({
        storageState: storageStatePath,
        viewport: { width: 1280, height: 720 },
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });
    } else {
      this.context = await this.browser!.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });
    }

    return this.context;
  }

  async saveSession(sessionId: string): Promise<void> {
    if (!this.context) {
      throw new Error("No context to save");
    }

    if (!fs.existsSync(config.sessionsDir)) {
      fs.mkdirSync(config.sessionsDir, { recursive: true });
    }

    const storageStatePath = path.join(config.sessionsDir, `${sessionId}.json`);
    await this.context.storageState({ path: storageStatePath });
  }

  async newPage(): Promise<Page> {
    if (!this.context) {
      await this.createContext();
    }
    return this.context!.newPage();
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getContext(): BrowserContext | null {
    return this.context;
  }

  getBrowser(): Browser | null {
    return this.browser;
  }
}

export const browserManager = new BrowserManager();
