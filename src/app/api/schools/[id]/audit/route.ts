import { authorizeSchoolRequest } from "@/lib/schools/api-access";
import { listAuditLogs } from "@/lib/schools/audit";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const access = await authorizeSchoolRequest(id, "school:update");
  if (access.error) return access.error;

  const logs = await listAuditLogs(id, 150);
  return Response.json({ logs });
}
