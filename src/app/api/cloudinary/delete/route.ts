import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteCloudinaryImage } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { publicId } = await req.json();
  if (!publicId || typeof publicId !== "string") {
    return NextResponse.json({ error: "publicId is required" }, { status: 400 });
  }

  const result = await deleteCloudinaryImage(publicId);
  if (!result.success) {
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
