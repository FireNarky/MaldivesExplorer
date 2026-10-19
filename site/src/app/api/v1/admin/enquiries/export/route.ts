import { NextResponse } from "next/server";
import { crmErrorResponse, requireStaffUser } from "@/modules/crm/http";
import { exportEnquiries } from "@/modules/crm/service";
import { parseQueueFilters } from "@/modules/crm/rules";

export async function GET(request: Request) {
  try {
    const userId = await requireStaffUser();
    const url = new URL(request.url);
    const file = await exportEnquiries(
      userId,
      parseQueueFilters({
        q: url.searchParams.get("q") ?? "",
        status: url.searchParams.get("status") ?? "",
        assignment: url.searchParams.get("assignment") ?? "",
      }),
    );
    return new NextResponse(file.csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="enquiries.csv"',
        "x-export-capped": file.capped ? "true" : "false",
      },
    });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
