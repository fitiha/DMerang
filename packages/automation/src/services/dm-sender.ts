import { Page, Locator } from "playwright";
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

      if (!page) {
        throw new Error("Failed to create a browser page");
      }

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
      const notFoundIndicator = page.locator('text="Profile isn\'t available"');
      if (await notFoundIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`[DM] Profile @${options.leadUsername} not found`);
        return {
          success: false,
          leadUsername: options.leadUsername,
          error: "Profile not found",
          timestamp: new Date(),
        };
      }

      // Ensure header loads (profile actions usually live here)
      await page.waitForSelector("header", { timeout: 10000 });

      console.log(`[DM] Looking for way to send message...`);

      let messageOpened = false;
      let messageButtonFound = false;
      let messageInput: Locator | null = null;

      // ATTEMPT 1: Direct Message Button
      console.log(`[DM] Attempt 1: Looking for direct Message button...`);
      try {
        const messageButton =
  (await page.getByRole("button", { name: "Message" }).first().isVisible().catch(() => false))
    ? page.getByRole("button", { name: "Message" }).first()
    : page.locator('div[role="button"]:has-text("Message")').first();

        if (await messageButton.count()) {
          messageButtonFound = true;
          await messageButton.scrollIntoViewIfNeeded();
          await messageButton.click();

          // Allow dialog to render
await page.waitForTimeout(1500);

// Wait for DM dialog container to appear
console.log(`[DM] Waiting for DM dialog...`);
try {
  await page.waitForSelector('div[role="dialog"]', { timeout: 15000 });
  console.log(`[DM] ✅ DM dialog appeared`);
} catch {
  console.log(`[DM] ❌ DM dialog did not appear`);
}

// If notifications modal appears, dismiss it and continue
await this.dismissNotificationModal(page);

// Extra wait after dismissing modal
await page.waitForTimeout(1000);

// Now wait longer for input to appear
messageInput = await this.findMessageInput(page, 15000);

          if (messageInput) {
            messageOpened = true;
          } else {
            console.log(`[DM] Clicked Message but input did not appear after wait.`);
          }
        } else {
          console.log(`[DM] Direct Message button not found.`);
        }
      } catch (error) {
        console.log(`[DM] Attempt 1 failed:`, error);
      }

      // ATTEMPT 2: Only if Message button was NOT found
      if (!messageOpened && !messageButtonFound) {
        console.log(`[DM] Attempt 2: Trying 3-dots menu...`);
        try {
          const optionsButton = page.getByRole("button", { name: "Options" });

          if (await optionsButton.isVisible({ timeout: 3000 })) {
            console.log(`[DM] Found Options button, clicking...`);
            await optionsButton.click();
            await page.waitForTimeout(2000);

            const sendMessageButton = page.getByRole("button", { name: "Send message" });

            if (await sendMessageButton.isVisible({ timeout: 3000 })) {
              console.log(`[DM] Found 'Send message' option, clicking...`);
              await sendMessageButton.click();

              await page.waitForTimeout(1500);
              await this.dismissNotificationModal(page);

              messageInput = await this.findMessageInput(page, 12000);

              if (messageInput) {
                messageOpened = true;
              } else {
                console.log(`[DM] Clicked Send message but input did not appear.`);
              }
            } else {
              console.log(`[DM] 'Send message' option not found in menu`);
            }
          } else {
            console.log(`[DM] Options (3-dots) button not found`);
          }
        } catch (error) {
          console.log(`[DM] Attempt 2 failed:`, error);
        }
      }

      if (!messageOpened || !messageInput) {
        await page.screenshot({ path: `debug-dm-failed-${options.leadUsername}.png` });
        console.log(`[DM] Failed to open message dialog. Screenshot saved.`);
        return {
          success: false,
          leadUsername: options.leadUsername,
          error: "Could not open message dialog",
          timestamp: new Date(),
        };
      }

      // Ensure input is focused
      console.log(`[DM] Focusing message input...`);
      await messageInput.click();
      await page.waitForTimeout(1000);

      // Type message with keyboard (reliable for contenteditable)
      console.log(`[DM] Typing message...`);
      // await page.keyboard.type(personalizedMessage, { delay: 40 });
      await this.typeWithDelay(page, messageInput, personalizedMessage);

      // Send message
      console.log(`[DM] Sending message...`);
      await page.waitForTimeout(500);

      try {
        const sendButton = page.getByRole("button", { name: "Send" });

        if (await sendButton.isVisible({ timeout: 3000 })) {
          console.log(`[DM] Found Send button, clicking...`);
          await sendButton.click();
        } else {
          console.log(`[DM] Send button not visible, pressing Enter...`);
          await page.keyboard.press("Enter");
        }
      } catch {
        console.log(`[DM] Error finding Send button, pressing Enter...`);
        await page.keyboard.press("Enter");
      }

      await page.waitForTimeout(3000);

      console.log(`[DM] Message sent successfully to @${options.leadUsername}`);

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

  private async findMessageInput(page: Page, timeoutMs: number): Promise<Locator | null> {
  const perSelectorTimeout = Math.max(2000, Math.floor(timeoutMs / 5));

  // 1) Best: accessible name "Message"
  console.log(`[DM] Trying: getByRole("textbox", { name: "Message" })`);
  const byRole = page.getByRole("textbox", { name: "Message" }).first();
  if (await byRole.isVisible({ timeout: perSelectorTimeout }).catch(() => false)) {
    console.log(`[DM] ✅ Found via getByRole("textbox", { name: "Message" })`);
    return byRole;
  }
  console.log(`[DM] ❌ Not found via getByRole`);

  // 2) contenteditable textbox
  console.log(`[DM] Trying: [contenteditable="true"][role="textbox"]`);
  const editable = page.locator('[contenteditable="true"][role="textbox"]').first();
  if (await editable.isVisible({ timeout: perSelectorTimeout }).catch(() => false)) {
    console.log(`[DM] ✅ Found via contenteditable`);
    return editable;
  }
  console.log(`[DM] ❌ Not found via contenteditable`);

  // 3) generic fallback
  console.log(`[DM] Trying: div[role="textbox"]`);
  const generic = page.locator('div[role="textbox"]').first();
  if (await generic.isVisible({ timeout: perSelectorTimeout }).catch(() => false)) {
    console.log(`[DM] ✅ Found via div[role="textbox"]`);
    return generic;
  }
  console.log(`[DM] ❌ Not found via div[role="textbox"]`);

  // 4) aria-label fallback
  console.log(`[DM] Trying: [aria-label="Message"]`);
  const ariaLabel = page.locator('[aria-label="Message"]').first();
  if (await ariaLabel.isVisible({ timeout: perSelectorTimeout }).catch(() => false)) {
    console.log(`[DM] ✅ Found via aria-label`);
    return ariaLabel;
  }
  console.log(`[DM] ❌ Not found via aria-label`);

  // 5) paragraph fallback (from codegen)
  console.log(`[DM] Trying: getByRole("paragraph")`);
  const paragraph = page.getByRole("paragraph").first();
  if (await paragraph.isVisible({ timeout: perSelectorTimeout }).catch(() => false)) {
    console.log(`[DM] ✅ Found via paragraph (fallback)`);
    return paragraph;
  }
  console.log(`[DM] ❌ Not found via paragraph`);

  return null;
}

  private async dismissNotificationModal(page: Page): Promise<void> {
    try {
      const notNowButton = page.getByRole("button", { name: "Not Now" });
      if (await notNowButton.isVisible({ timeout: 3000 })) {
        console.log(`[DM] Dismissing 'Turn on Notifications' modal...`);
        await notNowButton.click();
        await page.waitForTimeout(1000);
      }
    } catch {
      // Ignore
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
      if (char === "\n") {
        await page.keyboard.press("Shift+Enter");
        await page.waitForTimeout(100 + Math.random() * 100);
      } else {
        await element.type(char, { delay: 30 + Math.random() * 70 });
      }

      if (Math.random() < 0.05) {
        await page.waitForTimeout(200 + Math.random() * 300);
      }
    }
  }

  async getRandomDelay(minSeconds: number, maxSeconds: number): Promise<number> {
    const baseDelay = minSeconds + Math.random() * (maxSeconds - minSeconds);
    const variance = baseDelay * 0.2;
    return Math.floor((baseDelay + (Math.random() - 0.5) * variance) * 1000);
  }
}