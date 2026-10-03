import { after } from "next/server";
import { dispatchMission } from "./dispatch";

/** The persisted mission already has pending state; redispatch must not reset a live worker. */
export async function triggerMissionRun(missionId: string): Promise<void> {
  await dispatchMission(missionId, "run");
}
export function scheduleMissionRun(missionId: string): void {
  after(() => triggerMissionRun(missionId));
}
