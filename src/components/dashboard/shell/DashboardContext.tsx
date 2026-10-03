"use client";

import { createContext, useContext } from "react";
import type { PlanSummary } from "@/lib/db/entitlements";

export type DashboardUser = {
  id: string;
  email: string;
  createdAt: string | Date;
};

type DashboardContextValue = {
  user: DashboardUser;
  planSummary: PlanSummary;
  comparisonsNavVisible: boolean;
  isAgencyUser: boolean;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  user,
  planSummary,
  comparisonsNavVisible,
  isAgencyUser,
  children,
}: DashboardContextValue & { children: React.ReactNode }) {
  return (
    <DashboardContext.Provider
      value={{ user, planSummary, comparisonsNavVisible, isAgencyUser }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return ctx;
}
