import path from "path";

export const config = {
  sessionsDir: path.join(process.cwd(), "playwright", "sessions"),
  headless: process.env.PLAYWRIGHT_HEADLESS === "true",
  slowMo: parseInt(process.env.PLAYWRIGHT_SLOW_MO || "50", 10),
  timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT || "30000", 10),
  instagram: {
    baseUrl: "https://www.instagram.com",
    loginUrl: "https://www.instagram.com/accounts/login/",
  },
};
