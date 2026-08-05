import type { Metadata } from "next";
import {
  Quicksand,
  Plus_Jakarta_Sans,
  Kalam,
  JetBrains_Mono,
} from "next/font/google";

import "./globals.css";
import { SITE_URL } from "@/lib/github";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-kalam",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ReinvyLibrary — a cozy corner of the internet",
    template: "%s · ReinvyLibrary",
  },
  description:
    "Curated tutorials, cheatsheets, guides & syllabi — written with care, in English and Bahasa Indonesia.",
  keywords: [
    "tutorials",
    "cheatsheets",
    "guides",
    "syllabi",
    "programming",
    "nextjs",
    "golang",
    "flutter",
    "docker",
    "postgres",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${quicksand.variable} ${jakarta.variable} ${kalam.variable} ${jetbrains.variable}`}>
      <body className="bg-paper font-body text-ink antialiased">{children}</body>
    </html>
  );
}
