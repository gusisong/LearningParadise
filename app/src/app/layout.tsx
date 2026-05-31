import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import { SoundProvider } from "@/contexts/SoundContext";
import "./globals.css";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "LearningParadise | 学习乐园",
  description: "多模块私有 Web 学习激励平台 — Minecraft 风格的口算练习与冒险成长系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${pixelFont.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <SoundProvider>
          <div id="global-bg-blur" className="fixed inset-0 z-[-1] pointer-events-none backdrop-blur-sm backdrop-saturate-50 bg-black/40" />
          {children}
        </SoundProvider>
      </body>
    </html>
  );
}
