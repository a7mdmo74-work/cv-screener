import { AccessProvider } from "@/components/auth/access-provider";
import { Suspense } from "react";
import { requirePageRole } from "@/lib/auth/server";
import { SiteHeader } from "@/components/site-header";
import { OllamaStatusBadge, OllamaStatusFallback } from "@/components/ollama-status-badge";
import { UserMenu } from "@/components/auth/user-menu";
export default function ProtectedLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  return <Suspense><ProtectedShell params={params}>{children}</ProtectedShell></Suspense>;
}
async function ProtectedShell({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requirePageRole(locale);
  return <AccessProvider role={user.role}><SiteHeader canReview={user.role !== "viewer"}><Suspense fallback={<OllamaStatusFallback />}><OllamaStatusBadge /></Suspense><UserMenu user={user} /></SiteHeader>{children}</AccessProvider>;
}

// Authentication may redirect at request time; do not validate a prefetched shell.
export const instant = false;
