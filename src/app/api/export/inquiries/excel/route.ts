import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "WhatsApp Commerce Platform";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Inquiries");

  sheet.columns = [
    { header: "Inquiry Number", key: "inquiryNumber", width: 22 },
    { header: "Status", key: "status", width: 14 },
    { header: "Date", key: "date", width: 20 },
    { header: "Customer Name", key: "customerName", width: 24 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "City", key: "city", width: 16 },
    { header: "Product", key: "product", width: 28 },
    { header: "SKU", key: "sku", width: 16 },
    { header: "Color", key: "color", width: 12 },
    { header: "Size", key: "size", width: 10 },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Unit Price", key: "unitPrice", width: 14 },
    { header: "Total Price", key: "totalPrice", width: 14 },
    { header: "Inquiry Total", key: "inquiryTotal", width: 16 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFEFEF" },
  };

  for (const row of result.rows ?? []) {
    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="inquiries-${Date.now()}.xlsx"`,
    },
  });
}
