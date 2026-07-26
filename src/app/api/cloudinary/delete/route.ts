import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteCloudinaryImage } from "@/lib/cloudinary";

/**
 * This is a state-changing, cookie-authenticated endpoint with no CSRF
 * token (Route Handlers, unlike Server Actions, don't get Next.js's
 * built-in CSRF protection). SameSite=Lax cookies already block the
 * most common cross-site POST attack, but an explicit same-origin check
 * is cheap, unambiguous defense-in-depth rather than relying on cookie
 * policy alone.
 */
function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false; // same-origin requests always send Origin on POST
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return origin === req.nextUrl.origin || (!!siteUrl && origin === siteUrl);
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
