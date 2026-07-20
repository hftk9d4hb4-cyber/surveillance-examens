import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function writeAudit(input: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId || null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId || null,
      details: input.details
    }
  });
}
