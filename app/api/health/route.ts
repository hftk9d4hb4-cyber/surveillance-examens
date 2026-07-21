import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", database: "ok", version: APP_VERSION },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "error", version: APP_VERSION },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
