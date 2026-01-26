import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DMerang - Instagram Automation Dashboard",
  description: "Automate your Instagram DM outreach with smart lead scraping and campaign management",
  keywords: ["Instagram", "automation", "DM", "outreach", "leads", "campaigns"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
