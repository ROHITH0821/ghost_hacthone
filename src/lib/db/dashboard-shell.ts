import { cache } from "react";
import { getComparisonNavVisible } from "@/lib/db/comparisons";
import {
  ensureFreeEntitlement,
  getPlanSummaryForUser,
  type PlanSummary,
} from "@/lib/db/entitlements";
import { isAgencyUser } from "@/lib/db/agency-workspace";
import {
  getUserById,
  resolveUserIdFromSession,
  upsertUserByEmail,
} from "@/lib/db/users";

export type DashboardShellData = {
  user: {
    id: string;
    email: string;
    createdAt: Date;
  };
  planSummary: PlanSummary;
  comparisonsNavVisible: boolean;
  isAgencyUser: boolean;
};

/**
 * One request-scoped loader for the dashboard chrome.
 * Dedupes user/entitlement work shared by layout + child pages.
 */
export const getDashboardShellData = cache(
  async (userId: string, email: string): Promise<DashboardShellData> => {
    const resolvedId = await resolveUserIdFromSession(userId, email);
    let user = await getUserById(resolvedId);
    if (!user) {
      user = await upsertUserByEmail(email);
    }

    await ensureFreeEntitlement(user.id);

    const [planSummary, comparisonsNavVisible, agency] = await Promise.all([
      getPlanSummaryForUser(user.id),
      getComparisonNavVisible(user.id),
      isAgencyUser(user.id),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      planSummary,
      comparisonsNavVisible,
      isAgencyUser: agency,
    };
  }
);
