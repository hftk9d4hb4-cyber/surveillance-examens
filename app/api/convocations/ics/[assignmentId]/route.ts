import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse("Affectation introuvable", { status: 404 });
}
