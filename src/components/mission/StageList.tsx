"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { MISSION_STAGES } from "@/lib/constants";
import type { MissionStage, MissionStageStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StageListProps {
  currentStage: MissionStage;
  stageProgress: number;
  allComplete?: boolean;
}

function getStageStatus(
  stageId: MissionStage,
  currentStage: MissionStage,
  allComplete?: boolean
): MissionStageStatus {
  if (allComplete) return "complete";

  const stageOrder = MISSION_STAGES.map((s) => s.id);
  const currentIndex = stageOrder.indexOf(currentStage);
  const stageIndex = stageOrder.indexOf(stageId);

  if (stageIndex < currentIndex) return "complete";
  if (stageIndex === currentIndex) return "active";
  return "pending";
}

export function StageList({ currentStage, stageProgress, allComplete }: StageListProps) {
  return (
    <div className="space-y-2">
      {MISSION_STAGES.map((stage) => {
        const status = getStageStatus(stage.id, currentStage, allComplete);
        const isActive = status === "active";
        const isComplete = status === "complete";

        return (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className={cn("flex items-center gap-3 rounded-xl border p-3", isActive ? "border-violet/40 bg-violet/5" : "border-border/60")}
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-500",
                isComplete && "bg-neon-green/10",
                isActive && "bg-violet/20",
                !isComplete && !isActive && "bg-navy-light"
              )}
            >
              {isComplete ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 20 }}
                >
                  <Check className="h-4 w-4 text-neon-green" />
                </motion.div>
              ) : isActive ? (
                <Loader2 className="h-4 w-4 animate-spin text-violet" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-ghost-white/20" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "text-sm font-medium truncate transition-colors duration-500",
                    isActive ? "text-ghost-white" : "text-muted"
                  )}
                >
                  {stage.label}
                </p>
                {isActive && (
                  <span className="shrink-0 text-xs text-violet font-mono">
                    {stageProgress}%
                  </span>
                )}
              </div>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-1"
                >
                  <p className="text-xs text-ghost-white/30 truncate">
                    {stage.description}
                  </p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-navy-light">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-violet via-ai-blue to-violet bg-[length:200%_auto]"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${stageProgress}%`,
                        backgroundPosition: ["0% center", "200% center"],
                      }}
                      transition={{ 
                        width: { duration: 0.3 },
                        backgroundPosition: { duration: 2.5, repeat: Infinity, ease: "linear" }
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
