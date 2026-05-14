import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPhotoIndex } from "@/lib/photo-index";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || session.error) {
    return NextResponse.json(
      { error: session?.error ?? "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const paths = await getPhotoIndex();
    if (paths.length === 0) {
      return NextResponse.json(
        { error: "no-photos-found" },
        { status: 503 }
      );
    }
    const pick = paths[Math.floor(Math.random() * paths.length)];
    const id = Buffer.from(pick, "utf8").toString("base64url");
    return NextResponse.json({ id });
  } catch (err) {
    console.error("Photo index error:", err);
    return NextResponse.json(
      { error: "photos-dir-unavailable" },
      { status: 503 }
    );
  }
}
