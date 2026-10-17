import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logError } from "@/lib/observability/log";
import { NewsletterError, exportSubscriptions } from "@/modules/newsletter/service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.staff) {
      return NextResponse.json({ message: "That record is not available." }, { status: 404 });
    }
    const csv = await exportSubscriptions(session.user.id);
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="newsletter.csv"',
      },
    });
  } catch (error) {
    if (error instanceof NewsletterError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    logError(error instanceof Error ? error.message : "The export could not be prepared.");
    return NextResponse.json({ message: "The export could not be prepared." }, { status: 500 });
  }
}
