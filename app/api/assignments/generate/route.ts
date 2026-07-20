import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "Génération à connecter à la base PostgreSQL."
  });
}
