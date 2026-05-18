import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Instagram Giveaway Bot",
  description: "Telegram contest bot with Instagram follower export checks.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
