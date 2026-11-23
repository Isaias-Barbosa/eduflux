import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";

export async function logAudit(input: {
  schoolId: string;
  actorUserId: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
}) {
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    schoolId: input.schoolId,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    summary: input.summary,
    metadata: input.metadata ?? null,
  });
}

export async function listAuditLogs(schoolId: string, limit = 100) {
  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.schoolId, schoolId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
