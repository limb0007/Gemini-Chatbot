import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  // TODO: integrate with your real airline system here.
  const cancelRequestId =
    "CXL-" + Math.random().toString(36).slice(2, 10).toUpperCase();

  return NextResponse.json({ cancelRequestId, received: body });
}
