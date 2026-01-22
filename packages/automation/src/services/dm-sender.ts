import { Page } from "playwright";
import { BrowserManager } from "../browser";
import { config } from "../config";

export interface DmResult {
  success: boolean;
  leadUsername: string;
  error?: string;
  timestamp: Date;
}

export interface DmOptions {
  leadUsername: string;
  message: string;
  leadFullName?: string;
}

export class DmSenderService {
  private browserManager: BrowserManager;

  constructor(browserManager: BrowserManager) {
    this.browserManager = browserManager;
  }

  async sendDm(sessionId: string, options: DmOptions): Promise<DmResult> {
    let page: Page | null = null;

    try {
      await this.browserManager.launch();
      await this.browserManager.createContext(sessionId);
      page = await this.browserManager.newPage();

      // Personalize message
      const personalizedMessage = this.personalizeMessage(options.message, {
        username: options.leadUsername,
        fullName: options.leadFullName,
      });

      // Navigate to user's profile
      await page.goto(`${config.instagram.baseUrl}/${options.leadUsername}/`, {
        waitUntil: "networkidle",
        timeout: config.timeout,
      });

      // Check if profile exists
      const notFoundIndicator = page.locator('text="Sorry, this page isn\'t available."');
      if (await notFoundIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        return {
          success: false,
          leadUsername: options.leadUsername,
          error: "Profile not found",
          timestamp: new Date(),
        };
      }

      // Click Message button
      const messageButton = page.locator('div[role="button"]:has-text("Message")');
      if (!(await messageButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        return {
          success: false,
          leadUsername: options.leadUsername,
          error: "Message button not found - may be a private account",
          timestamp: new Date(),
        };
      }

      await messageButton.click();

      // Wait for DM input to be available
      await page.waitForSelector('div[role="textbox"]', { timeout: config.timeout });

      // Small delay to ensure page is ready
      await page.waitForTimeout(500 + Math.random() * 500);

      // Type message with human-like delays
      const textbox = page.locator('div[role="textbox"]');
      await textbox.click();
      await this.typeWithDelay(page, textbox, personalizedMessage);

      // Send message
      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Wait for message to be sent
      await page.waitForTimeout(1000);

      // Verify message was sent (check for sent indicator)
      // This could be enhanced based on Instagram's UI

      // Save session
      await this.browserManager.saveSession(sessionId);

      return {
        success: true,
        leadUsername: options.leadUsername,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        leadUsername: options.leadUsername,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };
    }
  }

  private personalizeMessage(
    template: string,
    variables: { username: string; fullName?: string }
  ): string {
    let message = template;
    
    message = message.replace(/\{\{username\}\}/g, variables.username);
    message = message.replace(/\{\{name\}\}/g, variables.fullName || variables.username);
    message = message.replace(
      /\{\{firstName\}\}/g,
      variables.fullName?.split(" ")[0] || variables.username
    );

    return message;
  }

  private async typeWithDelay(
    page: Page,
    element: ReturnType<Page["locator"]>,
    text: string
  ): Promise<void> {
    for (const char of text) {
      await element.type(char, { delay: 30 + Math.random() * 70 });
      
      // Occasional longer pause to simulate thinking
      if (Math.random() < 0.05) {
        await page.waitForTimeout(200 + Math.random() * 300);
      }
    }
  }

  async getRandomDelay(minSeconds: number, maxSeconds: number): Promise<number> {
    const baseDelay = minSeconds + Math.random() * (maxSeconds - minSeconds);
    // Add some variance
    const variance = baseDelay * 0.2;
    return Math.floor((baseDelay + (Math.random() - 0.5) * variance) * 1000);
  }
}
