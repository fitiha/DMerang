import { prisma, CampaignStatus, LeadStatus } from "@insta-auto/database";
import { BrowserManager, DmSenderService } from "@insta-auto/automation";

interface CampaignJob {
  campaignId: string;
  isRunning: boolean;
  shouldStop: boolean;
}

class CampaignWorker {
  private jobs: Map<string, CampaignJob> = new Map();
  private browserManager: BrowserManager;
  private dmSender: DmSenderService;

  constructor() {
    this.browserManager = new BrowserManager();
    this.dmSender = new DmSenderService(this.browserManager);
  }

  async startCampaign(campaignId: string): Promise<void> {
    if (this.jobs.has(campaignId)) {
      console.log(`Campaign ${campaignId} is already running`);
      return;
    }

    const job: CampaignJob = {
      campaignId,
      isRunning: true,
      shouldStop: false,
    };
    this.jobs.set(campaignId, job);

    // Run in background
    this.runCampaign(job).catch((err) => {
      console.error(`Campaign ${campaignId} failed:`, err);
    });
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    const job = this.jobs.get(campaignId);
    if (job) {
      job.shouldStop = true;
    }
  }

  async stopCampaign(campaignId: string): Promise<void> {
    const job = this.jobs.get(campaignId);
    if (job) {
      job.shouldStop = true;
    }
  }

  private async runCampaign(job: CampaignJob): Promise<void> {
    const { campaignId } = job;

    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          instagramAccount: true,
          campaignLeads: {
            where: { status: LeadStatus.PENDING },
            include: { lead: true },
          },
        },
      });

      if (!campaign || !campaign.instagramAccount) {
        console.error(`Campaign ${campaignId} not found`);
        return;
      }

      let sentToday = 0;

      for (const campaignLead of campaign.campaignLeads) {
        // Check if should stop
        if (job.shouldStop) {
          console.log(`Campaign ${campaignId} stopped`);
          break;
        }

        // Check daily limit
        if (sentToday >= campaign.dailyLimit) {
          console.log(`Campaign ${campaignId} reached daily limit`);
          break;
        }

        // Check working hours
        if (!this.isWithinWorkingHours(campaign)) {
          console.log(`Campaign ${campaignId} outside working hours`);
          break;
        }

        // Send DM
        const result = await this.dmSender.sendDm(
          campaign.instagramAccount.username,
          {
            leadUsername: campaignLead.lead.username,
            message: campaign.messageTemplate,
            leadFullName: campaignLead.lead.fullName || undefined,
          }
        );

        // Update campaign lead status
        const status = result.success ? LeadStatus.SENT : LeadStatus.FAILED;
        await prisma.campaignLead.update({
          where: { id: campaignLead.id },
          data: { status, processedAt: new Date() },
        });

        // Create DM log
        await prisma.dmLog.create({
          data: {
            campaignId,
            instagramAccountId: campaign.instagramAccountId,
            leadUsername: campaignLead.lead.username,
            messageContent: campaign.messageTemplate,
            status,
            errorMessage: result.error,
          },
        });

        // Update campaign counts
        const updateData: { sentCount?: { increment: number }; failedCount?: { increment: number } } = {};
        if (result.success) {
          updateData.sentCount = { increment: 1 };
          sentToday++;
        } else {
          updateData.failedCount = { increment: 1 };
        }
        await prisma.campaign.update({
          where: { id: campaignId },
          data: updateData,
        });

        // Random delay
        const delay = await this.dmSender.getRandomDelay(
          campaign.minDelaySeconds,
          campaign.maxDelaySeconds
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Check if campaign is complete
      const remainingLeads = await prisma.campaignLead.count({
        where: { campaignId, status: LeadStatus.PENDING },
      });

      if (remainingLeads === 0) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: CampaignStatus.COMPLETED, completedAt: new Date() },
        });
      } else if (job.shouldStop) {
        // Check if it was paused or stopped
        const currentCampaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
        });
        if (currentCampaign?.status === CampaignStatus.STOPPED) {
          // Already marked as stopped
        } else {
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: CampaignStatus.PAUSED },
          });
        }
      }
    } catch (error) {
      console.error(`Campaign ${campaignId} error:`, error);
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.PAUSED },
      });
    } finally {
      job.isRunning = false;
      this.jobs.delete(campaignId);
      await this.browserManager.close();
    }
  }

  private isWithinWorkingHours(campaign: {
    timezone: string;
    workingHoursStart: number;
    workingHoursEnd: number;
  }): boolean {
    try {
      // Get current hour in campaign timezone
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: campaign.timezone,
        hour: "numeric",
        hour12: false,
      });
      const currentHour = parseInt(formatter.format(now), 10);

      return (
        currentHour >= campaign.workingHoursStart &&
        currentHour < campaign.workingHoursEnd
      );
    } catch {
      // If timezone parsing fails, assume within working hours
      return true;
    }
  }
}

export const campaignWorker = new CampaignWorker();
