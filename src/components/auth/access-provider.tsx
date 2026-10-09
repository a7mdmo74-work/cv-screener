"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Role } from "@/lib/auth/policy";
const RoleContext = createContext<Role>("viewer");
export function AccessProvider({ role, children }: { role: Role; children: ReactNode }) { return <RoleContext value={role}>{children}</RoleContext>; }
export function useCanReview() { return useContext(RoleContext) !== "viewer"; }
export function ReviewerOnly({ children }: { children: ReactNode }) { return useCanReview() ? children : null; }
