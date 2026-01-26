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
      console.log(`[DM] Starting DM to @${options.leadUsername}`);
      
      await this.browserManager.launch();
      await this.browserManager.createContext(sessionId);
      page = await this.browserManager.newPage();

      // Personalize message
      const personalizedMessage = this.personalizeMessage(options.message, {
        username: options.leadUsername,
        fullName: options.leadFullName,
      });
      
      console.log(`[DM] Personalized message: ${personalizedMessage.substring(0, 50)}...`);

      // Navigate to user's profile
      console.log(`[DM] Navigating to @${options.leadUsername}'s profile...`);
      await page.goto(`${config.instagram.baseUrl}/${options.leadUsername}/`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      
      await page.waitForTimeout(2000);

      // Check if profile exists
      const notFoundIndicator = page.locator('text="Sorry, this page isn\'t available."');
      if (await notFoundIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[DM] Profile @${options.leadUsername} not found`);
        return {
          success: false,
          leadUsername: options.leadUsername,
          error: "Profile not found",
          timestamp: new Date(),
        };
      }

      // Try to find and click Message button using Playwright's recommended selectors
      console.log(`[DM] Looking for way to send message...`);
      
      // Debug: Log all buttons on the page to help identify selectors
      try {
        const allButtons = await page.locator('button').all();
        console.log(`[DM] Found ${allButtons.length} buttons on the page`);
        
        for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
          const text = await allButtons[i].textContent().catch(() => '');
          const ariaLabel = await allButtons[i].getAttribute('aria-label').catch(() => '');
          console.log(`[DM] Button ${i}: text="${text?.trim()}", aria-label="${ariaLabel}"`);
        }
      } catch (error) {
        console.log(`[DM] Error logging buttons:`, error);
      }
      
      let messageOpened = false;
      
      // First, try 3-dots menu (for accounts we don't follow - most common case)
      console.log(`[DM] Trying 3-dots menu first (most common for non-followed accounts)...`);
      
      try {
        // Look for "Options" button (the 3-dots menu)
        const optionsButton = page.getByRole('button', { name: 'Options' });
        
        if (await optionsButton.isVisible({ timeout: 3000 })) {
          console.log(`[DM] Found Options button, clicking...`);
          await optionsButton.click();
          await page.waitForTimeout(1500);

          // Look for "Send message" in the popup menu
          const sendMessageButton = page.getByRole('button', { name: 'Send message' });
          
          if (await sendMessageButton.isVisible({ timeout: 3000 })) {
            console.log(`[DM] Found 'Send message' option in menu, clicking...`);
            await sendMessageButton.click();
            await page.waitForTimeout(2000);
            
            // Handle "Not Now" popup if it appears (for turning on notifications)
            try {
              const notNowButton = page.getByRole('button', { name: 'Not Now' });
              if (await notNowButton.isVisible({ timeout: 2000 })) {
                console.log(`[DM] Dismissing 'Not Now' popup...`);
                await notNowButton.click();
                await page.waitForTimeout(500);
              }
            } catch {
              // No popup, continue
            }
            
            messageOpened = true;
          } else {
            console.log(`[DM] 'Send message' option not found in menu`);
          }
        } else {
          console.log(`[DM] Options button not found`);
        }
      } catch (error) {
        console.log(`[DM] 3-dots menu approach failed:`, error);
      }

      // If 3-dots menu didn't work, try direct Message button (for accounts we follow)
      if (!messageOpened) {
        console.log(`[DM] 3-dots menu didn't work, trying direct Message button...`);
        
        try {
          const messageButton = page.getByRole('button', { name: 'Message', exact: true });
          
          if (await messageButton.isVisible({ timeout: 3000 })) {
            console.log(`[DM] Found direct Message button, clicking...`);
            await messageButton.click();
            await page.waitForTimeout(2000);
            
            // Handle "Not Now" popup if it appears
            try {
              const notNowButton = page.getByRole('button', { name: 'Not Now' });
              if (await notNowButton.isVisible({ timeout: 2000 })) {
                console.log(`[DM] Dismissing 'Not Now' popup...`);
                await notNowButton.click();
                await page.waitForTimeout(500);
              }
            } catch {
              // No popup, continue
            }
            
            messageOpened = true;
          } else {
            console.log(`[DM] Direct Message button not found`);
          }
        } catch (error) {
          console.log(`[DM] Direct message approach failed:`, error);
        }
      }

      if (!messageOpened) {
        // Take a screenshot for debugging
        await page.screenshot({ path: `debug-dm-${options.leadUsername}.png` });
        console.log(`[DM] Screenshot saved to debug-dm-${options.leadUsername}.png`);
        console.log(`[DM] Could not open message dialog for @${options.leadUsername}`);
        return {
          success: false,
          leadUsername: options.leadUsername,
          error: "Could not open message dialog - may be a private account or restricted",
          timestamp: new Date(),
        };
      }

      // Wait for DM input to be available
      console.log(`[DM] Waiting for message input...`);
      
      // Use the exact selector from codegen
      const messageTextbox = page.getByRole('textbox', { name: 'Message' });
      
      if (!(await messageTextbox.isVisible({ timeout: 10000 }))) {
        await page.screenshot({ path: `debug-dm-notextbox-${options.leadUsername}.png` });
        console.log(`[DM] Textbox not found, screenshot saved`);
        return {
          success: false,
          leadUsername: options.leadUsername,
          error: "Message textbox not found",
          timestamp: new Date(),
        };
      }

      // Small delay to ensure page is ready
      await page.waitForTimeout(500 + Math.random() * 500);

      // Type message with human-like delays
      console.log(`[DM] Typing message...`);
      await messageTextbox.click();
      await this.typeWithDelay(page, messageTextbox, personalizedMessage);

      // Send message using the exact selector from codegen
      console.log(`[DM] Sending message...`);
      
      try {
        const sendButton = page.getByRole('button', { name: 'Send' });
        
        if (await sendButton.isVisible({ timeout: 3000 })) {
          console.log(`[DM] Found Send button, clicking...`);
          await sendButton.click();
        } else {
          // Fallback to pressing Enter
          console.log(`[DM] Send button not visible, pressing Enter...`);
          await page.keyboard.press('Enter');
        }
      } catch {
        // Fallback to pressing Enter
        console.log(`[DM] Error finding Send button, pressing Enter...`);
        await page.keyboard.press('Enter');
      }

      // Wait for message to be sent
      await page.waitForTimeout(2000);

      console.log(`[DM] Message sent successfully to @${options.leadUsername}`);

      // Save session
      await this.browserManager.saveSession(sessionId);

      return {
        success: true,
        leadUsername: options.leadUsername,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`[DM] Error sending to @${options.leadUsername}:`, error);
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
      // Handle newlines with Shift+Enter to prevent auto-sending
      if (char === '\n') {
        await page.keyboard.press('Shift+Enter');
        await page.waitForTimeout(100 + Math.random() * 100);
      } else {
        await element.type(char, { delay: 30 + Math.random() * 70 });
      }
      
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
