import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { OllamaStatusBadge, OllamaStatusFallback } from "@/components/ollama-status-badge";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Structured CV Screening",
  description: "Consistent, role-specific candidate screening with Ollama",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
        <SiteHeader>
          <Suspense fallback={<OllamaStatusFallback />}>
            <OllamaStatusBadge />
          </Suspense>
        </SiteHeader>
        {children}
      </body>
    </html>
  );
}
