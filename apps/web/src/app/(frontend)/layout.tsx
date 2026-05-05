import React from "react";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

export const metadata = {
  title: "SMN",
  description: "Social Media Manager — AI content agents for creators and SMBs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
