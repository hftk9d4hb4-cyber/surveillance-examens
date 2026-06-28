import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ message: "Utiliser npm run db:seed en local." });
}
