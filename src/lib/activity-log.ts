import { prisma } from "@/lib/prisma";
import type { ActivityAction } from "@prisma/client";

interface LogActivityInput {
  userId?: string | null;
  action: ActivityAction;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

/**
 * Records an admin activity. Never throws — logging failures must not
 * break the calling mutation.
 */
export async function logActivity(input: LogActivityInput) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        details: input.details as never,
      },
    });
  } catch (error) {
    console.error("Failed to write activity log:", error);
  }
}
