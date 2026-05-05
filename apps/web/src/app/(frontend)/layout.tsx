import React from "react";

export const metadata = {
  title: "SMN",
  description: "Social Media Manager — AI content agents for creators and SMBs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
