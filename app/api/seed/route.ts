import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, message: "Utilisez npm run db:seed côté serveur." },
    { status: 501 }
  );
}
