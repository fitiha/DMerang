import { Page } from "playwright";
import { BrowserManager } from "../browser";
import { config } from "../config";

export interface LoginResult {
  success: boolean;
  error?: string;
  sessionId?: string;
}

export class InstagramAuthService {
  private browserManager: BrowserManager;

  constructor(browserManager: BrowserManager) {
    this.browserManager = browserManager;
  }

  async login(username: string, password: string): Promise<LoginResult> {
    let page: Page | null = null;

    try {
      await this.browserManager.launch();
      await this.browserManager.createContext();
      page = await this.browserManager.newPage();

      console.log("Opening Instagram login page...");
      console.log("Please log in manually in the browser window that just opened.");
      console.log("The bot will wait for you to complete the login process.");
      
      await page.goto(config.instagram.loginUrl, {
        waitUntil: "networkidle",
        timeout: config.timeout,
      });

      // Wait for the user to manually log in by checking for logged-in indicators
      console.log("Waiting for you to log in manually...");
      console.log("Username:", username);
      console.log("Password:", "***" + password.slice(-2));
      
      const loggedInIndicators = [
        'a[href*="/direct/inbox/"]',  // Messages icon
        'svg[aria-label="Home"]',      // Home icon
        'a[href*="/explore/"]',        // Explore link
        'svg[aria-label="New post"]',  // New post button
        'a[href^="/"][href$="/"]',     // Profile link
      ];

      let isLoggedIn = false;
      const maxWaitTime = 180000; // 3 minutes
      const startTime = Date.now();

      while (!isLoggedIn && (Date.now() - startTime) < maxWaitTime) {
        // First check if we're still on the login page
        const currentUrl = page.url();
        
        // If still on login or onetap page, keep waiting
        if (currentUrl.includes("/accounts/login") || currentUrl.includes("/accounts/onetap")) {
          await page.waitForTimeout(2000);
          console.log("Still on login page, waiting...");
          continue;
        }

        // Now check for logged-in indicators
        for (const selector of loggedInIndicators) {
          try {
            const element = page.locator(selector);
            if (await element.isVisible({ timeout: 2000 })) {
              console.log(`Login detected with indicator: ${selector}`);
              isLoggedIn = true;
              break;
            }
          } catch {
            continue;
          }
        }
        
        if (!isLoggedIn) {
          await page.waitForTimeout(2000);
          console.log("Still waiting for login...");
        }
      }

      if (!isLoggedIn) {
        return { success: false, error: "Login timeout - please try again and complete login within 3 minutes" };
      }

      console.log("Login successful! Saving session...");
      
      // Save session
      const sessionId = username.toLowerCase().replace(/[^a-z0-9]/g, "_");
      await this.browserManager.saveSession(sessionId);
      
      console.log(`Session saved as: ${sessionId}`);
      console.log("You can close the browser window now.");

      return { success: true, sessionId };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async verifySession(sessionId: string): Promise<boolean> {
    let page: Page | null = null;

    try {
      await this.browserManager.launch();
      await this.browserManager.createContext(sessionId);
      page = await this.browserManager.newPage();

      await page.goto(config.instagram.baseUrl, {
        waitUntil: "networkidle",
        timeout: config.timeout,
      });

      // Check if redirected to login page
      const currentUrl = page.url();
      if (currentUrl.includes("/accounts/login")) {
        return false;
      }

      // Handle dialogs that might block view
      try {
        const notNowButton = page.locator('button:has-text("Not Now")');
        if (await notNowButton.isVisible({ timeout: 3000 })) {
          await notNowButton.click();
          await page.waitForTimeout(1000);
        }
      } catch {}

      // Check for logged-in indicators
      const loggedInIndicators = [
        'a[href*="/direct/inbox/"]',  // Messages icon
        'svg[aria-label="Home"]',      // Home icon
        'a[href*="/explore/"]',        // Explore link
        'svg[aria-label="New post"]',  // New post button
        'a[href^="/"][href$="/"]',     // Profile link
      ];

      for (const selector of loggedInIndicators) {
        try {
          const element = page.locator(selector);
          if (await element.isVisible({ timeout: 5000 })) {
            return true;
          }
        } catch {
          continue;
        }
      }

      return false;
    } catch {
      return false;
    }
  }
}
