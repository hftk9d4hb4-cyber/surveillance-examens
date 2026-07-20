import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { smtpConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "ok", smtp: smtpConfigured() ? "configured" : "missing", version: "1.0.0" });
  } catch {
    return NextResponse.json({ status: "degraded", database: "error", smtp: smtpConfigured() ? "configured" : "missing", version: "1.0.0" }, { status: 503 });
  }
}
