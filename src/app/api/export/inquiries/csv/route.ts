import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { auth } from "@/lib/auth";
import { getInquiriesForExport } from "@/actions/inquiry-admin";
import type { InquiryStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const result = await getInquiriesForExport({
    query: searchParams.get("query") ?? undefined,
    status: (searchParams.get("status") as InquiryStatus) ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const csv = Papa.unparse(result.rows ?? []);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inquiries-${Date.now()}.csv"`,
    },
  });
}
