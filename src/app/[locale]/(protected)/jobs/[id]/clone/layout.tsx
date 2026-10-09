import { Suspense } from "react";
import { requirePageRole } from "@/lib/auth/server";
export default function ReviewerLayout(props: { children: React.ReactNode; params: Promise<{ locale: string }> }) { return <Suspense><Gate {...props} /></Suspense>; }
async function Gate({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) { await requirePageRole((await params).locale, "hr_reviewer"); return children; }

// Authentication may redirect at request time; do not validate a prefetched shell.
export const instant = false;
