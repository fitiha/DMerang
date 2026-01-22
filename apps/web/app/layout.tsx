import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: "InstaAuto - Instagram Automation Dashboard",
  description: "Automate your Instagram DM outreach with smart lead scraping and campaign management",
  keywords: ["Instagram", "automation", "DM", "outreach", "leads", "campaigns"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${lexend.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
