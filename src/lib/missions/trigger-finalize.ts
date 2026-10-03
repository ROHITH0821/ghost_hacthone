import { after } from "next/server";
import { dispatchMission } from "./dispatch";

export async function triggerMissionFinalize(missionId: string): Promise<void> {
  await dispatchMission(missionId, "finalize");
}
export function scheduleMissionFinalize(missionId: string): void {
  after(() => triggerMissionFinalize(missionId));
}
