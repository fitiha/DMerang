import { Page } from "playwright";
import { BrowserManager } from "../browser";
import { config } from "../config";

export interface ScrapedLead {
  username: string;
  fullName?: string;
  bio?: string;
  profileUrl: string;
}

export interface ScrapeOptions {
  targetUsername: string;
  maxLeads: number;
  bioIncludeKeywords?: string[];
  bioExcludeKeywords?: string[];
}

export interface ScrapeResult {
  success: boolean;
  leads: ScrapedLead[];
  error?: string;
  scrapedCount: number;
}

export class LeadScraperService {
  private browserManager: BrowserManager;

  constructor(browserManager: BrowserManager) {
    this.browserManager = browserManager;
  }

  async scrapeFollowers(
    sessionId: string,
    options: ScrapeOptions,
    onProgress?: (count: number) => void
  ): Promise<ScrapeResult> {
    let page: Page | null = null;
    const leads: ScrapedLead[] = [];

    try {
      await this.browserManager.launch();
      await this.browserManager.createContext(sessionId);
      page = await this.browserManager.newPage();

      // Navigate to target profile
      const profileUrl = `${config.instagram.baseUrl}/${options.targetUsername}/`;
      console.log(`Navigating to ${profileUrl}...`);
      
      await page.goto(profileUrl, {
        waitUntil: "domcontentloaded", // Changed from networkidle - more reliable
        timeout: 60000, // Increased timeout to 60s
      });

      // Wait a bit for page to settle
      await page.waitForTimeout(2000);

      // Check if profile exists
      const notFoundIndicator = page.locator('text="Sorry, this page isn\'t available."');
      if (await notFoundIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        return { success: false, leads: [], error: "Profile not found", scrapedCount: 0 };
      }

      // Click followers link
      console.log("Looking for followers link...");
      const followersLink = page.locator(`a[href="/${options.targetUsername}/followers/"]`);
      
      // Wait for the link to be visible first
      await followersLink.waitFor({ state: "visible", timeout: 10000 });
      console.log("Clicking followers link...");
      await followersLink.click();

      // Wait for followers modal
      console.log("Waiting for followers modal...");
      await page.waitForSelector('[role="dialog"]', { timeout: 30000 });

      // Scroll and collect followers
      console.log("Starting to scrape followers...");
      const seenUsernames = new Set<string>();
      let scrollAttempts = 0;
      const maxScrollAttempts = 50;

      while (leads.length < options.maxLeads && scrollAttempts < maxScrollAttempts) {
        // Get all follower items in the dialog
        const followerItems = page.locator('[role="dialog"] a[href^="/"][role="link"]');
        const count = await followerItems.count();
        console.log(`Found ${count} follower items, collected ${leads.length} leads so far...`);

        for (let i = 0; i < count && leads.length < options.maxLeads; i++) {
          const item = followerItems.nth(i);
          const href = await item.getAttribute("href");
          
          if (!href || href === "/" || href.includes("/explore/")) continue;
          
          const username = href.replace(/\//g, "");
          
          if (seenUsernames.has(username)) continue;
          seenUsernames.add(username);

          // Get basic info from list
          const fullName = await item
            .locator("span")
            .first()
            .textContent()
            .catch(() => null);

          const lead: ScrapedLead = {
            username,
            fullName: fullName || undefined,
            profileUrl: `${config.instagram.baseUrl}/${username}/`,
          };

          // Optionally fetch bio (slower but more data)
          if (options.bioIncludeKeywords?.length || options.bioExcludeKeywords?.length) {
            const bio = await this.fetchUserBio(page, username);
            lead.bio = bio;

            // Apply bio filters
            if (!this.matchesBioFilters(bio, options.bioIncludeKeywords, options.bioExcludeKeywords)) {
              continue;
            }
          }

          leads.push(lead);
          onProgress?.(leads.length);
        }

        // Scroll down in the modal
        console.log(`Scrolling... (attempt ${scrollAttempts + 1}/${maxScrollAttempts})`);
        await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"] > div > div');
          if (dialog) {
            dialog.scrollTop = dialog.scrollHeight;
          }
        });

        await page.waitForTimeout(1000 + Math.random() * 1000);
        scrollAttempts++;
      }

      // Save session after scraping
      await this.browserManager.saveSession(sessionId);

      return {
        success: true,
        leads,
        scrapedCount: leads.length,
      };
    } catch (error) {
      return {
        success: false,
        leads,
        error: error instanceof Error ? error.message : "Unknown error",
        scrapedCount: leads.length,
      };
    }
  }

  private async fetchUserBio(page: Page, username: string): Promise<string | undefined> {
    try {
      // Open user profile in new tab to get bio
      const context = page.context();
      const bioPage = await context.newPage();
      
      await bioPage.goto(`${config.instagram.baseUrl}/${username}/`, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });

      // Try to get bio text
      const bioElement = bioPage.locator('header section > div:nth-child(3)');
      const bio = await bioElement.textContent({ timeout: 3000 }).catch(() => null);
      
      await bioPage.close();
      return bio || undefined;
    } catch {
      return undefined;
    }
  }

  private matchesBioFilters(
    bio: string | undefined,
    includeKeywords?: string[],
    excludeKeywords?: string[]
  ): boolean {
    if (!bio) return !includeKeywords?.length;

    const lowerBio = bio.toLowerCase();

    // Check exclude keywords first
    if (excludeKeywords?.length) {
      for (const keyword of excludeKeywords) {
        if (lowerBio.includes(keyword.toLowerCase())) {
          return false;
        }
      }
    }

    // Check include keywords
    if (includeKeywords?.length) {
      for (const keyword of includeKeywords) {
        if (lowerBio.includes(keyword.toLowerCase())) {
          return true;
        }
      }
      return false;
    }

    return true;
  }
}
