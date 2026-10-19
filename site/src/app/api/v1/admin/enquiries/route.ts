import { NextResponse } from "next/server";
import { crmErrorResponse, requireStaffUser } from "@/modules/crm/http";
import { listQueue } from "@/modules/crm/service";
import { parseQueueFilters } from "@/modules/crm/rules";

export async function GET(request: Request) {
  try {
    const userId = await requireStaffUser();
    const url = new URL(request.url);
    const queue = await listQueue(
      userId,
      parseQueueFilters({
        q: url.searchParams.get("q") ?? "",
        status: url.searchParams.get("status") ?? "",
        assignment: url.searchParams.get("assignment") ?? "",
        page: url.searchParams.get("page") ?? "",
      }),
    );
    return NextResponse.json({
      enquiries: queue.rows,
      total: queue.total,
      page: queue.page,
      pageSize: queue.pageSize,
    });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
