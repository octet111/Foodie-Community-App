import type { Metadata } from "next";
import { Shippori_Mincho, Zen_Kaku_Gothic_New } from "next/font/google";
import { RecoveryRedirect } from "@/components/auth/RecoveryRedirect";
import "./globals.css";

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-zen-kaku",
});

const shippori = Shippori_Mincho({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-shippori",
});

export const metadata: Metadata = {
  title: "フーディコミュニティ",
  description: "食のコミュニティ運営アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${zenKaku.variable} ${shippori.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RecoveryRedirect />
        {children}
      </body>
    </html>
  );
}
